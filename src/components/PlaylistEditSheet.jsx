import React from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Image } from "@/components/ui/image";
import { Pencil, Trash2, ChevronUp, ChevronDown, Check } from "lucide-react";

export default function PlaylistEditSheet({
  open, onOpenChange, title, setTitle, description, setDescription,
  coverUrl, onUploadCover, songs, onRemoveSong, onMoveSong, onSave, saving,
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-2xl">
        <SheetHeader className="px-5 pt-5 pb-2 text-left">
          <SheetTitle>Editar playlist</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
          <div className="flex items-center gap-4">
            <label className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer bg-white/5">
              {coverUrl ? (
                <Image src={coverUrl} className="w-full h-full object-cover" fittingType="fill" />
              ) : (
                <div className="w-full h-full am-gradient flex items-center justify-center text-white/30 text-4xl">♪</div>
              )}
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={onUploadCover} />
            </label>
            <div className="flex-1 space-y-2">
              <div className="space-y-1">
                <Label htmlFor="pl-title">Nome</Label>
                <Input id="pl-title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/5" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pl-desc">Descrição</Label>
            <Textarea id="pl-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="bg-white/5" />
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Músicas ({songs.length})</p>
            <div className="space-y-1">
              {songs.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
                  <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0">
                    {s.cover_url && <Image src={s.cover_url} className="w-full h-full object-cover" fittingType="fill" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.artist_name}</p>
                  </div>
                  <button onClick={() => onMoveSong(s.id, -1)} disabled={i === 0} className="p-1 text-muted-foreground disabled:opacity-30">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => onMoveSong(s.id, 1)} disabled={i === songs.length - 1} className="p-1 text-muted-foreground disabled:opacity-30">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => onRemoveSong(s.id)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {songs.length === 0 && <p className="text-sm text-muted-foreground px-2 py-4">Sem músicas.</p>}
            </div>
          </div>
        </div>

        <SheetFooter className="px-5 py-4 border-t border-border">
          <Button onClick={onSave} disabled={saving} className="w-full am-gradient">
            <Check className="w-4 h-4 mr-2" /> {saving ? "A guardar..." : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}