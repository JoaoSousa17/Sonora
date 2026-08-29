/**
 * Sonora - Catálogo Musical & Resolvedor de Streaming
 * Combina iTunes API (Metadados em HD) + Piped/Invidious (Áudio sem custos) + LRCLIB (Letras)
 */

// Instâncias públicas de fallback para resolver áudio do YouTube sem CORS
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://watchapi.whatever.social',
  'https://pipedapi.tokhmi.xyz'
];

/**
 * Normaliza o tamanho das capas do iTunes para resolução Ultra HD (1000x1000)
 */
function upgradeArtwork(url) {
  if (!url) return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800';
  return url.replace(/100x100bb\.jpg$/, '1000x1000bb.jpg');
}

/**
 * 1. Pesquisa músicas gerais
 */
export async function searchSongs(query, limit = 25) {
  if (!query || !query.trim()) return [];

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}&country=PT`;
    const response = await fetch(url);
    const data = await response.json();

    return (data.results || []).map((track) => ({
      id: String(track.trackId),
      title: track.trackName,
      artist_name: track.artistName,
      artist_id: String(track.artistId),
      album_title: track.collectionName,
      album_id: String(track.collectionId),
      cover_url: upgradeArtwork(track.artworkUrl100),
      duration_seconds: Math.round(track.trackTimeMillis / 1000),
      release_date: track.releaseDate,
      genre: track.primaryGenreName,
      preview_url: track.previewUrl, // Fallback instantâneo de 30s da Apple
      audio_url: null, // Resolvido on-demand ao clicar em play
      isrc: track.isrc || null
    }));
  } catch (error) {
    console.error('Erro na pesquisa de faixas:', error);
    return [];
  }
}

/**
 * 2. Pesquisa Álbuns
 */
export async function searchAlbums(query, limit = 20) {
  if (!query || !query.trim()) return [];

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=${limit}&country=PT`;
    const response = await fetch(url);
    const data = await response.json();

    return (data.results || []).map((album) => ({
      id: String(album.collectionId),
      title: album.collectionName,
      artist_name: album.artistName,
      artist_id: String(album.artistId),
      cover_url: upgradeArtwork(album.artworkUrl100),
      track_count: album.trackCount,
      release_date: album.releaseDate,
      genre: album.primaryGenreName
    }));
  } catch (error) {
    console.error('Erro na pesquisa de álbuns:', error);
    return [];
  }
}

/**
 * 3. Obter Detalhes do Álbum com todas as Faixas
 */
export async function getAlbumTracks(albumId) {
  try {
    const url = `https://itunes.apple.com/lookup?id=${albumId}&entity=song&country=PT`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) return null;

    const albumInfo = data.results.find((item) => item.wrapperType === 'collection');
    const tracks = data.results
      .filter((item) => item.wrapperType === 'track')
      .map((track) => ({
        id: String(track.trackId),
        track_number: track.trackNumber,
        title: track.trackName,
        artist_name: track.artistName,
        artist_id: String(track.artistId),
        album_title: albumInfo ? albumInfo.collectionName : track.collectionName,
        album_id: String(albumId),
        cover_url: upgradeArtwork(track.artworkUrl100 || (albumInfo && albumInfo.artworkUrl100)),
        duration_seconds: Math.round(track.trackTimeMillis / 1000),
        preview_url: track.previewUrl
      }));

    return {
      id: String(albumId),
      title: albumInfo ? albumInfo.collectionName : 'Álbum',
      artist_name: albumInfo ? albumInfo.artistName : 'Artista',
      cover_url: upgradeArtwork(albumInfo ? albumInfo.artworkUrl100 : ''),
      release_date: albumInfo ? albumInfo.releaseDate : '',
      track_count: tracks.length,
      tracks
    };
  } catch (error) {
    console.error('Erro ao carregar faixas do álbum:', error);
    return null;
  }
}

/**
 * 4. Resolvedor de Áudio Completo (Scraping em Tempo Real com Cache em Memória)
 */
const streamUrlCache = new Map();

export async function resolveAudioStreamUrl(trackTitle, artistName) {
  const cacheKey = `${artistName} - ${trackTitle}`.toLowerCase();
  
  if (streamUrlCache.has(cacheKey)) {
    const cached = streamUrlCache.get(cacheKey);
    // Válido por 3 horas
    if (Date.now() - cached.timestamp < 3 * 60 * 60 * 1000) {
      return cached.url;
    }
  }

  const searchQuery = `${artistName} ${trackTitle} Audio`;

  for (const instance of PIPED_INSTANCES) {
    try {
      const searchRes = await fetch(`${instance}/search?q=${encodeURIComponent(searchQuery)}&filter=music_songs`, {
        signal: AbortSignal.timeout(2500)
      });
      if (!searchRes.ok) continue;

      const searchData = await searchRes.json();
      const firstItem = searchData.items && searchData.items[0];

      if (!firstItem || !firstItem.url) continue;

      const videoId = firstItem.url.replace('/watch?v=', '');
      const streamsRes = await fetch(`${instance}/streams/${videoId}`, {
        signal: AbortSignal.timeout(2500)
      });
      if (!streamsRes.ok) continue;

      const streamsData = await streamsRes.json();
      // Escolher o melhor fluxo de áudio puro (m4a ou opus)
      const audioStreams = streamsData.audioStreams || [];
      const bestAudio = audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

      if (bestAudio && bestAudio.url) {
        streamUrlCache.set(cacheKey, { url: bestAudio.url, timestamp: Date.now() });
        return bestAudio.url;
      }
    } catch (e) {
      // Tenta a próxima instância da lista
      continue;
    }
  }

  return null;
}

/**
 * 5. Buscar Letras Sincronizadas em Tempo Real (LRCLIB)
 */
export async function fetchLyrics(trackTitle, artistName, durationSeconds) {
  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(trackTitle)}&duration=${durationSeconds || ''}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;

    const data = await response.json();
    return {
      syncedLyrics: data.syncedLyrics || null, // Formato [00:12.34] Letra
      plainLyrics: data.plainLyrics || null
    };
  } catch (error) {
    console.warn('Letras não encontradas no LRCLIB:', error);
    return null;
  }
}