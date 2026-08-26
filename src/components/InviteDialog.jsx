import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { UserPlus, Send } from "lucide-react";

export default function InviteDialog({ open, onOpenChange, onDone }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    if (e === user?.email?.toLowerCase()) {
      toast({ title: "Não podes convidar-te a ti mesmo", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await base44.entities.Friendship.create({ addressee_email: e, status: "pending" });
      try {
        await base44.integrations.Core.SendEmail({
          to: e,
          subject: `${user?.display_name || user?.email || "Alguém"} convidou-te para o Sonora`,
          body: `Olá!\n\n${user?.display_name || user?.email || "Alguém"} convidou-te para ser amigo(a) no Sonora. Entra na app, vai a Amigos → Convites para aceitar.\n\nSonora`,
        });
      } catch {}
      toast({ title: "Convite enviado", description: e });
      setEmail("");
      onOpenChange(false);
      onDone?.();
    } catch {
      toast({ title: "Erro ao enviar convite", variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
        <div className="am-gradient px-6 py-5">
          <DialogTitle className="text-white text-xl font-bold flex items-center gap-2"><UserPlus className="w-5 h-5" /> Adicionar amigo</DialogTitle>
          <p className="text-white/80 mt-1 text-sm">Introduz o email para enviar um convite.</p>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="invite-email" className="text-sm font-medium text-foreground">Email do amigo</Label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-white/5 h-11" onKeyDown={(e) => e.key === "Enter" && send()} />
          </div>
          <Button onClick={send} disabled={sending || !email.trim()} className="w-full am-gradient h-11">
            <Send className="w-4 h-4 mr-2" /> {sending ? "A enviar..." : "Enviar convite"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}