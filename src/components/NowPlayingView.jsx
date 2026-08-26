import React, { useState, useEffect } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  ChevronDown, Heart, ListMusic, MoreHorizontal, Radio, Clock, Mic2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "@/lib/PlayerContext";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LyricsPanel from "@/components/LyricsPanel";

const tabs = [
  { id: "upnext", label: "A seguir" },
  { id: "lyrics", label: "Letras" },
  { id: "recent", label: "Recentes" },
];

function fmt(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NowPlayingView() {
  const {
    currentSong, isPlaying, togglePlay, next, prev, currentTime, duration,
    seek, shuffle, toggleShuffle, repeat, cycleRepeat, showNowPlaying,
    setShowNowPlaying, queue, currentIndex, upNext, startRadio,
  } = usePlayer();
  const [loved, setLoved] = useState(false);
  const [tab, setTab] = useState("upnext");
  const [karaoke, setKaraoke] = useState(true);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    if (!currentSong) return setLoved(false);
    base44.entities.Favorite.filter({ song_id: currentSong.id }, "-added_at", 1)
      .then((f) => setLoved(f.length > 0)).catch(() => {});
  }, [currentSong?.id]);

  useEffect(() => {
    if (tab !== "recent") return;
    base44.entities.ListeningHistory.list("-played_at", 20).then((h) => {
      const seen = new Set();
      const dedup = (h || []).filter((x) => (seen.has(x.song_id) ? false : (seen.add(x.song_id), true)));
      setRecent(dedup.slice(0, 10));
    }).catch(() => {});
  }, [tab]);

  if (!showNowPlaying || !currentSong) return null;

  const toggleLove = async () => {
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
      }
    } catch (e) {}
  };

  const upcoming = upNext.length > 0 ? upNext : queue.slice(currentIndex + 1, currentIndex + 6);

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 -z-10">
        {currentSong.cover_url ? (
          <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover blur-3xl scale-125" />
        ) : (
          <div className="w-full h-full am-gradient" />
        )}
        <div className="absolute inset-0 bg-background/70 backdrop-blur-2xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4">
        <button onClick={() => setShowNowPlaying(false)} className="text-muted-foreground hover:text-foreground p-2">
          <ChevronDown className="w-6 h-6" />
        </button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">A reproduzir a partir de</p>
          <Link to={`/artist/${currentSong.artist_id}`} className="text-sm font-medium hover:underline">{currentSong.artist_name || "—"}</Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground p-2"><MoreHorizontal className="w-6 h-6" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={toggleLove}><Heart className="w-4 h-4 mr-2" /> {loved ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => startRadio(currentSong)}><Radio className="w-4 h-4 mr-2" /> Criar estação de rádio</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 md:gap-12 px-6 md:px-16 pb-6 overflow-hidden">
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="w-full max-w-md aspect-square rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            {currentSong.cover_url ? (
              <Image src={currentSong.cover_url} className="w-full h-full object-cover" fittingType="fill" />
            ) : (
              <div className="w-full h-full am-gradient flex items-center justify-center text-white/30 text-9xl">♪</div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 md:max-w-md">
          <div className="mb-3">
            <h2 className="text-2xl md:text-3xl font-bold truncate">{currentSong.title}</h2>
            <Link to={`/artist/${currentSong.artist_id}`} className="text-lg text-primary hover:underline">{currentSong.artist_name}</Link>
            {currentSong.album_title && <p className="text-sm text-muted-foreground mt-1">{currentSong.album_title}</p>}
          </div>

          <button onClick={toggleLove} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 self-start">
            <Heart className={`w-5 h-5 ${loved ? "fill-primary text-primary" : ""}`} />
            {loved ? "Nos teus Favoritos" : "Adicionar aos Favoritos"}
          </button>

          <div className="flex gap-1 mb-3 border-b border-border">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t.label}</button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {tab === "upnext" && (
              <div>
                <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wide text-muted-foreground"><ListMusic className="w-4 h-4" /> A seguir</div>
                <div className="space-y-1">
                  {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Fila vazia</p>}
                  {upcoming.map((s, i) => (
                    <div key={s.id + i} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5">
                      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">{s.cover_url && <Image src={s.cover_url} className="w-full h-full object-cover" fittingType="fill" />}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.artist_name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{fmt(s.duration_seconds)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "lyrics" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Mic2 className="w-4 h-4" /> Letra</div>
                  <button onClick={() => setKaraoke((k) => !k)} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors ${karaoke ? "am-gradient text-white" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}>
                    <Mic2 className="w-3.5 h-3.5" /> Karaoke
                  </button>
                </div>
                <LyricsPanel song={currentSong} currentTime={currentTime} duration={duration} karaoke={karaoke} />
              </div>
            )}

            {tab === "recent" && (
              <div>
                <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wide text-muted-foreground"><Clock className="w-4 h-4" /> Tocadas recentemente</div>
                <div className="space-y-1">
                  {recent.length === 0 && <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>}
                  {recent.map((s, i) => (
                    <div key={s.id + i} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5">
                      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">{s.cover_url && <Image src={s.cover_url} className="w-full h-full object-cover" fittingType="fill" />}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{s.song_title}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.artist_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 md:px-16 pb-8 pt-2">
        <div className="max-w-3xl mx-auto">
          <Slider value={[currentTime]} max={duration || 100} step={1} onValueChange={(v) => seek(v[0])} />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{fmt(currentTime)}</span>
            <span>-{fmt(Math.max(0, duration - currentTime))}</span>
          </div>
          <div className="flex items-center justify-center gap-6 md:gap-10 mt-4">
            <button onClick={toggleShuffle} className={`${shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}><Shuffle className="w-5 h-5" /></button>
            <button onClick={prev} className="text-foreground hover:text-primary"><SkipBack className="w-7 h-7 fill-current" /></button>
            <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
              {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
            </button>
            <button onClick={next} className="text-foreground hover:text-primary"><SkipForward className="w-7 h-7 fill-current" /></button>
            <button onClick={cycleRepeat} className={`${repeat !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>{repeat === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}</button>
          </div>
        </div>
      </div>
    </div>
  );
}