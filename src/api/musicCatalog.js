/**
 * Sonora - Catálogo Musical & Resolvedor de Streaming Completo
 * Suporte a Proxy de Áudio anti-403 para reprodução completa
 */

// Instâncias com proxy de áudio direto e CORS aberto
const INVIDIOUS_INSTANCES = [
  'https://invidious.drgns.space',
  'https://inv.nadeko.net',
  'https://yt.drgnz.club',
  'https://invidious.private.coffee',
  'https://invidious.flokinet.to'
];

function upgradeArtwork(url) {
  if (!url) return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800';
  return url.replace(/100x100bb\.jpg$/, '1000x1000bb.jpg');
}

/**
 * 1. Pesquisa Músicas (iTunes API)
 */
export async function searchSongs(query, limit = 30) {
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
      preview_url: track.previewUrl,
      audio_url: null,
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
      genre: album.primaryGenreName,
    }));
  } catch (error) {
    console.error('Erro na pesquisa de álbuns:', error);
    return [];
  }
}

/**
 * 3. Faixas do Álbum
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
        preview_url: track.previewUrl,
        audio_url: null,
      }));

    return {
      id: String(albumId),
      title: albumInfo ? albumInfo.collectionName : 'Álbum',
      artist_name: albumInfo ? albumInfo.artistName : 'Artista',
      cover_url: upgradeArtwork(albumInfo ? albumInfo.artworkUrl100 : ''),
      release_date: albumInfo ? albumInfo.releaseDate : '',
      track_count: tracks.length,
      tracks,
    };
  } catch (error) {
    console.error('Erro ao carregar faixas do álbum:', error);
    return null;
  }
}

/**
 * 4. Resolvedor de Áudio Completo com Proxy Anti-403
 */
const streamUrlCache = new Map();

export async function resolveAudioStreamUrl(trackTitle, artistName) {
  const cacheKey = `${artistName} - ${trackTitle}`.toLowerCase().trim();

  // Cache em memória
  if (streamUrlCache.has(cacheKey)) {
    const cached = streamUrlCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 3 * 60 * 60 * 1000) {
      return cached.url;
    }
  }

  const cleanTitle = trackTitle.replace(/\(.*?\)|\[.*?\]/g, '').trim();
  const query = `${cleanTitle} ${artistName} Audio`;

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      // 1. Pesquisa no Invidious
      const searchRes = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
        signal: AbortSignal.timeout(3000),
      });

      if (!searchRes.ok) continue;

      const searchData = await searchRes.json();
      if (!Array.isArray(searchData) || searchData.length === 0) continue;

      const videoId = searchData[0].videoId;
      if (!videoId) continue;

      // 2. Usar o endpoint de proxy direto do Invidious (itag 140 = M4A AAC 128kbps alta qualidade)
      // Este endpoint faz stream direto do servidor sem dar erro 403 do Google no browser
      const proxiedAudioUrl = `${instance}/latest_version?id=${videoId}&itag=140`;

      // 3. Testa rapidamente se o stream responde
      const checkRes = await fetch(proxiedAudioUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(2500),
      });

      if (checkRes.ok || checkRes.status === 200 || checkRes.status === 206) {
        streamUrlCache.set(cacheKey, { url: proxiedAudioUrl, timestamp: Date.now() });
        return proxiedAudioUrl;
      }
    } catch (err) {
      // Tenta a próxima instância
      continue;
    }
  }

  return null;
}

/**
 * 5. Letras Sincronizadas
 */
export async function fetchLyrics(trackTitle, artistName, durationSeconds) {
  try {
    const cleanTitle = trackTitle.replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(cleanTitle)}&duration=${durationSeconds || ''}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;

    const data = await response.json();
    return {
      syncedLyrics: data.syncedLyrics || null,
      plainLyrics: data.plainLyrics || null,
    };
  } catch (error) {
    return null;
  }
}
