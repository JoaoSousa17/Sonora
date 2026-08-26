import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Image } from "@/components/ui/image";
import { ListMusic, Plus, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function AddToPlaylistDialog({ song, open, onOpenChange }) {
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    if (open) base44.entities.Playlist.list("-updated_date", 100).then(setPlaylists).catch(() => {});
  }, [open]);

  if (!song) return null;

  const add = async (p) => {
    const ids = p.song_ids || [];
    if (ids.includes(song.id)) {
      toast({ title: "Já está na playlist", description: p.title });
      onOpenChange(false);
      return;
    }
    try {
      await base44.entities.Playlist.update(p.id, {
        song_ids: [...ids, song.id],
        track_count: ids.length + 1,
      });
      toast({ title: "Adicionado", description: p.title });
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="am-gradient px-6 py-5">
          <DialogTitle className="text-white text-xl font-bold flex items-center gap-2"><ListMusic className="w-5 h-5" /> Adicionar à playlist</DialogTitle>
          <p className="text-white/80 mt-1 text-sm truncate">{song.title} · {song.artist_name}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {playlists.length === 0 && <p className="text-sm text-muted-foreground p-2">Sem playlists. Cria uma no menu lateral (Playlists → +).</p>}
          {playlists.map((p) => {
            const inIt = (p.song_ids || []).includes(song.id);
            return (
              <button key={p.id} onClick={() => add(p)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left">
                <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                  {p.cover_url ? <Image src={p.cover_url} className="w-full h-full object-cover" fittingType="fill" /> : <div className="w-full h-full am-gradient" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.song_ids?.length || 0} músicas</p>
                </div>
                {inIt ? <Check className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}