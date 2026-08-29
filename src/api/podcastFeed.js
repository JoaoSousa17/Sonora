import { supabase } from './supabaseClient';

// Fetches and parses a podcast's RSS feed via the fetch-podcast-feed Edge
// Function (server-side, to avoid CORS) and returns { episodes }.
export async function fetchPodcastFeed(feedUrl) {
  const { data, error } = await supabase.functions.invoke('fetch-podcast-feed', {
    body: { feedUrl },
  });
  if (error) throw error;
  return data;
}
