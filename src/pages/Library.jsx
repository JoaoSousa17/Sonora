import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Heart, Disc3, Mic, ListMusic } from "lucide-react";
import MediaCard from "@/components/MediaCard";
import SongRow from "@/components/SongRow";
import { usePlayer } from "@/lib/PlayerContext";
import EmptyState from "@/components/EmptyState";
import SkeletonGrid from "@/components/SkeletonGrid";
import SkeletonFiller from "@/components/SkeletonFiller";
import LibraryPagination from "@/components/LibraryPagination";

const titles = {
  recentes: "Recentes",
  playlists: "Playlists",
  artistas: "Artistas",
  albuns: "Álbuns",
  favoritos: "Favoritos",
};

const emptyConfig = {
  recentes: { icon: ListMusic, title: "Ainda não criaste playlists", subtitle: "As tuas playlists vão aparecer aqui assim que as criares." },
  artistas: { icon: Mic, title: "Sem artistas recentes", subtitle: "Os artistas que ouvires no último ano vão aparecer aqui." },
  albuns: { icon: Disc3, title: "Sem álbuns recentes", subtitle: "Os álbuns que ouvires no último ano vão aparecer aqui." },
  favoritos: { icon: Heart, title: "Ainda não adicionaste músicas aos Favoritos", subtitle: "Toca uma música e carrega no coração para a guardar aqui." },
  playlists: { icon: ListMusic, title: "Sem playlists", subtitle: "Cria a tua primeira playlist a partir da barra lateral." },
};

const PAGE_SIZE = 24;

function oneYearAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d;
}

// Artists listened to in the last year, ordered by most recent listen.
async function loadRecentArtists() {
  const cutoff = oneYearAgo();
  const history = await base44.entities.ListeningHistory.list("-played_at", 500).catch(() => []);
  const recent = (history || []).filter((h) => h.played_at && new Date(h.played_at) >= cutoff);
  const songIds = [...new Set(recent.map((h) => h.song_id).filter(Boolean))];
  if (!songIds.length) return [];
  const songs = await base44.entities.Song.filter({ id: { $in: songIds } }).catch(() => []);
  const songMap = {};
  (songs || []).forEach((s) => { songMap[s.id] = s; });
  const ordered = [];
  const seen = new Set();
  recent.forEach((h) => {
    const s = songMap[h.song_id];
    if (s && s.artist_id && !seen.has(s.artist_id)) { seen.add(s.artist_id); ordered.push(s.artist_id); }
  });
  if (!ordered.length) return [];
  const artists = await base44.entities.Artist.filter({ id: { $in: ordered } }).catch(() => []);
  const map = {};
  (artists || []).forEach((a) => { map[a.id] = a; });
  return ordered.map((id) => map[id]).filter(Boolean);
}

// Albums listened to (via a song) in the last year, ordered by most recent listen.
async function loadRecentAlbums() {
  const cutoff = oneYearAgo();
  const history = await base44.entities.ListeningHistory.list("-played_at", 500).catch(() => []);
  const recent = (history || []).filter((h) => h.played_at && new Date(h.played_at) >= cutoff);
  const songIds = [...new Set(recent.map((h) => h.song_id).filter(Boolean))];
  if (!songIds.length) return [];
  const songs = await base44.entities.Song.filter({ id: { $in: songIds } }).catch(() => []);
  const songMap = {};
  (songs || []).forEach((s) => { songMap[s.id] = s; });
  const ordered = [];
  const seen = new Set();
  recent.forEach((h) => {
    const s = songMap[h.song_id];
    if (s && s.album_id && !seen.has(s.album_id)) { seen.add(s.album_id); ordered.push(s.album_id); }
  });
  if (!ordered.length) return [];
  const albums = await base44.entities.Album.filter({ id: { $in: ordered } }).catch(() => []);
  const map = {};
  (albums || []).forEach((a) => { map[a.id] = a; });
  return ordered.map((id) => map[id]).filter(Boolean);
}

export default function Library() {
  const { section = "recentes" } = useParams();
  const { playQueue } = usePlayer();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    let active = true;
    let loader;
    if (section === "artistas") loader = loadRecentArtists();
    else if (section === "albuns") loader = loadRecentAlbums();
    else if (section === "favoritos") loader = base44.entities.Favorite.list("-added_at", 500);
    else if (section === "playlists") loader = base44.entities.Playlist.list("-updated_date", 500);
    else loader = base44.entities.Playlist.list("-updated_date", 100);
    loader
      .then((r) => { if (active) { setItems(r || []); setLoading(false); } })
      .catch(() => { if (active) { setItems([]); setLoading(false); } });
    return () => { active = false; };
  }, [section]);

  const isRow = section === "favoritos";
  const isPaged = section === "artistas" || section === "albuns";
  const pageCount = isPaged ? Math.ceil(items.length / PAGE_SIZE) : 1;
  const safePage = Math.min(page, pageCount || 1);
  const pagedItems = isPaged ? items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) : items;

  return (
    <div className="pb-10">
      <div className="px-6 md:px-10 pt-8 pb-4">
        <h1 className="text-3xl md:text-5xl font-bold">{titles[section]}</h1>
        {section === "artistas" && <p className="text-sm text-muted-foreground mt-2">Artistas que ouviste no último ano.</p>}
        {section === "albuns" && <p className="text-sm text-muted-foreground mt-2">Álbuns que ouviste no último ano.</p>}
      </div>

      {loading && <SkeletonGrid variant={isRow ? "row" : "card"} count={isRow ? 8 : 12} />}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={emptyConfig[section].icon}
          title={emptyConfig[section].title}
          subtitle={emptyConfig[section].subtitle}
        />
      )}

      {!loading && items.length > 0 && isRow && (
        <div className="px-4 md:px-6 space-y-0.5">
          {items.map((f, i) => (
            <SongRow key={f.id} song={f} index={i} queue={items} onPlay={(song, idx) => playQueue(items, idx)} />
          ))}
        </div>
      )}

      {!loading && items.length > 0 && section === "artistas" && (
        <>
          <div className="px-4 md:px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1">
            {pagedItems.map((a) => (
              <MediaCard key={a.id} to={`/artist/${a.id}`} cover_url={a.image_url} title={a.name} subtitle="Artista" rounded />
            ))}
          </div>
          <LibraryPagination page={safePage} pageCount={pageCount} onChange={setPage} />
        </>
      )}

      {!loading && items.length > 0 && section === "albuns" && (
        <>
          <div className="px-4 md:px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1">
            {pagedItems.map((a) => (
              <MediaCard key={a.id} to={`/album/${a.id}`} cover_url={a.cover_url} title={a.title} subtitle={a.artist_name} />
            ))}
          </div>
          <LibraryPagination page={safePage} pageCount={pageCount} onChange={setPage} />
        </>
      )}

      {!loading && items.length > 0 && (section === "recentes" || section === "playlists") && (
        <div className="px-4 md:px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1">
          {items.map((p) => (
            <MediaCard key={p.id} to={`/playlist/${p.id}`} cover_url={p.cover_url} title={p.title} subtitle={`${p.track_count || (p.song_ids?.length || 0)} músicas`} />
          ))}
        </div>
      )}

      {!loading && items.length > 0 && !isPaged && items.length < (isRow ? 12 : 18) && (
        <SkeletonFiller variant={isRow ? "row" : "card"} />
      )}
    </div>
  );
}