import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Play, Search, Radio, ListMusic, Mic2, Heart, Disc3, Mic, BarChart3, LogOut, Users, Plus, Music2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/lib/PlayerContext";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import ProfileModal from "@/components/ProfileModal";

const navItems = [
  { to: "/", label: "Ouvir agora", icon: Play, end: true },
  { to: "/search", label: "Procurar", icon: Search },
  { to: "/radio", label: "Rádio", icon: Radio },
  { to: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { to: "/amigos", label: "Amigos", icon: Users },
];

const libraryItems = [
  { to: "/library/playlists", label: "Playlists", icon: Music2 },
  { to: "/library/recentes", label: "Recentes", icon: ListMusic },
  { to: "/library/artistas", label: "Artistas", icon: Mic },
  { to: "/library/albuns", label: "Álbuns", icon: Disc3 },
  { to: "/library/favoritos", label: "Favoritos", icon: Heart },
  { to: "/podcasts", label: "Podcasts", icon: Mic2 },
];

export default function Sidebar({ playlists = [] }) {
  const { user, logout } = useAuth();
  const { currentSong, setShowNowPlaying } = usePlayer();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const initials = (user?.display_name || user?.full_name || user?.email || "U").slice(0, 2).toUpperCase();

  const createPlaylist = async () => {
    try {
      const p = await base44.entities.Playlist.create({ title: "Nova playlist", song_ids: [], track_count: 0, is_public: false });
      navigate(`/playlist/${p.id}`);
    } catch { toast({ title: "Erro ao criar playlist", variant: "destructive" }); }
  };

  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-64 h-full bg-sidebar flex-shrink-0">
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-lg font-bold am-text-gradient">Sonora</h1>
      </div>

      <nav className="px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? "text-primary bg-sidebar-accent" : "text-sidebar-foreground hover:text-foreground hover:bg-white/5"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 pt-5 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Biblioteca
      </div>
      <nav className="px-2 space-y-0.5">
        {libraryItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? "text-primary bg-sidebar-accent" : "text-sidebar-foreground hover:text-foreground hover:bg-white/5"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="group px-5 pt-5 pb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Playlists</span>
        <button onClick={createPlaylist} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" title="Nova playlist">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 min-h-0">
        {playlists.length === 0 && (
          <p className="px-3 text-xs text-muted-foreground/60">Sem playlists ainda</p>
        )}
        {playlists.map((p) => (
          <NavLink
            key={p.id}
            to={`/playlist/${p.id}`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm truncate transition-colors ${
                isActive ? "text-primary bg-sidebar-accent" : "text-sidebar-foreground hover:text-foreground hover:bg-white/5"
              }`
            }
          >
            <ListMusic className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{p.title}</span>
          </NavLink>
        ))}
      </div>

      <div className="border-t border-sidebar-border p-3">
        {currentSong && (
          <button
            onClick={() => setShowNowPlaying(true)}
            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors mb-2"
          >
            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
              {currentSong.cover_url && <Image src={currentSong.cover_url} className="w-full h-full object-cover" fittingType="fill" />}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-medium truncate">{currentSong.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentSong.artist_name}</p>
            </div>
          </button>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 flex-1 min-w-0 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            <Avatar className="w-8 h-8 flex-shrink-0">
              {user?.photo_url ? (
                <Image src={user.photo_url} className="w-full h-full object-cover" fittingType="fill" />
              ) : (
                <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.display_name || user?.full_name || user?.email}</p>
              <span className="text-xs text-muted-foreground">Ver perfil</span>
            </div>
          </button>
          <button
            onClick={() => logout()}
            title="Terminar sessão"
            className="w-8 h-8 rounded-full border border-sidebar-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </aside>
  );
}