-- ============================================================================
-- Sonora — audio feature columns (BPM / energy / valence / key)
-- ============================================================================
-- Optional follow-up to supabase/schema.sql. Adds the vector attributes the
-- DJ-mode/recommendation/smart-shuffle algorithms in src/lib/recommendations.js
-- can use for track-to-track similarity scoring. All nullable — the app
-- already falls back to its existing artist/genre/popularity scoring when a
-- song has no audio-feature data, so this is safe to run at any time and
-- doesn't require populating the catalog first.
--
-- Run once in the Supabase SQL editor.
-- ============================================================================

alter table public.songs
  add column if not exists bpm integer,               -- tempo, beats per minute
  add column if not exists energy numeric(4,3),        -- 0.000–1.000
  add column if not exists valence numeric(4,3),       -- 0.000–1.000 (musical positivity)
  add column if not exists key_signature text;         -- e.g. "C#m", "A", "Gm" — free text, no fixed scale

comment on column public.songs.bpm is 'Tempo in beats per minute. Null when unknown.';
comment on column public.songs.energy is 'Perceived intensity/energy, 0 (calm) to 1 (intense). Null when unknown.';
comment on column public.songs.valence is 'Musical positivity/mood, 0 (sad/dark) to 1 (happy/bright). Null when unknown.';
comment on column public.songs.key_signature is 'Musical key, free-text (e.g. "C#m"). Null when unknown.';
