import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Music2, Mic2 } from "lucide-react";

export default function LyricsPanel({ song, currentTime = 0, duration = 0, karaoke = false }) {
  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef(null);

  useEffect(() => {
    if (!song) return;
    let cancelled = false;
    setLoading(true);
    setLyrics(null);
    base44.integrations.Core.InvokeLLM({
      prompt: `Devolve a letra completa da música "${song.title}" de ${song.artist_name}. Se não souberes a letra exata, escreve um pequeno texto sobre a música e o seu significado. Responde apenas com o texto, em português, sem introduções nem comentários.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
    })
      .then((res) => {
        if (cancelled) return;
        const text = typeof res === "string" ? res : res?.response || res?.text || "Letra não disponível.";
        setLyrics(text);
      })
      .catch(() => { if (!cancelled) setLyrics("Não foi possível carregar a letra."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [song?.id]);

  const lines = lyrics ? lyrics.split("\n").filter((l) => l.trim().length > 0) : [];
  const activeIndex = karaoke && duration > 0 && lines.length > 0
    ? Math.min(lines.length - 1, Math.floor((currentTime / duration) * lines.length))
    : -1;

  useEffect(() => {
    if (karaoke && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex, karaoke]);

  if (loading) {
    return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Music2 className="w-4 h-4" /> Letra · {song?.title}
      </div>
      {karaoke ? (
        <div className="space-y-2">
          {lines.map((line, i) => (
            <p
              key={i}
              ref={i === activeIndex ? activeRef : null}
              className={`leading-relaxed font-body transition-all duration-300 ${
                i === activeIndex
                  ? "text-2xl font-bold text-primary scale-[1.02]"
                  : i < activeIndex
                    ? "text-sm text-muted-foreground/50"
                    : "text-base text-muted-foreground"
              }`}
            >
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed font-body text-foreground/90">{lyrics}</p>
      )}
    </div>
  );
}