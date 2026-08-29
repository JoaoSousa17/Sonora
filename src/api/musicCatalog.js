/**
 * Sonora - Catálogo Musical & Resolvedor de Áudio Completo
 * iTunes Search API + Resolvedores de Áudio com CORS Aberto
 */

const streamUrlCache = new Map();

function upgradeArtwork(url) {
  if (!url) return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800';
  return url.replace(/100x100bb\.jpg$/, '1000x1000bb.jpg');
}

/**
 * 1. Pesquisa de Músicas (iTunes API)
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
 * 2. Pesquisa de Álbuns
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
 * 3. Detalhes e Faixas de um Álbum
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
 * 4. Resolvedor de Áudio Completo com Failover Garantido
 */
export async function resolveAudioStreamUrl(trackTitle, artistName) {
  const cacheKey = `${artistName} - ${trackTitle}`.toLowerCase().trim();

  // Verificação de Cache em memória
  if (streamUrlCache.has(cacheKey)) {
    const cached = streamUrlCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 3 * 60 * 60 * 1000) {
      return cached.url;
    }
  }

  const cleanTitle = trackTitle.replace(/\(.*?\)|\[.*?\]/g, '').trim();
  const query = `${cleanTitle} ${artistName}`;

  // Estratégia 1: Saavn API Global com endpoint verificado e ativo
  try {
    const saavnUrl = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&page=1&limit=5`;
    const res = await fetch(saavnUrl, { signal: AbortSignal.timeout(3500) });

    if (res.ok) {
      const data = await res.json();
      const results = data?.data?.results || [];

      if (results.length > 0) {
        const top = results[0];
        const downloadUrls = top.downloadUrl || [];
        // Escolhe o stream de maior bitrate disponível (320kbps ou 160kbps)
        const bestStream = downloadUrls[downloadUrls.length - 1] || downloadUrls[0];
        const finalUrl = bestStream?.url || bestStream?.link;

        if (finalUrl) {
          streamUrlCache.set(cacheKey, { url: finalUrl, timestamp: Date.now() });
          return finalUrl;
        }
      }
    }
  } catch (err) {
    // Falha silenciosa para tentar a estratégia seguinte
  }

  // Estratégia 2: Audius Global Mesh API (Totalmente sem CORS)
  try {
    const audiusRes = await fetch(
      `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=SONORA`,
      { signal: AbortSignal.timeout(3500) }
    );

    if (audiusRes.ok) {
      const audiusData = await audiusRes.json();
      const first = audiusData?.data?.[0];

      if (first?.id) {
        const audiusStreamUrl = `https://discoveryprovider.audius.co/v1/tracks/${first.id}/stream?app_name=SONORA`;
        streamUrlCache.set(cacheKey, { url: audiusStreamUrl, timestamp: Date.now() });
        return audiusStreamUrl;
      }
    }
  } catch (e) {
    // Continua
  }

  return null;
}

/**
 * 5. Letras Sincronizadas (LRCLIB)
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
