import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getRecommendations, getArtistShuffleQueue } from "@/lib/recommendations";

const PlayerContext = createContext(null);

function fadeAudio(audio, to, duration) {
  if (!audio) return;
  const start = performance.now();
  const fromVol = audio.volume;
  const step = (now) => {
    if (!audio) return;
    const t = Math.min(1, (now - start) / duration);
    audio.volume = fromVol + (to - fromVol) * t;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function PlayerProvider({ children }) {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("off");
  const [isLoadingRadio, setIsLoadingRadio] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [upNext, setUpNext] = useState([]);
  const [djMode, setDjMode] = useState(false);

  const audioRef = useRef(null);
  const endedRef = useRef(null);
  const djModeRef = useRef(false);
  const volumeRef = useRef(0.7);
  const fadingRef = useRef(false);
  const activityIdRef = useRef(null);

  djModeRef.current = djMode;
  volumeRef.current = volume;

  const currentSong = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  // init audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration || 0);
    const onEnd = () => endedRef.current && endedRef.current();
    const onPlay = () => {
      setIsPlaying(true);
      if (djModeRef.current) {
        audio.volume = 0;
        fadeAudio(audio, volumeRef.current, 2500);
      }
      if (activityIdRef.current) base44.entities.FriendActivity.update(activityIdRef.current, { is_playing: true }).catch(() => {});
    };
    const onPause = () => {
      setIsPlaying(false);
      if (activityIdRef.current) base44.entities.FriendActivity.update(activityIdRef.current, { is_playing: false }).catch(() => {});
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDur);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDur);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load src when current song changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    fadingRef.current = false;
    if (currentSong.audio_url) {
      if (djModeRef.current) audio.volume = 0;
      audio.src = currentSong.audio_url;
      audio.play().catch(() => {});
    }
    if (currentSong.id) {
      base44.entities.ListeningHistory.create({
        song_id: currentSong.id,
        song_title: currentSong.title,
        artist_name: currentSong.artist_name,
        cover_url: currentSong.cover_url,
        played_at: new Date().toISOString(),
      }).catch(() => {});
      if (user && user.share_activity !== false) {
        base44.entities.FriendActivity.create({
          song_id: currentSong.id,
          song_title: currentSong.title,
          artist_name: currentSong.artist_name,
          cover_url: currentSong.cover_url,
          is_playing: true,
        }).then((r) => {
          activityIdRef.current = r?.id || null;
          base44.entities.FriendActivity.filter({ created_by_id: user.id }, "-created_date", 30)
            .then((mine) => {
              if (mine.length > 20) {
                base44.entities.FriendActivity.deleteMany({ id: { $in: mine.slice(20).map((m) => m.id) } }).catch(() => {});
              }
            }).catch(() => {});
        }).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // DJ mode: fade out near the end of the track
  useEffect(() => {
    if (!djMode || !duration || !isPlaying) return;
    const remaining = duration - currentTime;
    if (remaining > 0 && remaining < 4 && !fadingRef.current) {
      fadingRef.current = true;
      const audio = audioRef.current;
      if (audio) fadeAudio(audio, 0, Math.max(800, remaining * 1000));
    }
  }, [currentTime, duration, djMode, isPlaying]);

  // restore volume when DJ mode is turned off
  useEffect(() => {
    if (!djMode && audioRef.current) {
      fadingRef.current = false;
      audioRef.current.volume = volume;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [djMode]);

  const handleEnded = useCallback(() => {
    setCurrentIndex((idx) => {
      if (repeat === "one") {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }
        return idx;
      }
      if (upNext.length > 0) {
        const [nextUp, ...rest] = upNext;
        setUpNext(rest);
        setQueue((q) => {
          const newQ = [...q];
          newQ.splice(idx + 1, 0, nextUp);
          return newQ;
        });
        return idx + 1;
      }
      if (idx + 1 < queue.length) return idx + 1;
      if (repeat === "all" && queue.length > 0) return 0;
      extendWithRadio();
      return idx;
    });
  }, [repeat, upNext, queue.length]);
  endedRef.current = handleEnded;

  const extendWithRadio = useCallback(async () => {
    if (!currentSong || isLoadingRadio) return;
    setIsLoadingRadio(true);
    try {
      const recs = await getRecommendations({ seed_type: "song", seed_id: currentSong.id, exclude_ids: queue.map((s) => s.id), limit: 25 });
      if (recs.length) {
        setQueue((q) => [...q, ...recs]);
        setCurrentIndex((idx) => idx + 1);
      }
    } catch (e) {
      // ignore
    } finally {
      setIsLoadingRadio(false);
    }
  }, [currentSong, queue, isLoadingRadio]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.pause();
  }, []);

  const playSong = useCallback((song, newQueue = null, index = 0) => {
    const q = newQueue || [song];
    setQueue(q);
    setCurrentIndex(index);
    setUpNext([]);
    setIsPlaying(true);
    window.dispatchEvent(new Event("music:play-song"));
  }, []);

  const playQueue = useCallback((songs, startIndex = 0) => {
    if (!songs.length) return;
    setQueue(songs);
    setCurrentIndex(startIndex);
    setUpNext([]);
    setIsPlaying(true);
    window.dispatchEvent(new Event("music:play-song"));
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [currentSong]);

  const next = useCallback(() => {
    setCurrentIndex((idx) => {
      if (upNext.length > 0) {
        const [nextUp, ...rest] = upNext;
        setUpNext(rest);
        setQueue((q) => {
          const newQ = [...q];
          newQ.splice(idx + 1, 0, nextUp);
          return newQ;
        });
        return idx + 1;
      }
      if (idx + 1 < queue.length) return idx + 1;
      if (repeat === "all" && queue.length > 0) return 0;
      return idx;
    });
  }, [upNext, queue.length, repeat]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setCurrentIndex((idx) => (idx > 0 ? idx - 1 : idx));
  }, []);

  const seek = useCallback((time) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = time;
  }, []);

  const addToQueue = useCallback((song) => setUpNext((u) => [...u, song]), []);
  const playNext = useCallback((song) => setUpNext((u) => [song, ...u]), []);

  const toggleShuffle = useCallback(() => {
    setShuffle((sh) => {
      const nextSh = !sh;
      if (nextSh && queue.length > 1) {
        const remaining = queue.filter((_, i) => i !== currentIndex);
        for (let i = remaining.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        const current = queue[currentIndex];
        setQueue([current, ...remaining]);
        setCurrentIndex(0);
      }
      return nextSh;
    });
  }, [queue, currentIndex]);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  const toggleDjMode = useCallback(() => setDjMode((d) => !d), []);

  const showAirplayPicker = useCallback(() => {
    const audio = audioRef.current;
    if (audio && typeof audio.webkitShowPlaybackTargetPicker === "function") {
      audio.webkitShowPlaybackTargetPicker();
    }
  }, []);

  const playArtistShuffle = useCallback(async (artistId) => {
    try {
      const queue = await getArtistShuffleQueue(artistId);
      if (queue.length) {
        playQueue(queue, 0);
        setShuffle(true);
      }
    } catch (e) {
      // ignore
    }
  }, [playQueue]);

  const startRadio = useCallback(async (song) => {
    setIsLoadingRadio(true);
    try {
      const recs = await getRecommendations({ seed_type: "song", seed_id: song.id, limit: 50 });
      const station = [song, ...recs];
      playQueue(station, 0);
    } catch (e) {
      playQueue([song], 0);
    } finally {
      setIsLoadingRadio(false);
    }
  }, [playQueue]);

  const value = {
    queue, currentIndex, currentSong, isPlaying, currentTime, duration,
    volume, shuffle, repeat, isLoadingRadio, showNowPlaying, upNext, djMode,
    setVolume, setShuffle, setShowNowPlaying, toggleDjMode,
    playSong, playQueue, togglePlay, pause, next, prev, seek,
    addToQueue, playNext, toggleShuffle, cycleRepeat,
    playArtistShuffle, startRadio, extendWithRadio, showAirplayPicker,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}