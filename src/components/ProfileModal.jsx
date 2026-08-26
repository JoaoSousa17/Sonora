import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Image } from "@/components/ui/image";
import { toast } from "@/components/ui/use-toast";
import { Pencil, Mail, Send } from "lucide-react";

export default function ProfileModal({ open, onOpenChange }) {
  const { user, checkUserAuth } = useAuth();
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    if (open && user) {
      setName(user.display_name || user.full_name || "");
      setPhotoUrl(user.photo_url || "");
      setCoverUrl(user.cover_photo_url || "");
      setBio(user.bio || "");
    }
  }, [open, user]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(file_url);
    } catch { toast({ title: "Erro ao enviar foto", variant: "destructive" }); }
  };

  const onUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCoverUrl(file_url);
    } catch { toast({ title: "Erro ao enviar capa", variant: "destructive" }); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ display_name: name, photo_url: photoUrl, bio, cover_photo_url: coverUrl });
      const existing = await base44.entities.Profile.filter({ created_by_id: user.id }, "-created_date", 1).catch(() => []);
      const payload = { display_name: name || user.email, photo_url: photoUrl, bio, cover_photo_url: coverUrl };
      if (existing.length) await base44.entities.Profile.update(existing[0].id, payload);
      else await base44.entities.Profile.create(payload);
      if (checkUserAuth) await checkUserAuth();
      toast({ title: "Perfil atualizado" });
      onOpenChange(false);
    } catch { toast({ title: "Erro ao guardar", variant: "destructive" }); }
    setSaving(false);
  };

  const sendReport = async () => {
    if (!reportText.trim()) return;
    setSendingReport(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: "Reportar problema — Sonora",
        body: `Olá ${name || user.email},\n\nRecebemos o teu reporte:\n\n"${reportText}"\n\nObrigado pela ajuda a melhorar a Sonora.`,
      });
      toast({ title: "Reporte enviado", description: "Obrigado pelo teu feedback." });
      setReportText("");
      setReportOpen(false);
    } catch { toast({ title: "Erro ao enviar", variant: "destructive" }); }
    setSendingReport(false);
  };

  const initials = (name || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden max-h-[85vh] flex flex-col">
          <div className="relative h-24 flex-shrink-0">
            {coverUrl ? <Image src={coverUrl} className="w-full h-full object-cover" fittingType="fill" /> : <div className="w-full h-full am-gradient" />}
            <label className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center cursor-pointer">
              <Pencil className="w-3.5 h-3.5 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={onUploadCover} />
            </label>
          </div>
          <div className="p-6 pt-3 overflow-y-auto">
            <DialogHeader className="text-left">
              <DialogTitle>O teu perfil</DialogTitle>
              <DialogDescription>Personaliza a tua conta na Sonora.</DialogDescription>
            </DialogHeader>

            <div className="flex justify-center mt-3">
              <div className="relative">
                <Avatar className="w-24 h-24 ring-2 ring-primary/30">
                  {photoUrl ? (
                    <Image src={photoUrl} className="w-full h-full object-cover" fittingType="fill" />
                  ) : (
                    <AvatarFallback className="bg-primary/20 text-primary text-2xl">{initials}</AvatarFallback>
                  )}
                </Avatar>
                <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full am-gradient flex items-center justify-center cursor-pointer shadow-lg">
                  <Pencil className="w-4 h-4 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
                </label>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="profile-name">Nome</Label>
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="O teu nome" className="bg-white/5" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>

            <div className="space-y-2 mt-3">
              <Label htmlFor="profile-bio">Bio</Label>
              <Textarea id="profile-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Conta algo sobre ti..." className="bg-white/5" />
            </div>

            <Button onClick={save} disabled={saving} className="w-full am-gradient mt-4">
              {saving ? "A guardar..." : "Guardar"}
            </Button>

            <div className="pt-2 mt-2 border-t border-border">
              <button onClick={() => setReportOpen(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                <Mail className="w-4 h-4" /> Reportar um problema
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reportar um problema</DialogTitle>
            <DialogDescription>Conta-nos o que aconteceu. Vamos enviar-te uma cópia por email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea value={reportText} onChange={(e) => setReportText(e.target.value)} rows={4} placeholder="Descreve o problema..." className="bg-white/5" />
          </div>
          <Button onClick={sendReport} disabled={sendingReport || !reportText.trim()} className="w-full am-gradient">
            <Send className="w-4 h-4 mr-2" /> {sendingReport ? "A enviar..." : "Enviar reporte"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}