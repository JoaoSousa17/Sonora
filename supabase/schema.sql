-- ============================================================================
-- Sonora — Supabase database schema
-- ============================================================================
-- Run this once in the Supabase SQL editor (or via `supabase db push` /
-- `psql` against your project) on a fresh project. It is idempotent-ish
-- (uses IF NOT EXISTS / CREATE OR REPLACE) so it can be re-run safely, but it
-- is NOT a migration tool — for schema changes after go-live, write proper
-- migrations instead of re-running this file blindly.
--
-- What this sets up:
--   1. Extensions
--   2. Catalog tables (songs, albums, artists, podcasts, podcast_episodes)
--   3. Personal tables (favorites, listening_history)
--   4. Social tables (friendships, friend_activity, profiles)
--   5. Playlists
--   6. user_settings (the custom fields Base44 used to hang off `User`)
--   7. Row-Level Security policies for every table
--   8. Auto-managed columns (created_date/updated_date triggers)
--   9. Realtime publication (playlists, friend_activity, friendships)
--  10. Storage bucket + policies for uploaded images (avatars, covers)
--  11. auth.users -> user_settings provisioning trigger
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Helper: shared "updated_date" trigger function
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date := now();
  return new;
end;
$$;

-- ============================================================================
-- 2. Catalog tables — public read (authenticated), writes locked to
--    service_role except where the app itself lets users contribute
--    (podcasts/episodes, via the "Explorar podcasts" iTunes-search flow).
-- ============================================================================

create table if not exists public.artists (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  bio                text,
  image_url          text,
  header_image_url   text,
  genres             text[] default '{}',
  monthly_listeners  integer not null default 0,
  created_by_id      uuid references auth.users(id) on delete set null default auth.uid(),
  created_by         text default auth.email(),
  created_date       timestamptz not null default now(),
  updated_date       timestamptz not null default now()
);

create table if not exists public.albums (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  artist_id      uuid not null references public.artists(id) on delete restrict,
  artist_name    text,
  cover_url      text,
  release_year   integer,
  genre          text,
  track_count    integer not null default 0,
  created_by_id  uuid references auth.users(id) on delete set null default auth.uid(),
  created_by     text default auth.email(),
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now()
);
create index if not exists albums_artist_id_idx on public.albums(artist_id);

create table if not exists public.songs (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  artist_id          uuid not null references public.artists(id) on delete restrict,
  artist_name        text,
  album_id           uuid references public.albums(id) on delete set null,
  album_title        text,
  cover_url          text,
  duration_seconds   integer not null default 0,
  audio_url          text,
  genre              text,
  play_count         integer not null default 0,
  track_number       integer not null default 1,
  release_year       integer,
  created_by_id      uuid references auth.users(id) on delete set null default auth.uid(),
  created_by         text default auth.email(),
  created_date       timestamptz not null default now(),
  updated_date       timestamptz not null default now()
);
create index if not exists songs_artist_id_idx on public.songs(artist_id);
create index if not exists songs_album_id_idx on public.songs(album_id);
create index if not exists songs_play_count_idx on public.songs(play_count desc);
create index if not exists songs_genre_idx on public.songs(genre);

create table if not exists public.podcasts (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  author         text not null,
  cover_url      text,
  description    text,
  category       text,
  created_by_id  uuid references auth.users(id) on delete set null default auth.uid(),
  created_by     text default auth.email(),
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now()
);

create table if not exists public.podcast_episodes (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  podcast_id         uuid not null references public.podcasts(id) on delete cascade,
  podcast_title      text,
  duration_seconds   integer not null default 0,
  audio_url          text,
  description        text,
  publish_date       date,
  cover_url          text,
  created_by_id      uuid references auth.users(id) on delete set null default auth.uid(),
  created_by         text default auth.email(),
  created_date       timestamptz not null default now(),
  updated_date       timestamptz not null default now()
);
create index if not exists podcast_episodes_podcast_id_idx on public.podcast_episodes(podcast_id);

-- ============================================================================
-- 3. Personal tables — owner-only read/write
-- ============================================================================

create table if not exists public.favorites (
  id             uuid primary key default gen_random_uuid(),
  song_id        uuid references public.songs(id) on delete set null,
  song_title     text,
  artist_name    text,
  cover_url      text,
  added_at       timestamptz default now(),
  created_by_id  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_by     text default auth.email(),
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now()
);
create index if not exists favorites_created_by_id_idx on public.favorites(created_by_id);
create index if not exists favorites_song_id_idx on public.favorites(song_id);

create table if not exists public.listening_history (
  id             uuid primary key default gen_random_uuid(),
  song_id        uuid references public.songs(id) on delete set null,
  song_title     text,
  artist_name    text,
  cover_url      text,
  played_at      timestamptz default now(),
  play_duration  integer not null default 0,
  created_by_id  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_by     text default auth.email(),
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now()
);
create index if not exists listening_history_created_by_id_idx on public.listening_history(created_by_id);
create index if not exists listening_history_played_at_idx on public.listening_history(played_at desc);

-- ============================================================================
-- 4. Social tables
-- ============================================================================

