import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { Flame, Clock, Music2, Headphones } from "lucide-react";

const periods = [
  { id: "week", label: "Semana", days: 7 },
  { id: "month", label: "Mês", days: 30 },
  { id: "year", label: "Ano", days: 365 },
];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 flex flex-col justify-between h-28`}>
      <Icon className="w-6 h-6 text-white/80" />
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-white/70 text-xs">{label}</p>
      </div>
    </div>
  );
}

export default function Statistics() {
  const [period, setPeriod] = useState("week");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ListeningHistory.list("-played_at", 500)
      .then((h) => {
        setHistory(h || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const days = periods.find((p) => p.id === period).days;
  const cutoff = Date.now() - days * 86400000;
  const filtered = history.filter((h) => new Date(h.played_at).getTime() >= cutoff);

  const byArtist = {};
  const bySong = {};
  filtered.forEach((h) => {
    if (h.artist_name) byArtist[h.artist_name] = (byArtist[h.artist_name] || 0) + 1;
    const key = h.song_id || h.song_title;
    if (!bySong[key]) bySong[key] = { ...h, count: 0 };
    bySong[key].count++;
  });
  const topArtists = Object.entries(byArtist).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topSongs = Object.values(bySong).sort((a, b) => b.count - a.count).slice(0, 5);
  const totalPlays = filtered.length;
  const totalMinutes = Math.round(totalPlays * 3.4);

  return (
    <div className="pb-10">
      <div className="px-6 md:px-10 pt-10 pb-6">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-1 am-text-gradient">O teu Rewind</h1>
        <p className="text-muted-foreground">Um resumo do que tens ouvido.</p>
      </div>

      <div className="px-6 md:px-10 mb-6">
        <div className="inline-flex gap-1 p-1 rounded-full bg-white/5">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                period === p.id ? "am-gradient text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-10 grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Headphones} label="Músicas ouvidas" value={totalPlays} color="from-pink-500 to-rose-500" />
        <StatCard icon={Clock} label="Minutos" value={totalMinutes} color="from-cyan-500 to-blue-500" />
        <StatCard icon={Music2} label="Artistas" value={Object.keys(byArtist).length} color="from-amber-500 to-orange-500" />
        <StatCard icon={Flame} label="Reproduções" value={totalPlays} color="from-fuchsia-500 to-purple-600" />
      </div>

      {topArtists.length > 0 && (
        <div className="px-6 md:px-10 mb-8">
          <div className="am-gradient rounded-2xl p-6 flex items-center gap-4">
            <Headphones className="w-10 h-10 text-white flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-white/80 text-sm">O teu artista favorito</p>
              <p className="text-white font-bold text-2xl truncate">{topArtists[0][0]}</p>
              <p className="text-white/70 text-sm">{topArtists[0][1]} reproduções</p>
            </div>
          </div>
        </div>
      )}

      {topSongs.length > 0 && (
        <div className="px-6 md:px-10 mb-8">
          <h2 className="text-xl font-bold mb-3">As tuas músicas mais ouvidas</h2>
          <div className="space-y-2">
            {topSongs.map((s, i) => (
              <div key={s.song_id + i} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                <span className="text-2xl font-bold w-8 text-center am-text-gradient">{i + 1}</span>
                <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                  {s.cover_url && <Image src={s.cover_url} className="w-full h-full object-cover" fittingType="fill" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.song_title}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.artist_name}</p>
                </div>
                <span className="text-sm text-muted-foreground">{s.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topArtists.length > 0 && (
        <div className="px-6 md:px-10 mb-8">
          <h2 className="text-xl font-bold mb-3">Artistas em destaque</h2>
          <div className="space-y-2">
            {topArtists.map(([name, count], i) => (
              <div key={name + i} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                <span className="text-sm text-muted-foreground w-6">{i + 1}</span>
                <span className="flex-1 font-medium truncate">{name}</span>
                <span className="text-sm text-muted-foreground">{count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalPlays === 0 && (
        <p className="px-6 md:px-10 text-muted-foreground">Ainda sem dados para este período. Toca algumas músicas!</p>
      )}
    </div>
  );
}