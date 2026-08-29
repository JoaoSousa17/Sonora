// Supabase Edge Function: invoke-llm
// ----------------------------------------------------------------------------
// Backs the "lyrics" panel in the player. Deliberately does NOT ask the model
// for verbatim song lyrics and reproduce them — that's copyrighted material
// we have no license to redistribute, at any scale, regardless of how the
// original prompt was worded. Instead it returns a short, original
// description of the song's theme/mood/story, clearly written as commentary
// rather than a copy of the lyrics.
//
// Runs on Supabase's infrastructure (Deno), never on Vercel.
//
// Deploy:   supabase functions deploy invoke-llm
// Secrets:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const MODEL = 'claude-sonnet-5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { songTitle, artistName } = await req.json();
    if (!songTitle) {
      return new Response(JSON.stringify({ error: 'songTitle is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt =
      `Escreve, em português, um pequeno texto original (6 a 10 linhas curtas, ` +
      `como se fossem versos de resumo) sobre o tema, o ambiente e o significado ` +
      `provável da música "${songTitle}"${artistName ? ` de ${artistName}` : ''}. ` +
      `Este texto é uma interpretação/resumo temático, não a letra da música: ` +
      `NUNCA reproduzas a letra original, mesmo parcialmente ou parafraseada ` +
      `verso a verso. Se não conheceres a música, escreve uma nota curta a dizer ` +
      `isso. Responde apenas com o texto, sem introduções nem comentários.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return new Response(JSON.stringify({ error: 'LLM request failed', detail }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await res.json();
    const text = result?.content?.[0]?.text || 'Não foi possível gerar uma descrição para esta música.';

    return new Response(JSON.stringify({ response: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
