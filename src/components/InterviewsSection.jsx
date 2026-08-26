import React, { useState, useEffect } from "react";
import { Search, Mic2, ExternalLink, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SectionDivider from "@/components/SectionDivider";
import { toast } from "@/components/ui/use-toast";

const CURATED = ["Elon Musk", "Sam Altman", "Satya Nadella", "Reid Hoffman", "Brian Chesky", "Patrick Collison"];

async function searchInterviews(name) {
  const term = encodeURIComponent(`${name} interview`);
  const res = await fetch(`https://itunes.apple.com/search?term=${term}&media=podcast&limit=15`);
  if (!res.ok) throw new Error("fetch failed");
  const data = await res.json();
  return (data.results || []).filter((r) => r.trackName || r.collectionName);
}

function isRecent(dateStr, months = 1) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return d >= cutoff;
}

function fmtDate(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return ""; }
}

function PodCard({ r }) {
  const title = r.trackName || r.collectionName;
  const author = r.artistName || "";
  const cover = r.artworkUrl600 || r.artworkUrl100 || "";
  const url = r.trackViewUrl || r.collectionViewUrl || "";
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
        {cover && <img src={cover} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{author}</p>
        <p className="text-xs text-muted-foreground/70">{fmtDate(r.releaseDate)}</p>
      </div>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0">
          <ExternalLink className="w-3.5 h-3.5" /> Abrir
        </a>
      )}
    </div>
  );
}

export default function InterviewsSection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recs, setRecs] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const all = [];
      for (const name of CURATED) {
        try {
          const r = await searchInterviews(name);
          for (const pod of r) {
            if (isRecent(pod.releaseDate, 1)) all.push(pod);
          }
        } catch { /* ignore */ }
      }
      if (active) { setRecs(all.slice(0, 12)); setLoadingRecs(false); }
    })();
    return () => { active = false; };
  }, []);

  const doSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const r = await searchInterviews(query.trim());
      setResults(r);
    } catch {
      toast({ title: "Não foi possível pesquisar", variant: "destructive" });
    }
    setSearching(false);
  };

  return (
    <div className="px-6 md:px-10 mt-14">
      <SectionDivider icon={Mic2} />
      <h2 className="text-xl md:text-2xl font-bold mb-1">Entrevistas</h2>
      <p className="text-sm text-muted-foreground mb-4">Digita o nome de uma pessoa e encontra entrevistas para ouvir.</p>

      <div className="flex gap-2 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="Ex.: Elon Musk, Sam Altman..." className="pl-9 bg-white/5 rounded-full" />
        </div>
        <Button onClick={doSearch} disabled={searching} className="am-gradient rounded-full">
          {searching ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />} Procurar
        </Button>
      </div>

      {searched && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Resultados para “{query}”</h3>
          {searching && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
          {!searching && results.length === 0 && <p className="text-sm text-muted-foreground">Sem entrevistas encontradas.</p>}
          {!searching && results.length > 0 && (
            <div className="space-y-1">{results.slice(0, 8).map((r, i) => <PodCard key={r.trackId || i} r={r} />)}</div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recomendadas para ti · business & startups</h3>
        {loadingRecs && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
        {!loadingRecs && recs.length === 0 && <p className="text-sm text-muted-foreground">Sem entrevistas recentes (último mês) de momento.</p>}
        {!loadingRecs && recs.length > 0 && (
          <div className="space-y-1">{recs.map((r, i) => <PodCard key={r.trackId || i} r={r} />)}</div>
        )}
      </div>
    </div>
  );
}