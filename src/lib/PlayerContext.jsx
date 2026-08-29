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

  // Referência principal do elemento HTMLAudioElement
  const audioRef = useRef(new Audio());
  // Preloader de áudio secundário para pre-fetching da faixa seguinte
  const preloadAudioRef = useRef(new Audio());
  // Guarda a promise ou token de cancelamento do stream em resolução
  const resolveTokenRef = useRef(0);

  // Inicialização e listeners de eventos do áudio
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => handleNext();
    const onWaiting = () => setIsLoadingStream(true);
    const onCanPlay = () => setIsLoadingStream(false);
    const onError = (e) => {
      console.warn('Erro na reprodução de áudio:', e);
      setIsLoadingStream(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Pre-fetch inteligente da próxima música da fila para eliminar tempos de espera
  const prefetchNextTrack = useCallback(async (nextIndex, currentQueue) => {
    if (!currentQueue || nextIndex < 0 || nextIndex >= currentQueue.length) return;
    const nextTrack = currentQueue[nextIndex];
    if (!nextTrack || nextTrack.audio_url) return;

    try {
      const fullUrl = await resolveAudioStreamUrl(nextTrack.title, nextTrack.artist_name);
      if (fullUrl) {
        // Guarda em memória no próprio objeto da fila para uso imediato
        nextTrack.audio_url = fullUrl;
        preloadAudioRef.current.src = fullUrl;
        preloadAudioRef.current.preload = 'auto';
      }
    } catch (e) {
      // Falha silenciosa no prefetch
    }
  }, []);

  // Tocar uma faixa específica com troca imediata de áudio
  const playTrack = useCallback(async (track, newQueue = null, index = 0) => {
    if (!track) return;

    const currentToken = ++resolveTokenRef.current;
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);

    if (newQueue) {
      setQueue(newQueue);
      setQueueIndex(index);
      prefetchNextTrack(index + 1, newQueue);
    }

    const audio = audioRef.current;
    audio.pause();

    // 1. Se for uma estação de Rádio / Podcast / Faixa com áudio direto
    if (track.audio_url && !track.audio_url.includes('itunes.apple.com')) {
      audio.src = track.audio_url;
      audio.play().catch((e) => console.warn('Erro no play:', e));
      return;
    }

    // 2. Tocar instantaneamente o preview (se disponível) para latência < 100ms
    if (track.preview_url) {
      audio.src = track.preview_url;
      audio.play().catch((e) => console.warn('Erro ao tocar preview:', e));
    } else {
      setIsLoadingStream(true);
    }

    // 3. Resolver a stream de áudio completa em background
    try {
      const fullAudioUrl = await resolveAudioStreamUrl(track.title, track.artist_name);

      // Garante que o utilizador não mudou de faixa entretanto
      if (currentToken === resolveTokenRef.current && fullAudioUrl) {
        const resumeTime = audio.currentTime || 0;
        const wasPlaying = !audio.paused;

        audio.src = fullAudioUrl;
        track.audio_url = fullAudioUrl;

        // Se estava a tocar o preview, retoma a partir do mesmo segundo
        if (resumeTime > 0 && resumeTime < 28) {
          audio.currentTime = resumeTime;
        }

        if (wasPlaying) {
          audio.play().catch((e) => console.warn('Erro ao retomar stream full:', e));
        }
        setIsLoadingStream(false);
      }
    } catch (err) {
      console.error('Falha ao resolver stream completa da faixa:', err);
      setIsLoadingStream(false);
    }
  }, [prefetchNextTrack]);

  // Alternar Play / Pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!currentTrack) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((e) => console.warn('Erro play:', e));
    }
  }, [currentTrack, isPlaying]);

  // Avançar para a próxima música
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
      playTrack(queue[nextIdx]);
      prefetchNextTrack(nextIdx + 1, queue);
    } else {
      setIsPlaying(false);
    }
  }, [queue, queueIndex, isRepeat, isShuffle, playTrack, prefetchNextTrack]);

  // Voltar para a música anterior
  const handlePrevious = useCallback(() => {
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    if (queueIndex > 0) {
      const prevIdx = queueIndex - 1;
      setQueueIndex(prevIdx);
      playTrack(queue[prevIdx]);
    } else {
      audioRef.current.currentTime = 0;
    }
  }, [queueIndex, queue, playTrack]);

  // Controlo de posição (Seekbar)
  const seekTo = useCallback((seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  // Controlo de Volume
  const changeVolume = useCallback((val) => {
    const newVol = Math.max(0, Math.min(1, val));
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  // Mutar / Desmutar
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
