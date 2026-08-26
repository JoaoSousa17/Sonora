import React, { useState, useEffect } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, Volume1, VolumeX, ChevronUp, Heart, Mic2, Disc3, Airplay,
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "@/lib/PlayerContext";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";

function fmt(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlayerBar() {
  const {
    currentSong, isPlaying, togglePlay, next, prev, currentTime, duration,
    seek, volume, setVolume, shuffle, toggleShuffle, repeat, cycleRepeat,
    setShowNowPlaying, startRadio, djMode, toggleDjMode, showAirplayPicker,
  } = usePlayer();
  const [loved, setLoved] = useState(false);

  useEffect(() => {
    if (!currentSong) return setLoved(false);
    base44.entities.Favorite.filter({ song_id: currentSong.id }, "-added_at", 1)
      .then((f) => setLoved(f.length > 0))
      .catch(() => {});
  }, [currentSong?.id]);

  const toggleLove = async (e) => {
    e.stopPropagation();
    if (!currentSong) return;
    try {
      if (loved) {
        await base44.entities.Favorite.deleteMany({ song_id: currentSong.id });
        setLoved(false);
      } else {
        await base44.entities.Favorite.create({
          song_id: currentSong.id, song_title: currentSong.title, artist_name: currentSong.artist_name,
          cover_url: currentSong.cover_url, added_at: new Date().toISOString(),
        });
        setLoved(true);
        toast({ title: "Adicionado aos Favoritos" });
      }
    } catch (e) {}
  };

  if (!currentSong) return null;

  const VolIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const openNowPlaying = () => setShowNowPlaying(true);
  const stop = (e) => e.stopPropagation();

  return (
    <div onClick={openNowPlaying} className="relative h-16 md:h-20 border-t border-border bg-card/90 backdrop-blur-xl px-3 md:px-6 flex items-center gap-3 md:gap-6 cursor-pointer">
      {/* Left: song info */}
      <div className="flex items-center gap-3 w-1/4 min-w-0">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-md overflow-hidden flex-shrink-0">
          {currentSong.cover_url && <Image src={currentSong.cover_url} className="w-full h-full object-cover" fittingType="fill" />}
        </div>
        <div className="min-w-0 hidden sm:block">
          <p className="text-sm font-medium truncate">{currentSong.title}</p>
          <Link to={`/artist/${currentSong.artist_id}`} onClick={stop} className="text-xs text-muted-foreground hover:underline truncate block">
            {currentSong.artist_name}
          </Link>
        </div>
        <button onClick={toggleLove} className="hidden md:block ml-2">
          <Heart className={`w-4 h-4 ${loved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
      </div>

      {/* Center: controls + progress */}
      <div className="flex-1 flex flex-col items-center gap-1.5 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={(e) => { stop(e); toggleShuffle(); }} className={`hidden sm:block ${shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={(e) => { stop(e); prev(); }} className="text-foreground hover:text-primary">
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          <button onClick={(e) => { stop(e); togglePlay(); }} className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-transform">
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <button onClick={(e) => { stop(e); next(); }} className="text-foreground hover:text-primary">
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
          <button onClick={(e) => { stop(e); cycleRepeat(); }} className={`hidden sm:block ${repeat !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {repeat === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>
        <div className="hidden md:flex items-center gap-2 w-full" onClick={stop}>
          <span className="text-xs text-muted-foreground w-10 text-right">{fmt(currentTime)}</span>
          <Slider value={[currentTime]} max={duration || 100} step={1} onValueChange={(v) => seek(v[0])} className="flex-1" />
          <span className="text-xs text-muted-foreground w-10">{fmt(duration)}</span>
        </div>
      </div>

      {/* Right: volume + expand */}
      <div className="flex items-center gap-3 md:gap-4 w-auto md:w-1/4 justify-end">
        <button onClick={(e) => { stop(e); toggleDjMode(); }} className={`hidden lg:block ${djMode ? "text-primary" : "text-muted-foreground hover:text-foreground"}`} title="Modo DJ — transições suaves">
          <Disc3 className="w-4 h-4" />
        </button>
        <button onClick={(e) => { stop(e); startRadio(currentSong); }} className="hidden lg:block text-muted-foreground hover:text-foreground" title="Criar estação">
          <Mic2 className="w-4 h-4" />
        </button>
        <button onClick={(e) => { stop(e); showAirplayPicker(); }} className="hidden md:block text-muted-foreground hover:text-foreground" title="AirPlay">
          <Airplay className="w-4 h-4" />
        </button>
        <div className="hidden lg:flex items-center gap-2" onClick={stop}>
          <VolIcon className="w-4 h-4 text-muted-foreground" />
          <Slider value={[volume * 100]} max={100} step={1} onValueChange={(v) => setVolume(v[0] / 100)} className="w-24" />
        </div>
        <button onClick={(e) => { stop(e); openNowPlaying(); }} className="text-muted-foreground hover:text-foreground">
          <ChevronUp className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}