import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Play, Mic2, Compass, Search, Plus, Check } from "lucide-react";
import { usePlayer } from "@/lib/PlayerContext";
import { Image } from "@/components/ui/image";
import MediaCard from "@/components/MediaCard";
import EmptyState from "@/components/EmptyState";
import SkeletonFiller from "@/components/SkeletonFiller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import LibraryPagination from "@/components/LibraryPagination";
import InterviewsSection from "@/components/InterviewsSection";

export default function Podcasts() {
  const { id } = useParams();
  const { playQueue } = usePlayer();
  const [podcasts, setPodcasts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;

  const loadPodcasts = () => {
    base44.entities.Podcast.list("-created_date", 100).then((p) => setPodcasts(p || [])).catch(() => {});
  };

  useEffect(() => {
    loadPodcasts();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (id) {
      Promise.all([
        base44.entities.Podcast.get(id).catch(() => null),
        base44.entities.PodcastEpisode.filter({ podcast_id: id }, "-publish_date", 100).catch(() => []),
      ]).then(([p, eps]) => { setSelected(p); setEpisodes(eps || []); });
    }
  }, [id]);

  const openExplore = () => { setExploreOpen(true); setSearch(""); setResults([]); };

  const doSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(search)}&media=podcast&limit=30`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      toast({ title: "Não foi possível pesquisar", description: "Verifica a ligação e tenta novamente.", variant: "destructive" });
    }
    setSearching(false);
  };

  const addPodcast = async (r) => {
    setAdding(r.trackId);
    try {
      await base44.entities.Podcast.create({
        title: r.trackName,
        author: r.artistName || "Desconhecido",
        cover_url: r.artworkUrl600 || r.artworkUrl100 || "",
        description: r.primaryGenreName || "",
        category: r.primaryGenreName || "",
      });
      toast({ title: "Podcast adicionado", description: r.trackName });
      loadPodcasts();
    } catch {
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    }
    setAdding(null);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  if (id && selected) {
    return (
      <div className="pb-10">
        <div className="px-6 md:px-10 pt-10 pb-6 flex flex-col md:flex-row gap-6 items-end bg-gradient-to-b from-primary/20 to-transparent">
          <div className="w-48 h-48 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
            {selected.cover_url ? (
              <Image src={selected.cover_url} className="w-full h-full object-cover" fittingType="fill" />
            ) : (
              <div className="w-full h-full am-gradient flex items-center justify-center"><Mic2 className="w-16 h-16 text-white/40" /></div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Podcast</p>
            <h1 className="text-3xl md:text-6xl font-bold tracking-tight mb-2">{selected.title}</h1>
            <p className="text-primary">{selected.author}</p>
            {selected.description && <p className="text-muted-foreground mt-2 max-w-xl">{selected.description}</p>}
          </div>
        </div>

        <div className="px-4 md:px-6 mt-6 space-y-1">
          <h2 className="text-xl font-bold mb-3 px-2">Episódios</h2>
          {episodes.length === 0 && <p className="px-4 text-muted-foreground">Sem episódios.</p>}
          {episodes.map((ep) => (
            <div key={ep.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5">
              <button onClick={() => playQueue([ep], 0)} className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center flex-shrink-0">
                <Play className="w-4 h-4 fill-current" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ep.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{ep.description}</p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{ep.publish_date}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <div className="px-6 md:px-10 pt-8 pb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">Descobre novos episódios</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Podcasts</h1>
        </div>
        <Button onClick={openExplore} className="am-gradient rounded-full shadow-lg shadow-primary/30">
          <Compass className="w-4 h-4 mr-2" /> Explorar podcasts
        </Button>
      </div>

      {podcasts.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title="Ainda não tens podcasts"
          subtitle="Explora novos podcasts e adiciona-os à tua biblioteca."
          action={<Button onClick={openExplore} className="am-gradient rounded-full"><Compass className="w-4 h-4 mr-2" /> Explorar agora</Button>}
        />
      ) : (
        <>
          <div className="px-4 md:px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1">
            {podcasts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => (
              <MediaCard key={p.id} to={`/podcasts/${p.id}`} cover_url={p.cover_url} title={p.title} subtitle={p.author} rounded />
            ))}
          </div>
          {page === 1 && podcasts.length < 18 && <SkeletonFiller variant="card" />}
          <LibraryPagination page={page} pageCount={Math.ceil(podcasts.length / PAGE_SIZE)} onChange={setPage} />
        </>
      )}

      <InterviewsSection />

      <Dialog open={exploreOpen} onOpenChange={setExploreOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <div className="am-gradient px-6 py-5">
            <DialogTitle className="text-white text-xl font-bold flex items-center gap-2"><Compass className="w-5 h-5" /> Explorar podcasts</DialogTitle>
            <DialogDescription className="text-white/80 mt-1">Pesquisa por tema, nome ou autor e adiciona à tua biblioteca.</DialogDescription>
          </div>

          <div className="p-4 border-b border-border">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="Procurar podcasts..." className="pl-9 bg-white/5 rounded-full" />
              </div>
              <Button onClick={doSearch} disabled={searching} className="am-gradient rounded-full">Procurar</Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {searching && <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}
            {!searching && results.length === 0 && search && <p className="text-sm text-muted-foreground text-center py-6">Sem resultados.</p>}
            {!searching && results.length === 0 && !search && (
              <div className="text-center py-10 text-muted-foreground">
                <Mic2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Começa por pesquisar um tema ou autor.</p>
              </div>
            )}
            {results.map((r) => {
              const exists = podcasts.some((p) => p.title === r.trackName);
              return (
                <div key={r.trackId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                    {r.artworkUrl100 && <img src={r.artworkUrl100} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.trackName}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.artistName} · {r.primaryGenreName}</p>
                  </div>
                  <Button size="sm" onClick={() => addPodcast(r)} disabled={exists || adding === r.trackId} className={`rounded-full ${exists ? "" : "am-gradient"}`} variant={exists ? "secondary" : "default"}>
                    {exists ? <><Check className="w-3.5 h-3.5 mr-1" /> Adicionado</> : adding === r.trackId ? "..." : <><Plus className="w-3.5 h-3.5 mr-1" /> Adicionar</>}
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}