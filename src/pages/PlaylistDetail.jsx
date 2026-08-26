import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Play, Shuffle, Pencil, Share2, X, GripVertical, Plus, Check, Music2,
} from "lucide-react";
import { usePlayer } from "@/lib/PlayerContext";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { shuffleArray, getRecommendations } from "@/lib/recommendations";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import SongRow from "@/components/SongRow";
import PlaylistEditSheet from "@/components/PlaylistEditSheet";

function formatDuration(sec) {
  if (!sec) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlaylistDetail() {
  const { id } = useParams();
  const { playQueue, currentSong, isPlaying, togglePlay } = usePlayer();
  const isMobile = useIsMobile();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [suggested, setSuggested] = useState([]);

  useEffect(() => {
    setLoading(true);
    setEditMode(false);
    setSheetOpen(false);
    base44.entities.Playlist.get(id).then(async (p) => {
      setPlaylist(p);
      setTitle(p.title);
      setDescription(p.description || "");
      if (p.song_ids?.length) {
        const all = await base44.entities.Song.list("-play_count", 500);
        setSongs(p.song_ids.map((sid) => all.find((s) => s.id === sid)).filter(Boolean));
      } else {
        setSongs([]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!playlist || songs.length === 0) { setSuggested([]); return; }
    getRecommendations({ seed_type: "song", seed_id: songs[0].id, exclude_ids: songs.map((s) => s.id), limit: 6 })
      .then(setSuggested).catch(() => setSuggested([]));
  }, [playlist?.id, songs.length]);

  const persist = async (newSongIds, newMeta) => {
    setSaving(true);
    try {
      const updated = await base44.entities.Playlist.update(id, {
        song_ids: newSongIds, track_count: newSongIds.length, ...(newMeta || {}),
      });
      setPlaylist(updated);
    } catch { toast({ title: "Erro ao guardar", variant: "destructive" }); }
    setSaving(false);
  };

  const saveMeta = async () => {
    await persist(playlist.song_ids, { title, description });
    setEditMode(false);
    setSheetOpen(false);
    toast({ title: "Playlist atualizada" });
  };

  const onUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updated = await base44.entities.Playlist.update(id, { cover_url: file_url });
      setPlaylist(updated);
      toast({ title: "Capa atualizada" });
    } catch { toast({ title: "Erro ao enviar capa", variant: "destructive" }); }
  };

  const onDragEnd = (res) => {
    if (!res.destination || res.destination.index === res.source.index) return;
    const reordered = Array.from(songs);
    const [moved] = reordered.splice(res.source.index, 1);
    reordered.splice(res.destination.index, 0, moved);
    setSongs(reordered);
    persist(reordered.map((s) => s.id));
  };

  const moveSong = (songId, dir) => {
    const idx = songs.findIndex((s) => s.id === songId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= songs.length) return;
    const reordered = Array.from(songs);
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    setSongs(reordered);
    persist(reordered.map((s) => s.id));
  };

  const removeSong = (songId) => {
    const remaining = songs.filter((s) => s.id !== songId);
    setSongs(remaining);
    persist(remaining.map((s) => s.id));
  };

  const addSuggested = async (song) => {
    const next = [...songs, song];
    setSongs(next);
    setSuggested((s) => s.filter((x) => x.id !== song.id));
    await persist(next.map((s) => s.id));
    toast({ title: "Adicionada à playlist" });
  };

  const share = async () => {
    const url = `${window.location.origin}/playlist/${id}`;
    try { await navigator.clipboard.writeText(url); toast({ title: "Link copiado", description: "Partilha a tua playlist onde quiseres." }); }
    catch { toast({ title: url }); }
  };

  const onEditClick = () => {
    if (isMobile) setSheetOpen(true);
    else setEditMode((e) => !e);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!playlist) return <p className="p-10 text-muted-foreground">Playlist não encontrada.</p>;

  const isThisQueue = currentSong && songs.some((s) => s.id === currentSong.id);

  return (
    <div className="pb-10">
      <div className="px-6 md:px-10 pt-10 pb-6 flex flex-col md:flex-row gap-6 items-end bg-gradient-to-b from-primary/20 to-transparent">
        <div className="relative group w-48 h-48 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
          {playlist.cover_url ? (
            <Image src={playlist.cover_url} className="w-full h-full object-cover" fittingType="fill" />
          ) : (
            <div className="w-full h-full am-gradient flex items-center justify-center text-white/30 text-7xl">♪</div>
          )}
          {editMode && (
            <label className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer">
              <Pencil className="w-6 h-6 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={onUploadCover} />
            </label>
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Playlist</p>
          {editMode ? (
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-3xl md:text-5xl font-bold h-auto py-2 mb-2 bg-white/5 border-white/10" />
          ) : (
            <h1 className="text-3xl md:text-6xl font-bold tracking-tight mb-2">{playlist.title}</h1>
          )}
          {editMode ? (
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" className="mb-2 bg-white/5 border-white/10" rows={2} />
          ) : (
            playlist.description && <p className="text-muted-foreground">{playlist.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">{songs.length} músicas</p>
        </div>
      </div>

      <div className="px-6 md:px-10 py-5 flex items-center gap-4">
        <Button onClick={() => isThisQueue ? togglePlay() : playQueue(songs, 0)} className="w-14 h-14 rounded-full am-gradient hover:opacity-90 p-0 shadow-lg shadow-primary/30">
          <Play className="w-6 h-6 fill-white text-white" />
        </Button>
        <button onClick={() => playQueue(shuffleArray(songs), 0)} className="text-muted-foreground hover:text-foreground" title="Shuffle"><Shuffle className="w-6 h-6" /></button>
        <button onClick={share} className="text-muted-foreground hover:text-foreground" title="Partilhar"><Share2 className="w-5 h-5" /></button>
        <button onClick={onEditClick} className={`${editMode ? "text-primary" : "text-muted-foreground hover:text-foreground"}`} title="Editar"><Pencil className="w-5 h-5" /></button>
        {editMode && <Button size="sm" onClick={saveMeta} disabled={saving} className="ml-auto"><Check className="w-4 h-4 mr-1" /> {saving ? "A guardar..." : "Guardar"}</Button>}
      </div>

      <div className="px-4 md:px-6">
        {songs.length === 0 && <p className="px-4 text-muted-foreground">Esta playlist está vazia.</p>}
        {editMode && !isMobile ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="playlist-songs">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-0.5">
                  {songs.map((s, i) => (
                    <Draggable key={s.id} draggableId={s.id} index={i}>
                      {(prov) => (
                        <div ref={prov.innerRef} {...prov.draggableProps} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5">
                          <span {...prov.dragHandleProps} className="cursor-grab text-muted-foreground"><GripVertical className="w-5 h-5" /></span>
                          <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">{s.cover_url && <Image src={s.cover_url} className="w-full h-full object-cover" fittingType="fill" />}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.artist_name}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDuration(s.duration_seconds)}</span>
                          <button onClick={() => removeSong(s.id)} className="text-muted-foreground hover:text-destructive p-1"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="space-y-0.5">
            {songs.map((s, i) => (
              <SongRow key={s.id} song={s} index={i} queue={songs} onPlay={(song, idx) => playQueue(songs, idx)} />
            ))}
          </div>
        )}
      </div>

      {suggested.length > 0 && (
        <div className="px-6 md:px-10 mt-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <Music2 className="w-4 h-4 text-primary/50" />
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          <h2 className="text-xl font-bold mb-3">Músicas sugeridas</h2>
          <p className="text-sm text-muted-foreground mb-3">Com base no que já está nesta playlist.</p>
          <div className="space-y-0.5">
            {suggested.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 group">
                <span className="w-6 text-center text-sm text-muted-foreground">{i + 1}</span>
                <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">{s.cover_url && <Image src={s.cover_url} className="w-full h-full object-cover" fittingType="fill" />}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.artist_name}</p>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">{formatDuration(s.duration_seconds)}</span>
                <button onClick={() => addSuggested(s)} className="flex items-center gap-1 text-sm text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <PlaylistEditSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={title} setTitle={setTitle}
        description={description} setDescription={setDescription}
        coverUrl={playlist.cover_url}
        onUploadCover={onUploadCover}
        songs={songs}
        onRemoveSong={removeSong}
        onMoveSong={moveSong}
        onSave={saveMeta}
        saving={saving}
      />
    </div>
  );
}