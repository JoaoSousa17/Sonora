import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Pause, MoreHorizontal, Heart, ListPlus, Radio, Clock, Disc3, Mic2 } from "lucide-react";
import { usePlayer } from "@/lib/PlayerContext";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import AddToPlaylistDialog from "@/components/AddToPlaylistDialog";

function formatDuration(sec) {
  if (!sec) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SongRow({ song, index, queue, showArtwork = true, onPlay, playlistTags }) {
  const { currentSong, isPlaying, togglePlay, playSong, addToQueue, playNext, startRadio } = usePlayer();
  const navigate = useNavigate();
  const [loved, setLoved] = useState(false);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const isCurrent = currentSong?.id === song.id;

  const handlePlay = () => {
    if (isCurrent) togglePlay();
    else if (onPlay) onPlay(song, index);
    else playSong(song, queue || [song], index ?? 0);
  };

  const handleLove = async () => {
    try {
      if (loved) {
        await base44.entities.Favorite.deleteMany({ song_id: song.id });
        setLoved(false);
      } else {
        await base44.entities.Favorite.create({
          song_id: song.id, song_title: song.title, artist_name: song.artist_name,
          cover_url: song.cover_url, added_at: new Date().toISOString(),
        });
        setLoved(true);
        toast({ title: "Adicionado aos Favoritos" });
      }
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors ${
        isCurrent ? "bg-white/5" : ""
      }`}
    >
      <button onClick={handlePlay} className="w-6 flex-shrink-0 flex items-center justify-center">
        {isCurrent && isPlaying ? (
          <Pause className="w-4 h-4 text-primary fill-primary group-hover:block" />
        ) : isCurrent ? (
          <Play className="w-4 h-4 text-primary fill-primary" />
        ) : (
          <>
            <span className="text-sm text-muted-foreground group-hover:hidden">{index != null ? index + 1 : ""}</span>
            <Play className="w-4 h-4 hidden group-hover:block text-foreground fill-foreground" />
          </>
        )}
      </button>

      {showArtwork && (
        <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
          <Image src={song.cover_url} className="w-full h-full object-cover" fittingType="fill" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrent ? "text-primary" : "text-foreground"}`}>{song.title}</p>
        {song.artist_name && (
          <Link to={`/artist/${song.artist_id}`} className="text-xs text-muted-foreground hover:underline truncate block">
            {song.artist_name}
          </Link>
        )}
      </div>

      <button onClick={handleLove} className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Heart className={`w-4 h-4 ${loved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
      </button>

      {playlistTags && playlistTags.length > 0 && (
        <div className="hidden sm:flex items-center gap-1 max-w-[200px]">
          {playlistTags.slice(0, 2).map((t, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground whitespace-nowrap max-w-[100px] truncate" title={t}>
              {t}
            </span>
          ))}
          {playlistTags.length > 2 && (
            <div className="relative group/tag">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/30 text-primary whitespace-nowrap cursor-default">
                +{playlistTags.length - 2}
              </span>
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover/tag:block z-30 bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[180px]">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 px-1">Nas playlists</p>
                {playlistTags.map((t, i) => (
                  <p key={i} className="text-xs text-foreground px-2 py-1 rounded hover:bg-white/5 truncate max-w-[200px]">{t}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <span className="text-xs text-muted-foreground flex-shrink-0">{formatDuration(song.duration_seconds)}</span>

      <DropdownMenu>
        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => addToQueue(song)}>
            <ListPlus className="w-4 h-4 mr-2" /> Adicionar à fila
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => playNext(song)}>
            <Clock className="w-4 h-4 mr-2" /> Tocar a seguir
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => startRadio(song)}>
            <Radio className="w-4 h-4 mr-2" /> Criar estação
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAddToPlaylistOpen(true)}>
            <ListPlus className="w-4 h-4 mr-2" /> Adicionar à playlist
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLove}>
            <Heart className="w-4 h-4 mr-2" /> {loved ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate(`/album/${song.album_id}`)} disabled={!song.album_id}>
            <Disc3 className="w-4 h-4 mr-2" /> Ir para o álbum
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/artist/${song.artist_id}`)} disabled={!song.artist_id}>
            <Mic2 className="w-4 h-4 mr-2" /> Ir para o artista
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddToPlaylistDialog song={song} open={addToPlaylistOpen} onOpenChange={setAddToPlaylistOpen} />
    </div>
  );
}