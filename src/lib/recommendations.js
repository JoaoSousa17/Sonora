import { base44 } from "@/api/base44Client";

// Cache songs to avoid repeated fetches during a session.
let songsCache = null;

async function loadAllSongs() {
  if (songsCache) return songsCache;
  songsCache = await base44.entities.Song.list("-play_count", 500);
  return songsCache;
}

export function clearSongsCache() {
  songsCache = null;
}

// Audio-feature vector similarity (BPM / energy / valence), per the weighted
// distance formula: close BPMs matter as much as close energy, valence half
// as much. Returns 0 (no signal) when either side is missing the data, so
// callers can treat it as "no bonus" rather than a false low score.
function vectorSimilarity(a, b) {
  if (a?.bpm == null || b?.bpm == null || a?.energy == null || b?.energy == null) return 0;
  const deltaBpm = (a.bpm - b.bpm) / 200;
  const deltaEnergy = a.energy - b.energy;
  const deltaValence = (a.valence ?? 0.5) - (b.valence ?? 0.5);
  const distance = Math.sqrt(0.4 * deltaBpm ** 2 + 0.4 * deltaEnergy ** 2 + 0.2 * deltaValence ** 2);
  return 1 / (1 + distance); // closer to 1 = better transition/match
}

// Apple Music-style personal radio: score by artist > genre > album > popularity,
// with an audio-feature similarity bonus when BPM/energy data exists, plus
// light randomization to keep it fresh.
export async function getRecommendations({ seed_type, seed_id, exclude_ids = [], limit = 50 }) {
  const songs = await loadAllSongs();
  const exclude = new Set(exclude_ids.concat([seed_id]));

  let seedArtist = null;
  let seedGenre = null;
  let seedAlbum = null;
  let seedSong = null;

  if (seed_type === "song") {
    seedSong = songs.find((s) => s.id === seed_id);
    if (seedSong) {
      seedArtist = seedSong.artist_id;
      seedGenre = seedSong.genre;
      seedAlbum = seedSong.album_id;
    }
  } else if (seed_type === "artist") {
    seedArtist = seed_id;
    const artistSongs = songs.filter((s) => s.artist_id === seed_id);
    if (artistSongs.length) seedGenre = artistSongs[0].genre;
  } else if (seed_type === "genre") {
    seedGenre = seed_id;
  }

  const scored = songs
    .filter((s) => !exclude.has(s.id))
    .map((s) => {
      let score = 0;
      if (seedArtist && s.artist_id === seedArtist) score += 50;
      if (seedGenre && s.genre && s.genre.toLowerCase() === String(seedGenre).toLowerCase()) score += 25;
      if (seedAlbum && s.album_id === seedAlbum) score += 15;
      if (seedSong) score += 20 * vectorSimilarity(seedSong, s);
      score += Math.min(15, (s.play_count || 0) / 100);
      score += Math.random() * 5;
      return { song: s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.song);

  return scored;
}

// "Músicas sugeridas" for a playlist: instead of seeding from a single track,
// takes the playlist's centroid (average BPM/energy/valence across its songs,
// when available) plus its most frequent genres/artists, and scores the rest
// of the catalog against that combined profile. Falls back to genre/artist
// frequency alone when no song in the playlist has audio-feature data.
export async function getPlaylistSuggestions({ songs: playlistSongs = [], exclude_ids = [], limit = 6 }) {
  if (!playlistSongs.length) return [];
  const allSongs = await loadAllSongs();
  const exclude = new Set(exclude_ids.length ? exclude_ids : playlistSongs.map((s) => s.id));

  const withVector = playlistSongs.filter((s) => s.bpm != null && s.energy != null);
  const centroid = withVector.length
    ? {
        bpm: withVector.reduce((sum, s) => sum + s.bpm, 0) / withVector.length,
        energy: withVector.reduce((sum, s) => sum + s.energy, 0) / withVector.length,
        valence: withVector.reduce((sum, s) => sum + (s.valence ?? 0.5), 0) / withVector.length,
      }
    : null;

  const genreCounts = new Map();
  const artistCounts = new Map();
  for (const s of playlistSongs) {
    if (s.genre) genreCounts.set(s.genre.toLowerCase(), (genreCounts.get(s.genre.toLowerCase()) || 0) + 1);
    if (s.artist_id) artistCounts.set(s.artist_id, (artistCounts.get(s.artist_id) || 0) + 1);
  }
  const topGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
  const topArtists = [...artistCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a]) => a);

  const scored = allSongs
    .filter((s) => !exclude.has(s.id))
    .map((s) => {
      let score = 0;
      if (topArtists.includes(s.artist_id)) score += 35;
      if (s.genre && topGenres.includes(s.genre.toLowerCase())) score += 20;
      if (centroid) score += 40 * vectorSimilarity(centroid, s);
      score += Math.min(10, (s.play_count || 0) / 150);
      score += Math.random() * 4;
      return { song: s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.song);

  return scored;
}

// Fisher-Yates shuffle of an artist's catalog (Apple Music "shuffle artist").
export async function getArtistShuffleQueue(artist_id) {
  const songs = await loadAllSongs();
  const artistSongs = songs.filter((s) => s.artist_id === artist_id);
  const shuffled = [...artistSongs];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Anti-clustering shuffle: groups by artist, shuffles each group internally,
// then at every step greedily places a song from whichever artist has the
// most songs still left (excluding the artist just placed). This is the
// same greedy strategy used for "rearrange so no two adjacent items are
// equal" problems, and it's provably as good as possible — when one artist
// dominates the list, some adjacency becomes mathematically unavoidable
// (pigeonhole), and this reaches that unavoidable minimum instead of just
// reducing clustering "somewhat" the way a round-robin pass does. Pure
// Fisher-Yates on a mixed-artist queue often stacks two tracks from the same
// artist back to back, which reads as "fake random" — this fixes that.
export function smartShuffle(list) {
  if (list.length <= 2) return shuffleArray(list);

  const groups = new Map();
  for (const song of list) {
    const key = song.artist_id || song.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(song);
  }
  for (const group of groups.values()) {
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
  }

  const keys = [...groups.keys()];
  const result = [];
  let lastKey = null;
  for (let step = 0; step < list.length; step++) {
    let bestKey = null;
    let bestRemaining = -1;
    for (const key of keys) {
      const remaining = groups.get(key).length;
      if (remaining === 0 || key === lastKey) continue;
      if (remaining > bestRemaining) {
        bestRemaining = remaining;
        bestKey = key;
      }
    }
    if (bestKey === null) {
      // Every remaining song belongs to lastKey — adjacency is unavoidable
      // here (pigeonhole), so just take the only option left.
      bestKey = keys.find((key) => groups.get(key).length > 0);
    }
    result.push(groups.get(bestKey).shift());
    lastKey = bestKey;
  }
  return result;
}