create table if not exists public.friendships (
  id              uuid primary key default gen_random_uuid(),
  addressee_email text not null,
  addressee_id    uuid references auth.users(id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_by_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_by      text default auth.email(),
  created_date    timestamptz not null default now(),
  updated_date    timestamptz not null default now()
);
create index if not exists friendships_created_by_id_idx on public.friendships(created_by_id);
create index if not exists friendships_addressee_email_idx on public.friendships(addressee_email);
create index if not exists friendships_addressee_id_idx on public.friendships(addressee_id);

create table if not exists public.friend_activity (
  id             uuid primary key default gen_random_uuid(),
  song_id        uuid references public.songs(id) on delete set null,
  song_title     text not null,
  artist_name    text,
  cover_url      text,
  is_playing     boolean not null default true,
  created_by_id  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_by     text default auth.email(),
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now()
);
create index if not exists friend_activity_created_by_id_idx on public.friend_activity(created_by_id, created_date desc);

create table if not exists public.profiles (
  id             uuid primary key default gen_random_uuid(),
  display_name   text not null,
  photo_url      text,
  cover_photo_url text,
  bio            text,
  created_by_id  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_by     text default auth.email(),
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now()
);
create unique index if not exists profiles_created_by_id_unique on public.profiles(created_by_id);

-- ============================================================================
-- 5. Playlists
-- ============================================================================

create table if not exists public.playlists (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  cover_url      text,
  song_ids       uuid[] not null default '{}',
  is_liked       boolean not null default false,
  is_public      boolean not null default true,
  track_count    integer not null default 0,
  created_by_id  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_by     text default auth.email(),
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now()
);
create index if not exists playlists_created_by_id_idx on public.playlists(created_by_id);
create index if not exists playlists_is_public_idx on public.playlists(is_public);

-- ============================================================================
-- 6. user_settings — custom fields Base44 hung off the built-in `User`
--    (role, bio, cover_photo_url, display_name, photo_url, share_activity,
--    access_verified). One row per auth.users row, provisioned automatically
--    by the trigger at the bottom of this file.
-- ============================================================================

create table if not exists public.user_settings (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text,
  role               text not null default 'user' check (role in ('admin', 'user')),
  bio                text default '',
  cover_photo_url    text default '',
  display_name       text default '',
  photo_url          text default '',
  share_activity     boolean not null default true,
  access_verified    boolean not null default false,
  created_date       timestamptz not null default now(),
  updated_date       timestamptz not null default now()
);

-- ============================================================================
-- 7. updated_date triggers
-- ============================================================================

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'artists','albums','songs','podcasts','podcast_episodes',
    'favorites','listening_history','friendships','friend_activity',
    'profiles','playlists','user_settings'
  ])
  loop
    execute format(
      'drop trigger if exists set_updated_date on public.%I; ' ||
      'create trigger set_updated_date before update on public.%I ' ||
      'for each row execute function public.set_updated_date();',
      t, t
    );
  end loop;
end $$;

-- ============================================================================
-- 8. Row-Level Security
-- ============================================================================

alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.songs enable row level security;
alter table public.podcasts enable row level security;
alter table public.podcast_episodes enable row level security;
alter table public.favorites enable row level security;
alter table public.listening_history enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_activity enable row level security;
alter table public.profiles enable row level security;
alter table public.playlists enable row level security;
alter table public.user_settings enable row level security;

-- --- Catalog: open read to any authenticated user; writes reserved to
--     service_role (used by seed/import scripts), since no UI ever lets a
--     regular user write these directly. This is a deliberate tightening
--     versus Base44's literal "no rule = fully open" default — it does not
--     change any real app behavior.
create policy "artists_select_authenticated" on public.artists for select to authenticated using (true);
create policy "albums_select_authenticated" on public.albums for select to authenticated using (true);
create policy "songs_select_authenticated" on public.songs for select to authenticated using (true);

-- --- Podcasts/episodes: the "Explorar podcasts" flow lets any signed-in user
--     subscribe to a podcast found via iTunes search, which inserts rows
--     directly from the client. Keep insert/update open to authenticated;
--     restrict delete to the creator so one user can't wipe another's
--     subscribed catalog entries out from under them.
create policy "podcasts_select_authenticated" on public.podcasts for select to authenticated using (true);
create policy "podcasts_insert_authenticated" on public.podcasts for insert to authenticated with check (true);
create policy "podcasts_update_authenticated" on public.podcasts for update to authenticated using (true);
create policy "podcasts_delete_owner" on public.podcasts for delete to authenticated using (created_by_id = auth.uid());

create policy "podcast_episodes_select_authenticated" on public.podcast_episodes for select to authenticated using (true);
create policy "podcast_episodes_insert_authenticated" on public.podcast_episodes for insert to authenticated with check (true);
create policy "podcast_episodes_update_authenticated" on public.podcast_episodes for update to authenticated using (true);
create policy "podcast_episodes_delete_owner" on public.podcast_episodes for delete to authenticated using (created_by_id = auth.uid());

