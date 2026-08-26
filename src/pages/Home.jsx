import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { usePlayer } from "@/lib/PlayerContext";
import { Play, Radio, Music2, Disc3, ListMusic } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import SectionDivider from "@/components/SectionDivider";
import { Image } from "@/components/ui/image";
import MediaCard from "@/components/MediaCard";
import SectionRow from "@/components/SectionRow";
import SongRow from "@/components/SongRow";

export default function Home() {
  const { playQueue, startRadio, currentSong } = usePlayer();
  const { user } = useAuth();
  const [recent, setRecent] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [topSongs, setTopSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ListeningHistory.list("-played_at", 12).catch(() => []),
      base44.entities.Album.list("-release_year", 20).catch(() => []),
      base44.entities.Playlist.list("-updated_date", 20).catch(() => []),
      base44.entities.Song.list("-play_count", 20).catch(() => []),
    ]).then(([r, a, p, s]) => {
      // dedupe recent by song_id
      const seen = new Set();
      setRecent((r || []).filter((h) => (seen.has(h.song_id) ? false : (seen.add(h.song_id), true))).slice(0, 6));
      setAlbums(a || []);
      setPlaylists(p || []);
      setTopSongs(s || []);
      setLoading(false);
    });
  }, []);

  if (user && !user.access_verified) return <Navigate to="/access-code" replace />;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  const recentSongs = recent.map((h) => ({
    id: h.song_id, title: h.song_title, artist_name: h.artist_name, cover_url: h.cover_url,
  }));

  return (
    <div className="pb-10">
      {/* Hero */}
      <div className="px-6 md:px-10 pt-8 pb-6">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-1">Ouvir agora</h1>
        <p className="text-muted-foreground">As tuas recomendações, estações e novidades.</p>
      </div>

      {recentSongs.length > 0 && (
        <div className="px-6 md:px-10 mb-8">
          <SectionDivider icon={Music2} />
          <h2 className="text-xl font-bold mb-3">Tocadas recentemente</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {recentSongs.map((s, i) => (
              <button
                key={s.id + i}
                onClick={() => playQueue(recentSongs, i)}
                className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left group"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 relative">
                  {s.cover_url && <Image src={s.cover_url} className="w-full h-full object-cover" fittingType="fill" />}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>
                <span className="text-sm font-medium truncate">{s.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-2 md:px-4">
        <SectionDivider icon={Music2} />
        <SectionRow
          title="Top músicas"
          items={topSongs.slice(0, 10)}
          renderCard={(s) => (
            <button
              onClick={() => playQueue(topSongs, topSongs.indexOf(s))}
              className="block w-full text-left p-3 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-white/5 relative">
                {s.cover_url ? (
                  <Image src={s.cover_url} className="w-full h-full object-cover" fittingType="fill" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-3xl">♪</div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </div>
              <p className="font-medium text-sm truncate">{s.title}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{s.artist_name}</p>
            </button>
          )}
        />

        <SectionDivider icon={Disc3} />
        <SectionRow
          title="Novos lançamentos"
          to="/library/albuns"
          items={albums}
          renderCard={(a) => (
            <MediaCard to={`/album/${a.id}`} cover_url={a.cover_url} title={a.title} subtitle={a.artist_name} />
          )}
        />

        <SectionDivider icon={ListMusic} />
        <SectionRow
          title="As tuas playlists"
          to="/library/playlists"
          items={playlists}
          renderCard={(p) => (
            <MediaCard to={`/playlist/${p.id}`} cover_url={p.cover_url} title={p.title} subtitle={`${p.track_count || (p.song_ids?.length || 0)} músicas`} />
          )}
        />

        {topSongs.length > 0 && (
          <section className="px-4 md:px-6 mb-10">
            <SectionDivider icon={Radio} />
            <h2 className="text-xl md:text-2xl font-bold mb-3">Estação para ti</h2>
            <button
              onClick={() => startRadio(topSongs[0])}
              className="w-full am-gradient rounded-2xl p-6 md:p-8 flex items-center gap-4 text-left hover:opacity-90 transition-opacity"
            >
              <Radio className="w-10 h-10 text-white" />
              <div>
                <p className="text-white font-bold text-lg">Rádio personalizada</p>
                <p className="text-white/80 text-sm">Baseada no que ouves — toca músicas semelhantes em shuffle.</p>
              </div>
            </button>
          </section>
        )}
      </div>
    </div>
  );
}