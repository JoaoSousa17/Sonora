import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Radio as RadioIcon, Play, Pause, Search, Check, Settings2 } from "lucide-react";
import { usePlayer } from "@/lib/PlayerContext";
import { getRecommendations, shuffleArray } from "@/lib/recommendations";
import { portugueseRadios } from "@/lib/radioStations";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SectionDivider from "@/components/SectionDivider";

const RADIO_IMG = "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/21122dfe9_generated_image.png";
const DEFAULT_COVER = "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/7b42e49a9_generated_image.png";

const GENRE_IMAGES = {
  "Pop": "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/27c21ef21_generated_image.png",
  "Hip-Hop": "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/fc3446b7d_generated_image.png",
  "Rock": "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/124c3343a_generated_image.png",
  "Eletrónica": "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/29b77e88a_generated_image.png",
  "Jazz": "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/b22ab6961_generated_image.png",
  "Clássica": "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/bd56e8904_generated_image.png",
  "R&B": "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/3d1d95504_generated_image.png",
  "Pimba": "https://media.base44.com/images/public/6a8c4ea3002847a8f3279fcb/a89186a42_generated_image.png",
};

const genreStations = [
  { name: "Hits", genre: "Pop" },
  { name: "Hip-Hop", genre: "Hip-Hop" },
  { name: "Rock", genre: "Rock" },
  { name: "Eletrónica", genre: "Eletrónica" },
  { name: "Jazz", genre: "Jazz" },
  { name: "Clássica", genre: "Clássica" },
  { name: "R&B", genre: "R&B" },
  { name: "Português", genre: "Pimba" },
];

const SELECT_KEY = "sonora:selected-radios";

function CardBg({ src }) {
  return (
    <>
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
    </>
  );
}

