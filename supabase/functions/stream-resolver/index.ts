import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q");

    if (!query) {
      return new Response(JSON.stringify({ error: "Parâmetro 'q' em falta." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Pesquisa do vídeo no YouTube via endpoint interno rápido
    const searchUrl = `https://music.youtube.com/youtubei/v1/search?alt=json&key=`; 
    // Fallback usando endpoint de search público via instâncias agregadas
    const ytSearchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " audio")}`
    )}`;

    // Consulta de metadados
    const htmlRes = await fetch(ytSearchUrl);
    const htmlText = await htmlRes.text();

    // Extrai o primeiro videoId válido do HTML do YouTube
    const match = htmlText.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    const videoId = match ? match[1] : null;

    if (!videoId) {
      // Fallback via Piped Backend Server-Side
      const pipedRes = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=music_songs`);
      const pipedData = await pipedRes.json();
      const first = pipedData.items?.[0];
      
      if (!first || !first.url) {
        throw new Error("Vídeo não encontrado");
      }
      
      const vId = first.url.replace('/watch?v=', '');
      const streamsRes = await fetch(`https://pipedapi.kavin.rocks/streams/${vId}`);
      const streamsData = await streamsRes.json();
      const audioStreams = streamsData.audioStreams || [];
      const best = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

      return new Response(JSON.stringify({ streamUrl: best.url, videoId: vId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Com o videoId, obtém os dados do stream
    const pipedRes = await fetch(`https://api.piped.privacydev.net/streams/${videoId}`);
    const streamData = await pipedRes.json();
    const audioStreams = streamData.audioStreams || [];
    const bestAudio = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    if (!bestAudio || !bestAudio.url) {
      throw new Error("Stream de áudio não disponível");
    }

    return new Response(JSON.stringify({ streamUrl: bestAudio.url, videoId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});