-- --- Favorites / Listening history: owner-only in every direction.
create policy "favorites_select_own" on public.favorites for select to authenticated using (created_by_id = auth.uid());
create policy "favorites_insert_own" on public.favorites for insert to authenticated with check (created_by_id = auth.uid());
create policy "favorites_update_own" on public.favorites for update to authenticated using (created_by_id = auth.uid());
create policy "favorites_delete_own" on public.favorites for delete to authenticated using (created_by_id = auth.uid());

create policy "listening_history_select_own" on public.listening_history for select to authenticated using (created_by_id = auth.uid());
create policy "listening_history_insert_own" on public.listening_history for insert to authenticated with check (created_by_id = auth.uid());
create policy "listening_history_update_own" on public.listening_history for update to authenticated using (created_by_id = auth.uid());
create policy "listening_history_delete_own" on public.listening_history for delete to authenticated using (created_by_id = auth.uid());

-- --- Friendships: either side of the friendship (creator, or addressee by
--     email/id) can read, update (accept/decline) and delete.
create policy "friendships_select_party" on public.friendships for select to authenticated using (
  created_by_id = auth.uid()
  or addressee_email = auth.email()
  or addressee_id = auth.uid()
);
create policy "friendships_insert_own" on public.friendships for insert to authenticated with check (created_by_id = auth.uid());
create policy "friendships_update_party" on public.friendships for update to authenticated using (
  created_by_id = auth.uid()
  or addressee_email = auth.email()
  or addressee_id = auth.uid()
);
create policy "friendships_delete_party" on public.friendships for delete to authenticated using (
  created_by_id = auth.uid()
  or addressee_email = auth.email()
  or addressee_id = auth.uid()
);

-- --- Friend activity: read open to any signed-in user (so friends can see
--     "now playing"); writes owner-only.
create policy "friend_activity_select_authenticated" on public.friend_activity for select to authenticated using (true);
create policy "friend_activity_insert_own" on public.friend_activity for insert to authenticated with check (created_by_id = auth.uid());
create policy "friend_activity_update_own" on public.friend_activity for update to authenticated using (created_by_id = auth.uid());
create policy "friend_activity_delete_own" on public.friend_activity for delete to authenticated using (created_by_id = auth.uid());

-- --- Public profiles: read open to any signed-in user; writes owner-only.
create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (created_by_id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (created_by_id = auth.uid());
create policy "profiles_delete_own" on public.profiles for delete to authenticated using (created_by_id = auth.uid());

-- --- Playlists: public playlists readable by everyone signed in; private
--     ones owner-only. Writes always owner-only.
create policy "playlists_select_public_or_own" on public.playlists for select to authenticated using (
  is_public = true or created_by_id = auth.uid()
);
create policy "playlists_insert_own" on public.playlists for insert to authenticated with check (created_by_id = auth.uid());
create policy "playlists_update_own" on public.playlists for update to authenticated using (created_by_id = auth.uid());
create policy "playlists_delete_own" on public.playlists for delete to authenticated using (created_by_id = auth.uid());

-- --- user_settings: strictly owner-only (this is the private account-settings
--     row; the public-facing equivalent is `profiles` above).
create policy "user_settings_select_own" on public.user_settings for select to authenticated using (id = auth.uid());
create policy "user_settings_update_own" on public.user_settings for update to authenticated using (id = auth.uid());
-- No insert/delete policy for regular users: rows are provisioned exclusively
-- by the handle_new_user trigger (which runs as the trigger owner / bypasses
-- RLS) and removed automatically via the auth.users cascade on account deletion.

-- ============================================================================
-- 9. Realtime — mirrors Base44's `.subscribe()` usage (Layout.jsx sidebar,
--    Amigos.jsx friend list/activity).
-- ============================================================================

alter publication supabase_realtime add table public.playlists;
alter publication supabase_realtime add table public.friend_activity;
alter publication supabase_realtime add table public.friendships;

-- ============================================================================
-- 10. Storage — one public bucket for user-uploaded images (playlist covers,
--     avatar photo, profile cover). Files are stored under
--     `<user_id>/<filename>`; anyone can read (bucket is public), only the
--     owner can write/delete inside their own folder.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('sonora-uploads', 'sonora-uploads', true)
on conflict (id) do nothing;

create policy "sonora_uploads_public_read"
  on storage.objects for select
  using (bucket_id = 'sonora-uploads');

create policy "sonora_uploads_own_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sonora-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "sonora_uploads_own_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'sonora-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "sonora_uploads_own_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'sonora-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 11. Auto-provision a user_settings row for every new auth user.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Done. Next steps (see .env.example and README/setup notes):
--   * Configure Google/GitHub/Facebook OAuth providers in
--     Authentication → Providers (Supabase Dashboard).
--   * Edit the "Confirm signup" email template to include {{ .Token }} so the
--     6-digit code flow in Register.jsx works (Authentication → Email
--     Templates).
--   * Deploy the two Edge Functions in supabase/functions/ and set their
--     secrets (RESEND_API_KEY, ANTHROPIC_API_KEY).
--   * Seed the catalog (songs/albums/artists/podcasts) using the
--     service_role key from a trusted environment — never ship it client-side.
-- ============================================================================
