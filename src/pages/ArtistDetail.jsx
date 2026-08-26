import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Play, Shuffle, ChevronLeft } from "lucide-react";
import { usePlayer } from "@/lib/PlayerContext";
import { Image } from "@/components/ui/image";
import SongRow from "@/components/SongRow";
import MediaCard from "@/components/MediaCard";
import { Button } from "@/components/ui/button";

export default function ArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playArtistShuffle, playQueue } = usePlayer();
  const [artist, setArtist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Artist.get(id).catch(() => null),
      base44.entities.Song.filter({ artist_id: id }, "-play_count", 100).catch(() => []),
      base44.entities.Album.filter({ artist_id: id }, "-release_year", 50).catch(() => []),
    ]).then(([a, s, al]) => {
      setArtist(a);
      setSongs(s || []);
      setAlbums(al || []);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!artist) return <p className="p-10 text-muted-foreground">Artista não encontrado.</p>;

  return (
    <div className="pb-10">
      <div className="relative h-64 md:h-80">
        {artist.header_image_url ? (
          <img src={artist.header_image_url} className="w-full h-full object-cover" alt="" />
        ) : artist.image_url ? (
          <img src={artist.image_url} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full am-gradient" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 md:top-6 md:left-6 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="absolute bottom-4 left-6 md:left-10">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight drop-shadow-lg">{artist.name}</h1>
        </div>
      </div>

      <div className="px-6 md:px-10 py-5 flex items-center gap-4">
        <Button
          onClick={() => playArtistShuffle(id)}
          className="am-gradient hover:opacity-90 rounded-full h-12 w-12 p-0 shadow-lg shadow-primary/30"
        >
          <Play className="w-5 h-5 fill-white text-white" />
        </Button>
        <button onClick={() => playArtistShuffle(id)} className="text-muted-foreground hover:text-foreground" title="Shuffle">
          <Shuffle className="w-6 h-6" />
        </button>
      </div>

      {songs.length > 0 && (
        <section className="px-6 md:px-10 mb-8">
          <h2 className="text-xl font-bold mb-3">Principais músicas</h2>
          <div className="space-y-0.5">
            {songs.slice(0, 10).map((s, i) => (
              <SongRow key={s.id} song={s} index={i} queue={songs} onPlay={(song, idx) => playQueue(songs, idx)} />
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section className="px-2 md:px-4">
          <h2 className="text-xl font-bold mb-3 px-4 md:px-6">Álbuns</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-1 px-2">
            {albums.map((a) => (
              <MediaCard key={a.id} to={`/album/${a.id}`} cover_url={a.cover_url} title={a.title} subtitle={String(a.release_year || "")} />
            ))}
          </div>
        </section>
      )}

      {artist.bio && (
        <section className="px-6 md:px-10 mt-8 max-w-2xl">
          <h2 className="text-xl font-bold mb-2">Sobre</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{artist.bio}</p>
        </section>
      )}
    </div>
  );
}