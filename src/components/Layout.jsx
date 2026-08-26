import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { PlayerProvider } from "@/lib/PlayerContext";
import Sidebar from "@/components/Sidebar";
import MobileTabBar from "@/components/MobileTabBar";
import PlayerBar from "@/components/PlayerBar";
import NowPlayingView from "@/components/NowPlayingView";

export default function Layout() {
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    const load = () => base44.entities.Playlist.list("-updated_date", 100).then(setPlaylists).catch(() => {});
    load();
    const unsubscribe = base44.entities.Playlist.subscribe((event) => {
      if (event.type === "create") {
        setPlaylists((prev) => [event.data, ...prev.filter((p) => p.id !== event.data.id)]);
      } else if (event.type === "update") {
        setPlaylists((prev) => prev.map((p) => (p.id === event.data.id ? event.data : p)));
      } else if (event.type === "delete") {
        setPlaylists((prev) => prev.filter((p) => p.id !== event.data.id));
      }
    });
    return unsubscribe;
  }, []);

  return (
    <PlayerProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar playlists={playlists} />
        <div className="hidden md:block w-px self-stretch bg-gradient-to-b from-transparent via-primary/80 to-transparent shadow-[0_0_8px_rgba(230,57,112,0.4)]" />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            <Outlet />
          </main>
          <PlayerBar />
        </div>
      </div>
      <NowPlayingView />
      <MobileTabBar />
    </PlayerProvider>
  );
}