import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Music, Disc, Mic2, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { searchSongs, searchAlbums } from '@/api/musicCatalog';
import { usePlayer } from '@/lib/PlayerContext';
import SongRow from '@/components/SongRow';
import MediaCard from '@/components/MediaCard';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const { playTrack, currentTrack, isPlaying } = usePlayer();

  // Executa a pesquisa com debounce de 350ms para não sobrecarregar
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSongs([]);
      setAlbums([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const [songsRes, albumsRes] = await Promise.all([
          searchSongs(searchTerm, 30),
          searchAlbums(searchTerm, 12)
        ]);
        setSongs(songsRes || []);
        setAlbums(albumsRes || []);
      } catch (err) {
        console.error('Erro ao efetuar busca:', err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleClear = () => {
    setSearchTerm('');
    setSearchParams({});
    setSongs([]);
    setAlbums([]);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val) {
      setSearchParams({ q: val });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 pb-32 text-slate-100">
      {/* Barra de Pesquisa Estilo Apple Music */}
      <div className="relative max-w-2xl mb-8">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Artistas, músicas, álbuns..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full pl-12 pr-10 py-6 text-lg bg-slate-900/80 border-slate-700/60 rounded-xl focus:border-red-500 focus:ring-red-500 transition-all text-white placeholder:text-slate-500"
          autoFocus
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Estado de Carregamento */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-red-500" />
          <span>A procurar no catálogo...</span>
        </div>
      )}

      {/* Vista Sem Termo de Pesquisa */}
      {!searchTerm.trim() && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Music className="h-16 w-16 stroke-[1.2] mb-4 opacity-40" />
          <p className="text-lg font-medium">Explora milhões de músicas e álbuns</p>
          <p className="text-sm">Digita o nome de um artista, faixa ou banda para começar.</p>
        </div>
      )}

      {/* Resultados da Pesquisa */}
      {searchTerm.trim() && !isLoading && (
        <>
          {songs.length === 0 && albums.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p className="text-lg">Nenhum resultado encontrado para "{searchTerm}"</p>
              <p className="text-sm text-slate-500 mt-1">Verifica a ortografia ou tenta outro termo.</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-slate-900/60 border border-slate-800 p-1 rounded-xl mb-6">
                <TabsTrigger value="all" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 rounded-lg">
                  Tudo
                </TabsTrigger>
                <TabsTrigger value="songs" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 rounded-lg">
                  Músicas ({songs.length})
                </TabsTrigger>
                <TabsTrigger value="albums" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 rounded-lg">
                  Álbuns ({albums.length})
                </TabsTrigger>
              </TabsList>

              {/* TAB: TUDO */}
              <TabsContent value="all" className="space-y-8">
                {/* Top Songs */}
                {songs.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 text-white">Músicas</h2>
                    <div className="divide-y divide-slate-800/40">
                      {songs.slice(0, 5).map((track, idx) => (
                        <SongRow
                          key={track.id}
                          song={track}
                          index={idx}
                          isPlaying={isPlaying && currentTrack?.id === track.id}
                          onPlay={() => playTrack(track, songs, idx)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Albums */}
                {albums.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 text-white">Álbuns</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {albums.slice(0, 6).map((album) => (
                        <MediaCard
                          key={album.id}
                          item={album}
                          type="album"
                          title={album.title}
                          subtitle={album.artist_name}
                          imageUrl={album.cover_url}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB: MÚSICAS */}
              <TabsContent value="songs">
                <div className="divide-y divide-slate-800/40">
                  {songs.map((track, idx) => (
                    <SongRow
                      key={track.id}
                      song={track}
                      index={idx}
                      isPlaying={isPlaying && currentTrack?.id === track.id}
                      onPlay={() => playTrack(track, songs, idx)}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* TAB: ÁLBUNS */}
              <TabsContent value="albums">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {albums.map((album) => (
                    <MediaCard
                      key={album.id}
                      item={album}
                      type="album"
                      title={album.title}
                      subtitle={album.artist_name}
                      imageUrl={album.cover_url}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
