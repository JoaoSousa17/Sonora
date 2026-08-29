import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { resolveAudioStreamUrl } from '@/api/musicCatalog';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isLoadingStream, setIsLoadingStream] = useState(false);

  // Elemento nativo de áudio
  const audioRef = useRef(new Audio());
  const resolveTokenRef = useRef(0);

  // Listeners de áudio
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => handleNext();
    const onWaiting = () => setIsLoadingStream(true);
    const onPlaying = () => {
      setIsLoadingStream(false);
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);
    const onError = (e) => {
      console.warn('Aviso no stream de áudio:', e);
      setIsLoadingStream(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Tocar uma música do início (0:00)
  const playTrack = useCallback(async (track, newQueue = null, index = 0) => {
    if (!track) return;

    const currentToken = ++resolveTokenRef.current;
    
    // Normalizar objeto da música para garantir compatibilidade total com PlayerBar
    const normalizedTrack = {
      ...track,
      id: track.id || String(Date.now()),
      title: track.title || track.name || 'Música Desconhecida',
      artist_name: track.artist_name || track.artist || 'Artista Desconhecido',
      cover_url: track.cover_url || track.artwork || track.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
      duration_seconds: track.duration_seconds || track.duration || 180,
    };

    setCurrentTrack(normalizedTrack);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(normalizedTrack.duration_seconds);

    if (newQueue) {
      setQueue(newQueue);
      setQueueIndex(index);
    }

    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = 0;

    // 1. Áudio direto (Rádio, Podcast ou ficheiro já resolvido)
    if (normalizedTrack.audio_url && !normalizedTrack.audio_url.includes('itunes.apple.com')) {
      audio.src = normalizedTrack.audio_url;
      audio.play().catch(console.warn);
      return;
    }

    // 2. Tocar preview ou aguardar stream full
    setIsLoadingStream(true);

    try {
      const fullUrl = await resolveAudioStreamUrl(normalizedTrack.title, normalizedTrack.artist_name);

      if (currentToken === resolveTokenRef.current) {
        if (fullUrl) {
          audio.src = fullUrl;
          normalizedTrack.audio_url = fullUrl;
          audio.currentTime = 0;
          await audio.play();
        } else {
          console.error("Não foi possível encontrar a stream completa nos nós ativos.");
        }
        setIsLoadingStream(false);
      }
    } catch (err) {
      console.error('Falha ao iniciar reprodução:', err);
      setIsLoadingStream(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!currentTrack) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.warn);
    }
  }, [currentTrack, isPlaying]);

  const handleNext = useCallback(() => {
    if (queue.length === 0) return;

    if (isRepeat) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }

    let nextIdx = queueIndex + 1;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    }

    if (nextIdx < queue.length) {
      setQueueIndex(nextIdx);
      playTrack(queue[nextIdx], queue, nextIdx);
    } else {
      setIsPlaying(false);
    }
  }, [queue, queueIndex, isRepeat, isShuffle, playTrack]);

  const handlePrevious = useCallback(() => {
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    if (queueIndex > 0) {
      const prevIdx = queueIndex - 1;
      setQueueIndex(prevIdx);
      playTrack(queue[prevIdx], queue, prevIdx);
    } else {
      audioRef.current.currentTime = 0;
    }
  }, [queueIndex, queue, playTrack]);

  const seekTo = useCallback((seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  const changeVolume = useCallback((val) => {
    const newVol = Math.max(0, Math.min(1, val));
    setVolume(newVol);
    if (audioRef.current) audioRef.current.volume = newVol;
    if (newVol > 0 && isMuted) setIsMuted(false);
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const toggleShuffle = useCallback(() => setIsShuffle((prev) => !prev), []);
  const toggleRepeat = useCallback(() => setIsRepeat((prev) => !prev), []);

  return (
    <PlayerContext.Provider
      // @ts-ignore
      value={{
        currentTrack,
        isPlaying,
        isLoadingStream,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        isRepeat,
        queue,
        queueIndex,
        playTrack,
        togglePlay,
        handleNext,
        handlePrevious,
        seekTo,
        changeVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        setQueue
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer tem de ser usado dentro de um PlayerProvider');
  }
  return context;
}
