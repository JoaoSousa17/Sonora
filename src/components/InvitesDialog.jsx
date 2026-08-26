import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { Bell, Check, X } from "lucide-react";

export default function InvitesDialog({ open, onOpenChange, onDone }) {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);

  const load = async () => {
    if (!user) return;
    const all = await base44.entities.Friendship.list("-created_date", 200).catch(() => []);
    setIncoming(all.filter((f) => f.status === "pending" && f.created_by_id !== user.id && (f.addressee_email === user.email || f.addressee_id === user.id)));
    setOutgoing(all.filter((f) => f.status === "pending" && f.created_by_id === user.id));
  };

  useEffect(() => { if (open) load(); }, [open, user]);

  const accept = async (f) => {
    try {
      await base44.entities.Friendship.update(f.id, { status: "accepted", addressee_id: user.id });
      toast({ title: "Amigo adicionado" });
      onDone?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao aceitar", variant: "destructive" });
    }
  };
  const decline = async (f) => {
    try { await base44.entities.Friendship.update(f.id, { status: "declined" }); load(); onDone?.(); } catch {}
  };
  const cancel = async (f) => {
    try { await base44.entities.Friendship.delete(f.id); load(); } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="am-gradient px-6 py-5">
          <DialogTitle className="text-white text-xl font-bold flex items-center gap-2"><Bell className="w-5 h-5" /> Convites</DialogTitle>
          <p className="text-white/80 mt-1 text-sm">Gerir pedidos de amizade.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-sm font-bold text-white mb-2">Recebidos</p>
            <div className="h-px bg-border mb-3" />
            {incoming.length === 0 && <p className="text-sm text-muted-foreground">Sem convites.</p>}
            {incoming.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <Avatar className="w-10 h-10"><AvatarFallback>{(f.created_by || f.addressee_email || "?")[0]?.toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.created_by || f.addressee_email}</p>
                  <p className="text-xs text-muted-foreground">Quer ser teu amigo</p>
                </div>
                <button onClick={() => accept(f)} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"><Check className="w-4 h-4" /></button>
                <button onClick={() => decline(f)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-bold text-white mb-2">Enviados</p>
            <div className="h-px bg-border mb-3" />
            {outgoing.length === 0 && <p className="text-sm text-muted-foreground">Sem convites enviados.</p>}
            {outgoing.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <Avatar className="w-10 h-10"><AvatarFallback>{f.addressee_email[0]?.toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.addressee_email}</p>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                </div>
                <button onClick={() => cancel(f)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}