export default function Radio() {
  const { playQueue, pause } = usePlayer();
  const [allStations, setAllStations] = useState(portugueseRadios);
  const [selected, setSelected] = useState([]);
  const [draft, setDraft] = useState([]);
  const [liveStation, setLiveStation] = useState(null);
  const [livePlaying, setLivePlaying] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dbGenres, setDbGenres] = useState([]);
  const liveAudioRef = useRef(null);

  useEffect(() => {
    fetch("https://de1.api.radio-browser.info/json/stations/search?countrycode=PT&order=clickcount&reverse=true&limit=80&hidebroken=true")
      .then((r) => r.json())
      .then((data) => {
        const usable = (data || []).filter((s) => {
          const u = s.url_resolved || s.url || "";
          return u && !u.includes("m3u8");
        }).map((s) => ({
          name: (s.name || "Rádio").trim(),
          stream: s.url_resolved || s.url,
          favicon: s.favicon || "",
          desc: [s.bitrate ? s.bitrate + " kbps" : "", s.codec].filter(Boolean).join(" · "),
        }));
        if (usable.length) setAllStations(usable);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    base44.entities.Song.list("-play_count", 500).then((songs) => {
      setDbGenres([...new Set(songs.map((s) => s.genre).filter(Boolean))]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SELECT_KEY) || "[]");
      const byName = Object.fromEntries(allStations.map((s) => [s.name, s]));
      const restored = saved.map((n) => byName[n]).filter(Boolean);
      if (restored.length === 5) setSelected(restored);
      else setSelected(allStations.slice(0, 5));
    } catch {
      setSelected(allStations.slice(0, 5));
    }
  }, [allStations]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    liveAudioRef.current = audio;
    const onPlay = () => setLivePlaying(true);
    const onPause = () => setLivePlaying(false);
    audio.addEventListener("playing", onPlay);
    audio.addEventListener("pause", onPause);
    const onSong = () => { audio.pause(); setLiveStation(null); };
    window.addEventListener("music:play-song", onSong);
    return () => {
      audio.pause();
      audio.removeEventListener("playing", onPlay);
      audio.removeEventListener("pause", onPause);
      window.removeEventListener("music:play-song", onSong);
    };
  }, []);

  const playLive = async (station) => {
    const audio = liveAudioRef.current;
    if (!audio) return;
    pause();
    if (liveStation?.name === station.name && livePlaying) { audio.pause(); return; }
    audio.src = station.stream;
    setLiveStation(station);
    try { await audio.play(); } catch (e) {}
  };

  const stopLive = () => {
    const audio = liveAudioRef.current;
    if (audio) { audio.pause(); audio.src = ""; }
    setLiveStation(null);
  };

  const playStation = async (genre) => {
    stopLive();
    const recs = await getRecommendations({ seed_type: "genre", seed_id: genre, limit: 50 });
    if (recs.length) playQueue(shuffleArray(recs), 0);
  };

  const playAppleMusic1 = async () => {
    stopLive();
    const all = await base44.entities.Song.list("-play_count", 500).catch(() => []);
    if (all.length) playQueue(shuffleArray(all), 0);
  };

  const openPicker = () => { setDraft(selected); setSearch(""); setPickerOpen(true); };
  const togglePick = (station) => {
    setDraft((cur) => {
      if (cur.some((s) => s.name === station.name)) return cur.filter((s) => s.name !== station.name);
      if (cur.length >= 5) return cur;
      return [...cur, station];
    });
  };
  const savePicks = () => {
    const finalList = draft.length === 5 ? draft : [...draft, ...allStations.filter((s) => !draft.some((d) => d.name === s.name))].slice(0, 5);
    setSelected(finalList);
    localStorage.setItem(SELECT_KEY, JSON.stringify(finalList.map((s) => s.name)));
    setPickerOpen(false);
  };

  const filtered = allStations.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const extraGenres = dbGenres.filter((g) => !genreStations.some((gs) => gs.genre === g));

  return (
    <div className="pb-10">
      <div className="px-6 md:px-10 pt-8 pb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">Estações ao vivo e para todos os gostos</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Rádio</h1>
        </div>
        <Button onClick={openPicker} className="am-gradient rounded-full shadow-lg shadow-primary/30">
          <Settings2 className="w-4 h-4 mr-2" /> Selecionar rádios
        </Button>
      </div>

      {/* Portuguese live radios */}
      <div className="px-6 md:px-10 mb-14">
        <h2 className="text-xl font-bold mb-3">Rádios portuguesas ao vivo</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {selected.map((r) => {
            const active = liveStation?.name === r.name;
            return (
              <button key={r.name} onClick={() => playLive(r)} className="relative rounded-2xl h-40 overflow-hidden text-left hover:opacity-95 transition-opacity">
                <CardBg src={RADIO_IMG} />
                <div className="relative p-4 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden flex-shrink-0">
                      {r.favicon ? <img src={r.favicon} alt="" className="w-full h-full object-cover" /> : <RadioIcon className="w-5 h-5 text-white/90" />}
                    </div>
                    {active && livePlaying && (
                      <div className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 bg-white/90 animate-pulse" style={{ height: "6px" }} />
                        <span className="w-0.5 bg-white/90 animate-pulse" style={{ height: "10px" }} />
                        <span className="w-0.5 bg-white/90 animate-pulse" style={{ height: "8px" }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-bold truncate drop-shadow">{r.name}</p>
                    <p className="text-white/70 text-xs truncate">{r.desc || "Rádio"}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {liveStation && (
          <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <button onClick={() => (livePlaying ? liveAudioRef.current?.pause() : liveAudioRef.current?.play())} className="w-10 h-10 rounded-full am-gradient flex items-center justify-center flex-shrink-0">
              {livePlaying ? <Pause className="w-5 h-5 fill-white text-white" /> : <Play className="w-5 h-5 fill-white text-white ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{liveStation.name} <span className="text-xs text-primary">· em direto</span></p>
              <p className="text-xs text-muted-foreground truncate">{liveStation.desc}</p>
            </div>
            <button onClick={stopLive} className="text-xs text-muted-foreground hover:text-foreground">Parar</button>
          </div>
        )}
      </div>

      {/* Sonora 1 */}
      <div className="px-6 md:px-10 mb-14">
        <SectionDivider icon={RadioIcon} />
        <h2 className="text-xl font-bold mb-3">A tua estação principal</h2>
        <button onClick={playAppleMusic1} className="relative w-full rounded-2xl h-40 md:h-48 overflow-hidden text-left hover:opacity-95 transition-opacity">
          <CardBg src={RADIO_IMG} />
          <div className="relative p-6 h-full flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
              <RadioIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-xl drop-shadow">Sonora 1</p>
              <p className="text-white/80 text-sm drop-shadow">A estação que nunca para — o melhor do teu catálogo, sempre em shuffle.</p>
            </div>
          </div>
        </button>
      </div>

      {/* Genre stations */}
      <div className="px-6 md:px-10">
        <SectionDivider icon={RadioIcon} />
        <h2 className="text-xl font-bold mb-3">Estações por género</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {genreStations.map((s) => (
            <button key={s.name} onClick={() => playStation(s.genre)} className="relative rounded-2xl h-32 overflow-hidden text-left hover:opacity-95 transition-opacity">
              <CardBg src={GENRE_IMAGES[s.genre] || DEFAULT_COVER} />
              <div className="relative p-4 h-full flex flex-col justify-end">
                <p className="text-white font-bold text-lg drop-shadow">{s.name}</p>
                <p className="text-white/70 text-xs">Rádio</p>
              </div>
            </button>
          ))}
          {extraGenres.map((g) => (
            <button key={g} onClick={() => playStation(g)} className="relative rounded-2xl h-32 overflow-hidden text-left hover:opacity-95 transition-opacity">
              <CardBg src={DEFAULT_COVER} />
              <div className="relative p-4 h-full flex flex-col justify-end">
                <p className="text-white font-bold text-lg drop-shadow">{g}</p>
                <p className="text-white/70 text-xs">Rádio</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <div className="am-gradient px-6 py-5">
            <DialogTitle className="text-white text-xl font-bold flex items-center gap-2"><Settings2 className="w-5 h-5" /> Selecionar rádios</DialogTitle>
            <p className="text-white/80 mt-1 text-sm">Escolhe até 5 estações para o teu painel.</p>
          </div>
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Procurar rádios..." className="pl-9 bg-white/5 rounded-full" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {filtered.map((s) => {
              const picked = draft.some((d) => d.name === s.name);
              const disabled = !picked && draft.length >= 5;
              return (
                <button key={s.name} onClick={() => togglePick(s)} disabled={disabled} className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${picked ? "bg-primary/15" : "hover:bg-white/5"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
                  <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {s.favicon ? <img src={s.favicon} alt="" className="w-full h-full object-cover" /> : <RadioIcon className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.desc || "Rádio"}</p>
                  </div>
                  {picked && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between p-4 border-t border-border">
            <span className="text-sm text-muted-foreground">{draft.length}/5 selecionadas</span>
            <Button onClick={savePicks} className="am-gradient">Concluído</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}