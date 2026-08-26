import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search as SearchIcon, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import MediaCard from "@/components/MediaCard";
import SongRow from "@/components/SongRow";
import { usePlayer } from "@/lib/PlayerContext";

const RECENT_KEY = "music:recent-searches";

const browseCategories = [
  { title: "Artistas", to: "/library/artistas", image: "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/efa6bcb9d_generated_image.png" },
  { title: "Álbuns", to: "/library/albuns", image: "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/03593c52f_generated_image.png" },
  { title: "Favoritos", to: "/library/favoritos", image: "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/df6f1dc4c_generated_image.png" },
  { title: "Podcasts", to: "/podcasts", image: "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/de719b7c7_generated_image.png" },
  { title: "Rádio", to: "/radio", image: "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/21122dfe9_generated_image.png" },
];

export default function Search() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const { playQueue } = usePlayer();

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"));
    } catch {
      setRecent([]);
    }
  }, []);

  const saveRecent = (term) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 12);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const clearRecent = () => {
    setRecent([]);
    localStorage.removeItem(RECENT_KEY);
  };

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const [songs, artists, albums, playlists] = await Promise.all([
        base44.entities.Song.list("-play_count", 50).catch(() => []),
        base44.entities.Artist.list("-monthly_listeners", 50).catch(() => []),
        base44.entities.Album.list("-release_year", 50).catch(() => []),
        base44.entities.Playlist.list("-updated_date", 50).catch(() => []),
      ]);
      const ql = q.toLowerCase();
      setResults({
        songs: (songs || []).filter((s) => s.title?.toLowerCase().includes(ql) || s.artist_name?.toLowerCase().includes(ql)),
        artists: (artists || []).filter((a) => a.name?.toLowerCase().includes(ql)),
        albums: (albums || []).filter((a) => a.title?.toLowerCase().includes(ql) || a.artist_name?.toLowerCase().includes(ql)),
        playlists: (playlists || []).filter((p) => p.title?.toLowerCase().includes(ql)),
      });
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const runSearch = (term) => setQ(term);

  return (
    <div className="pb-10">
      <div className="px-6 md:px-10 pt-8 pb-6 sticky top-0 bg-background/80 backdrop-blur z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveRecent(q);
          }}
          className="relative max-w-xl"
        >
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Músicas, artistas, álbuns, playlists"
            className="pl-11 pr-10 h-12 rounded-full bg-white/5 border-white/10"
            autoFocus
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>

      <div className="px-6 md:px-10">
        {!results && !loading && (
          <div className="space-y-8">
            {recent.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold">Pesquisas recentes</h2>
                  <button onClick={clearRecent} className="text-sm text-muted-foreground hover:text-foreground">
                    Limpar
                  </button>
                </div>
                {/* running text chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {recent.map((r) => (
                    <button
                      key={r}
                      onClick={() => runSearch(r)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sm transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {r}
                    </button>
                  ))}
                </div>
                {/* cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {recent.slice(0, 6).map((r) => (
                    <button
                      key={r}
                      onClick={() => runSearch(r)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                        <SearchIcon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium truncate">{r}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold mb-3">Explorar</h2>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {browseCategories.map((c, i) => (
                  <Link
                    key={c.title}
                    to={c.to}
                    className={`relative rounded-2xl h-32 md:h-36 overflow-hidden hover:opacity-95 transition-opacity ${i < 3 ? "md:col-span-2" : "md:col-span-3"}`}
                  >
                    <img src={c.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
                    <span className="relative p-4 h-full flex items-end text-white font-bold text-lg drop-shadow">{c.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {results && !loading && (
          <div className="space-y-8">
            {results.songs.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-2">Músicas</h2>
                <div className="space-y-0.5">
                  {results.songs.slice(0, 8).map((s, i) => (
                    <SongRow key={s.id} song={s} index={i} queue={results.songs} />
                  ))}
                </div>
              </section>
            )}
            {results.artists.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-2">Artistas</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-1">
                  {results.artists.map((a) => (
                    <MediaCard key={a.id} to={`/artist/${a.id}`} cover_url={a.image_url} title={a.name} subtitle="Artista" rounded />
                  ))}
                </div>
              </section>
            )}
            {results.albums.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-2">Álbuns</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-1">
                  {results.albums.map((a) => (
                    <MediaCard key={a.id} to={`/album/${a.id}`} cover_url={a.cover_url} title={a.title} subtitle={a.artist_name} />
                  ))}
                </div>
              </section>
            )}
            {results.playlists.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-2">Playlists</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-1">
                  {results.playlists.map((p) => (
                    <MediaCard key={p.id} to={`/playlist/${p.id}`} cover_url={p.cover_url} title={p.title} subtitle="Playlist" />
                  ))}
                </div>
              </section>
            )}
            {q.trim().toLowerCase() === "secret" && (
              <div className="flex justify-center py-10">
                <Link to="/secret-bar" className="px-6 py-4 rounded-xl am-gradient text-white font-bold shadow-lg shadow-primary/30">Barra Secret</Link>
              </div>
            )}
            {q.trim().toLowerCase() !== "secret" && results.songs.length === 0 && results.artists.length === 0 && results.albums.length === 0 && results.playlists.length === 0 && (
              <p className="text-muted-foreground text-center py-20">Sem resultados para "{q}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}