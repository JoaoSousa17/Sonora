import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Play, Shuffle, ChevronLeft } from "lucide-react";
import { usePlayer } from "@/lib/PlayerContext";
import { Image } from "@/components/ui/image";
import SongRow from "@/components/SongRow";
import { Button } from "@/components/ui/button";
import { shuffleArray } from "@/lib/recommendations";

export default function AlbumDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playQueue, currentSong, isPlaying, togglePlay } = usePlayer();
  const [album, setAlbum] = useState(null);
  const [songs, setSongs] = useState([]);
  const [playlistMap, setPlaylistMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Album.get(id).catch(() => null),
      base44.entities.Song.filter({ album_id: id }, "track_number", 100).catch(() => []),
      base44.entities.Playlist.list("-updated_date", 100).catch(() => []),
    ]).then(([a, s, pl]) => {
      setAlbum(a);
      setSongs((s || []).sort((x, y) => (x.track_number || 0) - (y.track_number || 0)));
      const map = {};
      (pl || []).forEach((p) => (p.song_ids || []).forEach((sid) => {
        if (!map[sid]) map[sid] = [];
        if (!map[sid].includes(p.title)) map[sid].push(p.title);
      }));
      setPlaylistMap(map);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!album) return <p className="p-10 text-muted-foreground">Álbum não encontrado.</p>;

  const isThisQueue = currentSong && songs.some((s) => s.id === currentSong.id);

  return (
    <div className="pb-10 relative">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 md:top-6 md:left-6 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="px-6 md:px-10 pt-10 pb-6 flex flex-col md:flex-row gap-6 items-end bg-gradient-to-b from-primary/20 to-transparent">
        <div className="w-48 h-48 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
          {album.cover_url ? (
            <Image src={album.cover_url} className="w-full h-full object-cover" fittingType="fill" />
          ) : (
            <div className="w-full h-full am-gradient" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Álbum</p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight mb-2">{album.title}</h1>
          <Link to={`/artist/${album.artist_id}`} className="text-primary hover:underline">{album.artist_name}</Link>
          <p className="text-sm text-muted-foreground mt-2">{album.release_year} · {songs.length} músicas</p>
        </div>
      </div>

      <div className="px-6 md:px-10 py-5 flex items-center gap-4">
        <Button
          onClick={() => isThisQueue ? togglePlay() : playQueue(songs, 0)}
          className="w-14 h-14 rounded-full am-gradient hover:opacity-90 p-0 shadow-lg shadow-primary/30"
        >
          <Play className="w-6 h-6 fill-white text-white" />
        </Button>
        <button onClick={() => playQueue(shuffleArray(songs), 0)} className="text-muted-foreground hover:text-foreground" title="Shuffle">
          <Shuffle className="w-6 h-6" />
        </button>
      </div>

      <div className="px-4 md:px-6 space-y-0.5">
        {songs.map((s, i) => (
          <SongRow key={s.id} song={s} index={i} queue={songs} onPlay={(song, idx) => playQueue(songs, idx)} playlistTags={playlistMap[s.id]} />
        ))}
      </div>
    </div>
  );
}