// Supabase Edge Function: fetch-podcast-feed
// ----------------------------------------------------------------------------
// Fetches and parses a podcast's own public RSS feed (the standard mechanism
// every podcast is already distributed through — Apple Podcasts, Spotify,
// etc. all just read this same feed) and returns a clean list of episodes
// (title, direct .mp3 enclosure URL, description, publish date, duration,
// cover). Runs server-side because most podcast hosts don't send CORS
// headers, so the browser can't fetch the feed directly.
//
// Deploy: supabase functions deploy fetch-podcast-feed
// No secrets required.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { XMLParser } from 'npm:fast-xml-parser@4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const MAX_EPISODES = 300;
const FETCH_TIMEOUT_MS = 15000;
const MAX_BYTES = 15 * 1024 * 1024; // 15MB safety cap on the feed itself

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Basic SSRF guard: only allow http(s) URLs to a public hostname — reject
// loopback/private/link-local addresses and obviously internal names. This
// isn't exhaustive DNS-rebinding protection, just a sane first filter before
// the request ever leaves the function.
function isSafeFeedUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return false;
  }
  return true;
}

function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
}

// Accepts "HH:MM:SS", "MM:SS", or a bare integer (seconds) — the three
// formats <itunes:duration> shows up in across real-world feeds.
function parseDurationSeconds(value) {
  if (value == null) return 0;
  const str = String(value).trim();
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  const parts = str.split(':').map((p) => parseInt(p, 10)).filter((n) => !isNaN(n));
  if (!parts.length) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function parsePublishDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // DATE column, no time component
}

function firstOf(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'Not authenticated' }, 401);
    }

    const { feedUrl } = await req.json();
    if (!feedUrl || typeof feedUrl !== 'string' || !isSafeFeedUrl(feedUrl)) {
      return jsonResponse({ error: 'Invalid or disallowed feedUrl' }, 400);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(feedUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Sonora/1.0 (+podcast-feed-reader)' },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      return jsonResponse({ error: `Feed request failed with status ${res.status}` }, 502);
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return jsonResponse({ error: 'Feed is too large' }, 502);
    }
    const xml = new TextDecoder('utf-8').decode(buf);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      removeNSPrefix: false,
    });
    const doc = parser.parse(xml);

    const channel = doc?.rss?.channel;
    if (!channel) {
      return jsonResponse({ error: 'Feed does not look like a valid RSS/podcast feed' }, 422);
    }

    const rawItems = channel.item ? (Array.isArray(channel.item) ? channel.item : [channel.item]) : [];
    const channelCover = firstOf(
      channel['itunes:image']?.['@_href'],
      channel.image?.url,
      ''
    );

    const episodes = rawItems
      .map((item) => {
        const enclosureUrl = firstOf(
          item.enclosure?.['@_url'],
          typeof item.enclosure === 'string' ? item.enclosure : ''
        );
        if (!enclosureUrl) return null; // no playable audio, skip
        const title = firstOf(item.title?.['#text'], item.title, 'Episódio sem título');
        return {
          title: String(title).slice(0, 500),
          audio_url: enclosureUrl,
          description: stripHtml(
            firstOf(item['itunes:summary'], item.description?.['#text'], item.description)
          ),
          publish_date: parsePublishDate(item.pubDate),
          duration_seconds: parseDurationSeconds(item['itunes:duration']),
          cover_url: firstOf(item['itunes:image']?.['@_href'], channelCover),
          _sortKey: item.pubDate ? new Date(item.pubDate).getTime() || 0 : 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b._sortKey - a._sortKey)
      .slice(0, MAX_EPISODES)
      .map(({ _sortKey, ...rest }) => rest);

    return jsonResponse({ episodes });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Unexpected error' }, 500);
  }
});
