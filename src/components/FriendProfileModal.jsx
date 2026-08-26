import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Image } from "@/components/ui/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import MediaCard from "@/components/MediaCard";
import SongRow from "@/components/SongRow";
import { usePlayer } from "@/lib/PlayerContext";
import { Music2 } from "lucide-react";

export default function FriendProfileModal({ friend, open, onOpenChange }) {
  const { playQueue } = usePlayer();
  const [profile, setProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    if (!friend?.id) return;
    base44.entities.Profile.filter({ created_by_id: friend.id }, "-created_date", 1)
      .then((r) => setProfile(r[0] || null)).catch(() => setProfile(null));
    base44.entities.Playlist.filter({ created_by_id: friend.id, is_public: true }, "-updated_date", 12)
      .then(setPlaylists).catch(() => setPlaylists([]));
    base44.entities.FriendActivity.filter({ created_by_id: friend.id }, "-created_date", 5)
      .then(setRecent).catch(() => setRecent([]));
  }, [friend?.id]);

  if (!friend) return null;
  const name = profile?.display_name || friend.name || "Amigo";
  const cover = profile?.cover_photo_url || friend.cover;
  const photo = profile?.photo_url || friend.photo;
  const bio = profile?.bio || friend.bio;
  const recentSongs = recent.map((r) => ({ id: r.song_id, title: r.song_title, artist_name: r.artist_name, cover_url: r.cover_url }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="relative h-32 flex-shrink-0">
          {cover ? <Image src={cover} className="w-full h-full object-cover" fittingType="fill" /> : <div className="w-full h-full am-gradient" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <DialogTitle className="sr-only">{name}</DialogTitle>
        </div>
        <div className="px-6 -mt-10 relative flex-shrink-0">
          <Avatar className="w-20 h-20 ring-4 ring-background">
            {photo ? <Image src={photo} className="w-full h-full object-cover" fittingType="fill" /> : <AvatarFallback className="text-2xl">{name[0]?.toUpperCase()}</AvatarFallback>}
          </Avatar>
          <h2 className="text-2xl font-bold mt-3">{name}</h2>
          {bio && <p className="text-sm text-muted-foreground mt-1">{bio}</p>}
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 mt-4 space-y-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2"><Music2 className="w-4 h-4" /> Tocadas recentemente</h3>
            {recentSongs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem atividade recente.</p>
            ) : (
              <div className="space-y-0.5">
                {recentSongs.map((s, i) => (
                  <SongRow key={i} song={s} index={i} queue={recentSongs} onPlay={(song, idx) => playQueue(recentSongs, idx)} />
                ))}
              </div>
            )}
          </section>
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Playlists</h3>
            {playlists.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem playlists públicas.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {playlists.map((p) => (
                  <MediaCard key={p.id} to={`/playlist/${p.id}`} cover_url={p.cover_url} title={p.title} subtitle="Playlist" />
                ))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}