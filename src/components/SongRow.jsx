import React from 'react';
import { Play, Pause, MoreHorizontal, Heart } from 'lucide-react';

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function SongRow({ song, index, isPlaying, onPlay }) {
  return (
    <div
      onClick={onPlay}
      className={`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${
        isPlaying ? 'bg-red-500/10 text-red-400' : 'hover:bg-slate-800/50 text-slate-200'
      }`}
    >
      {/* Esquerda: Número / Play Button + Capa + Título */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-6 text-center text-sm font-medium text-slate-500 flex items-center justify-center">
          {isPlaying ? (
            <div className="flex items-end gap-[2px] h-4">
              <span className="w-1 bg-red-500 animate-pulse h-full rounded-full"></span>
              <span className="w-1 bg-red-500 animate-pulse h-2/3 rounded-full"></span>
              <span className="w-1 bg-red-500 animate-pulse h-4/5 rounded-full"></span>
            </div>
          ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <Play className="h-4 w-4 text-white hidden group-hover:block fill-current" />
            </>
          )}
        </div>

        <img
          src={song.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800'}
          alt={song.title}
          className="h-11 w-11 rounded-lg object-cover bg-slate-800 shadow-md flex-shrink-0"
        />

        <div className="min-w-0 pr-4">
          <p className={`text-sm font-semibold truncate ${isPlaying ? 'text-red-400' : 'text-white'}`}>
            {song.title}
          </p>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {song.artist_name} {song.album_title ? `• ${song.album_title}` : ''}
          </p>
        </div>
      </div>

      {/* Direita: Duração e Ações */}
      <div className="flex items-center gap-4 text-slate-400 text-xs flex-shrink-0">
        <span className="font-mono">{formatDuration(song.duration_seconds)}</span>
      </div>
    </div>
  );
}