import React from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Mic2, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    isLoadingStream,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    isRepeat,
    togglePlay,
    handleNext,
    handlePrevious,
    seekTo,
    changeVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat
  } = usePlayer();

  // Se nenhuma música tiver sido clicada ainda, esconde a barra
  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-4 md:px-8 flex items-center justify-between z-50 shadow-2xl">
      {/* 1. Informação da Música (Esquerda) */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-[200px]">
        <img
          src={currentTrack.cover_url}
          alt={currentTrack.title}
          className="h-14 w-14 rounded-xl object-cover shadow-lg border border-white/5"
        />
        <div className="min-w-0 pr-2">
          <p className="text-sm font-semibold text-white truncate">{currentTrack.title}</p>
          <p className="text-xs text-slate-400 truncate mt-0.5">{currentTrack.artist_name}</p>
        </div>
      </div>

      {/* 2. Controlos Centrais + Barra de Progresso */}
      <div className="flex flex-col items-center gap-2 max-w-xl w-2/4">
        <div className="flex items-center gap-5">
          <button
            onClick={toggleShuffle}
            className={`p-1 transition-colors ${isShuffle ? 'text-red-500' : 'text-slate-400 hover:text-white'}`}
          >
            <Shuffle className="h-4 w-4" />
          </button>

          <button onClick={handlePrevious} className="text-slate-300 hover:text-white transition-colors">
            <SkipBack className="h-5 w-5 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoadingStream}
            className="h-10 w-10 bg-white hover:scale-105 rounded-full flex items-center justify-center text-slate-950 transition-all shadow-md"
          >
            {isLoadingStream ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-900" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </button>

          <button onClick={handleNext} className="text-slate-300 hover:text-white transition-colors">
            <SkipForward className="h-5 w-5 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`p-1 transition-colors ${isRepeat ? 'text-red-500' : 'text-slate-400 hover:text-white'}`}
          >
            <Repeat className="h-4 w-4" />
          </button>
        </div>

        {/* Timeline / Scrubbing */}
        <div className="w-full flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span className="w-10 text-right">{formatTime(currentTime)}</span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={(vals) => seekTo(vals[0])}
            className="flex-1 cursor-pointer"
          />
          <span className="w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Controlo de Volume (Direita) */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[160px]">
        <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors">
          {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        <Slider
          value={[isMuted ? 0 : volume * 100]}
          max={100}
          step={1}
          onValueChange={(vals) => changeVolume(vals[0] / 100)}
          className="w-24 cursor-pointer"
        />
      </div>
    </div>
  );
}
