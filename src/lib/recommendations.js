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

// Apple Music-style personal radio: score by artist > genre > album > popularity,
// with light randomization to keep it fresh.
export async function getRecommendations({ seed_type, seed_id, exclude_ids = [], limit = 50 }) {
  const songs = await loadAllSongs();
  const exclude = new Set(exclude_ids.concat([seed_id]));

  let seedArtist = null;
  let seedGenre = null;
  let seedAlbum = null;

  if (seed_type === "song") {
    const seedSong = songs.find((s) => s.id === seed_id);
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