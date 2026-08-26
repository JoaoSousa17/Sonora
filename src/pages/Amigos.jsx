import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Users, UserPlus, Bell, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Image } from "@/components/ui/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import InviteDialog from "@/components/InviteDialog";
import InvitesDialog from "@/components/InvitesDialog";
import FriendProfileModal from "@/components/FriendProfileModal";

export default function Amigos() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [shareActivity, setShareActivity] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const friendships = await base44.entities.Friendship.list("-created_date", 200).catch(() => []);
      const accepted = friendships.filter((f) => f.status === "accepted");
      const friendIds = accepted
        .map((f) => (f.created_by_id === user.id ? f.addressee_id : f.created_by_id))
        .filter(Boolean);
      const pendingIncoming = friendships.filter(
        (f) => f.status === "pending" && f.created_by_id !== user.id && (f.addressee_email === user.email || f.addressee_id === user.id)
      );
      setPendingCount(pendingIncoming.length);

      const [profiles, activities] = await Promise.all([
        base44.entities.Profile.list("-created_date", 200).catch(() => []),
        base44.entities.FriendActivity.list("-created_date", 100).catch(() => []),
      ]);
      const profileMap = {};
      profiles.forEach((p) => { profileMap[p.created_by_id] = p; });
      const activityMap = {};
      activities.forEach((a) => {
        if (!activityMap[a.created_by_id] || new Date(a.created_date) > new Date(activityMap[a.created_by_id].created_date)) {
          activityMap[a.created_by_id] = a;
        }
      });

      const friendsData = friendIds.map((id) => {
        const p = profileMap[id] || {};
        return { id, name: p.display_name || "Amigo", photo: p.photo_url, bio: p.bio, cover: p.cover_photo_url, activity: activityMap[id] };
      });
      setFriends(friendsData);
      setShareActivity(user.share_activity !== false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const u1 = base44.entities.FriendActivity.subscribe(() => load());
    const u2 = base44.entities.Friendship.subscribe(() => load());
    return () => { try { u1?.(); u2?.(); } catch {} };
  }, [load]);

  const toggleShare = async (checked) => {
    setShareActivity(checked);
    try {
      await base44.auth.updateMe({ share_activity: checked });
      if (!checked && user) {
        const mine = await base44.entities.FriendActivity.filter({ created_by_id: user.id }, "-created_date", 50).catch(() => []);
        if (mine.length) await base44.entities.FriendActivity.deleteMany({ id: { $in: mine.map((m) => m.id) } }).catch(() => {});
      }
      toast({ title: checked ? "Atividade partilhada" : "Atividade ocultada" });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  return (
    <div className="pb-10">
      <div className="px-6 md:px-10 pt-8 pb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold">Amigos</h1>
          <p className="text-sm text-muted-foreground mt-2">Vê o que os teus amigos estão a ouvir.</p>
        </div>
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium whitespace-nowrap">Partilhar atividade</span>
            <Switch checked={shareActivity} onCheckedChange={toggleShare} />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setInvitesOpen(true)} variant="outline" className="rounded-full relative">
              <Bell className="w-4 h-4 mr-2" /> Convites
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{pendingCount}</span>
              )}
            </Button>
            <Button onClick={() => setInviteOpen(true)} className="am-gradient rounded-full">
              <UserPlus className="w-4 h-4 mr-2" /> Adicionar amigo
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10">
        {loading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : friends.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Ainda não tens amigos no Sonora.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Adiciona amigos com o botão acima.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <button key={f.id} onClick={() => setSelectedFriend(f)} className="w-full flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left">
                <Avatar className="w-12 h-12 flex-shrink-0">
                  {f.photo ? <Image src={f.photo} className="w-full h-full object-cover" fittingType="fill" /> : <AvatarFallback>{f.name[0]?.toUpperCase()}</AvatarFallback>}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{f.name}</p>
                  {f.activity ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Music2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{f.activity.is_playing ? "A ouvir" : "Ouviu"} {f.activity.song_title} • {f.activity.artist_name}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/60">Sem atividade recente</p>
                  )}
                </div>
                {f.activity?.cover_url && <Image src={f.activity.cover_url} className="w-10 h-10 rounded-md flex-shrink-0" fittingType="fill" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onDone={load} />
      <InvitesDialog open={invitesOpen} onOpenChange={setInvitesOpen} onDone={load} />
      <FriendProfileModal friend={selectedFriend} open={!!selectedFriend} onOpenChange={(o) => !o && setSelectedFriend(null)} />
    </div>
  );
}