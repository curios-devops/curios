/**
 * Chapter Player
 * Reproduce chapters secuencialmente como un solo video
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Pause, Play, Maximize, Minimize, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { ChapterDescriptor } from '../types';
import { logger } from '../../../utils/logger';

interface ChapterPlayerProps {
  chapters: Array<Pick<ChapterDescriptor, 'id' | 'duration'> & Partial<Pick<ChapterDescriptor, 'free' | 'text'>>>;
  chapterUrls: Map<string, string>;
  videoId: string;
  onComplete?: () => void;
}

export const ChapterPlayer: React.FC<ChapterPlayerProps> = ({
  chapters,
  chapterUrls,
  videoId,
  onComplete
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPreparingNext, setIsPreparingNext] = useState(false);
  const [chapterTime, setChapterTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [ccEnabled, setCcEnabled] = useState(false);
  const [hdEnabled, setHdEnabled] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pendingSeek, setPendingSeek] = useState<{ chapterIndex: number; time: number } | null>(null);
  const [chapterDurations, setChapterDurations] = useState<Record<string, number>>({});
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chapterUrlsRef = useRef<Map<string, string>>(chapterUrls);
  const isTransitioningRef = useRef(false);
  const playRequestIdRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const pendingSeekRef = useRef(pendingSeek);
  const currentChapterIndexRef = useRef(currentChapterIndex);
  const ccEnabledRef = useRef(ccEnabled);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    chapterUrlsRef.current = chapterUrls;
  }, [chapterUrls]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    pendingSeekRef.current = pendingSeek;
  }, [pendingSeek]);

  useEffect(() => {
    currentChapterIndexRef.current = currentChapterIndex;
  }, [currentChapterIndex]);

  useEffect(() => {
    ccEnabledRef.current = ccEnabled;
  }, [ccEnabled]);

  const currentChapter = chapters[currentChapterIndex];
  const currentUrl = chapterUrls.get(currentChapter?.id);

  // Calcular duración total y progreso
  const effectiveDurations = useMemo(() => {
    return chapters.map((ch) => {
      const actual = chapterDurations[ch.id];
      return Number.isFinite(actual) && actual > 0 ? actual : ch.duration;
    });
  }, [chapters, chapterDurations]);

  const totalDuration = useMemo(() => {
    return effectiveDurations.reduce((sum, d) => sum + d, 0);
  }, [effectiveDurations]);

  const elapsedTime = useMemo(() => {
    return effectiveDurations.slice(0, currentChapterIndex).reduce((sum, d) => sum + d, 0);
  }, [effectiveDurations, currentChapterIndex]);

  const globalElapsedTime = Math.min(totalDuration, Math.max(0, elapsedTime + chapterTime));
  const globalProgress = totalDuration > 0 ? (globalElapsedTime / totalDuration) * 100 : 0;

  const handleMouseMove = () => {
    setShowControls(true);
  };

  const handlePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        playRequestIdRef.current += 1;
        await video.play();
      } catch {
        return;
      }
    } else {
      playRequestIdRef.current += 1;
      video.pause();
    }
  };

  const syncVolumeToVideo = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Math.min(1, Math.max(0, volume));
    v.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    syncVolumeToVideo();
  }, [syncVolumeToVideo]);

  const toggleTheaterMode = () => {
    setIsTheaterMode((v) => !v);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  const handleGlobalTimelineSeek = (targetSeconds: number) => {
    const clamped = Math.min(totalDuration, Math.max(0, targetSeconds));
    let accum = 0;
    for (let i = 0; i < chapters.length; i++) {
      const next = accum + (effectiveDurations[i] ?? chapters[i].duration);
      if (clamped <= next || i === chapters.length - 1) {
        const localTime = Math.max(0, clamped - accum);
        const v = videoRef.current;

        // If seeking within the current chapter, apply immediately to avoid freezes.
        if (i === currentChapterIndex && v) {
          try {
            v.currentTime = localTime;
            setChapterTime(localTime);
            if (isPlaying) {
              playRequestIdRef.current += 1;
              void v.play().catch(() => {
                // ignore
              });
            }
          } catch {
            // ignore
          }
          setPendingSeek(null);
          return;
        }

        setPendingSeek({ chapterIndex: i, time: localTime });
        setCurrentChapterIndex(i);
        return;
      }
      accum = next;
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    handleGlobalTimelineSeek(percent * totalDuration);
  };

  const handleTimelineDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    handleGlobalTimelineSeek(percent * totalDuration);
  };

  // Handler when a chapter ends
  const handleChapterEnd = useCallback(async () => {
    if (isTransitioningRef.current) {
      logger.debug('[ChapterPlayer] Ignoring chapter end (transition in progress)', {
        index: currentChapterIndex,
        chapterId: currentChapter?.id
      });
      return;
    }

    isTransitioningRef.current = true;
    logger.info('[ChapterPlayer] Chapter ended', {
      index: currentChapterIndex,
      chapterId: currentChapter?.id,
      totalChapters: chapters.length
    });

    const nextIndex = currentChapterIndex + 1;

    if (nextIndex < chapters.length) {
      try {
        const nextChapter = chapters[nextIndex];
        const nextChapterId = nextChapter?.id;
        const nextUrlInitial = nextChapterId
          ? chapterUrlsRef.current.get(nextChapterId)
          : undefined;

        logger.debug('[ChapterPlayer] Next chapter lookup', {
          nextIndex,
          nextChapterId,
          hasNextUrl: !!nextUrlInitial,
          availableUrlCount: chapterUrlsRef.current.size,
          availableChapterIds: Array.from(chapterUrlsRef.current.keys())
        });

        // If next chapter URL isn't available yet, wait (background rendering may still be uploading).
        // Vanilla behavior: pause and show a buffering state until next chapter is ready.
        if (nextChapterId && !nextUrlInitial) {
          const start = Date.now();
          const timeoutMs = 90000;
          const intervalMs = 500;

          setIsPreparingNext(true);
          setIsPlaying(false);

          logger.info('[ChapterPlayer] Waiting for next chapter URL…', {
            nextChapterId,
            timeoutMs,
            intervalMs
          });

          while (Date.now() - start < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
            const nextUrl = chapterUrlsRef.current.get(nextChapterId);
            if (nextUrl) {
              logger.info('[ChapterPlayer] Next chapter URL became available', {
                nextChapterId,
                waitedMs: Date.now() - start
              });
              break;
            }
          }

          const finalNextUrl = chapterUrlsRef.current.get(nextChapterId);
          if (!finalNextUrl) {
            logger.error('[ChapterPlayer] Timed out waiting for next chapter URL', {
              nextChapterId,
              waitedMs: Date.now() - start,
              availableUrlCount: chapterUrlsRef.current.size,
              availableChapterIds: Array.from(chapterUrlsRef.current.keys())
            });
            setIsPlaying(false);
            setIsPreparingNext(false);
            return;
          }
        }

        // Add a small delay to ensure clean transition
        await new Promise(resolve => setTimeout(resolve, 300));
        
        logger.debug('[ChapterPlayer] Moving to next chapter', { 
          currentIndex: currentChapterIndex,
          nextIndex,
          chapterId: chapters[nextIndex]?.id
        });
        
        // Safely handle video element
        const video = videoRef.current;
        if (video) {
          video.pause();
          video.removeAttribute('src');
          video.load();
        }
        
        // Log network state before transition
        if (video) {
          logger.debug('[ChapterPlayer] Video network state before transition', {
            readyState: video.readyState,
            networkState: video.networkState,
            buffered: video.buffered.length > 0 ? {
              start: video.buffered.start(0),
              end: video.buffered.end(0)
            } : 'no buffer'
          });
        }
        
        // Update to next chapter
        setCurrentChapterIndex(nextIndex);
        setIsPreparingNext(false);
        setIsPlaying(true);
        
      } catch (error) {
        logger.error('[ChapterPlayer] Error transitioning to next chapter', {
          error,
          currentIndex: currentChapterIndex,
          nextIndex
        });
        setIsPreparingNext(false);
      }
    } else {
      logger.info('[ChapterPlayer] All chapters completed', { videoId });
      setIsPlaying(false);
      setIsPreparingNext(false);
      onComplete?.();
    }

    isTransitioningRef.current = false;
  }, [currentChapterIndex, chapters, videoId, onComplete, currentChapter?.id]);

  // Preload del siguiente chapter
  useEffect(() => {
    const nextIndex = currentChapterIndex + 1;
    if (nextIndex < chapters.length) {
      const nextChapter = chapters[nextIndex];
      const nextUrl = chapterUrls.get(nextChapter.id);

      if (nextUrl) {
        // Precargar en background
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = nextUrl;
        document.head.appendChild(link);

        logger.debug('[ChapterPlayer] Precargando siguiente chapter', {
          nextIndex,
          chapterId: nextChapter.id
        });
      }
    }
  }, [currentChapterIndex, chapters, chapterUrls]);

  // Handle video source changes and playback
  useEffect(() => {
    if (!videoRef.current || !currentUrl) {
      logger.debug('[ChapterPlayer] Video ref or URL not ready', {
        hasRef: !!videoRef.current,
        hasUrl: !!currentUrl
      });
      return;
    }

    const video = videoRef.current;
    let cancelled = false;

    const logNetworkState = (event: string) => {
      logger.debug(`[ChapterPlayer] Video ${event}`, {
        currentTime: video.currentTime,
        duration: video.duration,
        readyState: video.readyState,
        networkState: video.networkState,
        error: video.error,
        paused: video.paused,
        seeking: video.seeking,
        buffered: video.buffered.length > 0 ? {
          start: video.buffered.start(0),
          end: video.buffered.end(0)
        } : 'no buffer'
      });
    };

    const handleLoadedMetadata = () => {
      const dur = video.duration;
      if (Number.isFinite(dur) && dur > 0 && currentChapter?.id) {
        setChapterDurations((prev) => {
          if (prev[currentChapter.id] === dur) return prev;
          return { ...prev, [currentChapter.id]: dur };
        });
      }

      // Ensure native/embedded text tracks are disabled unless the user enabled CC.
      // This avoids showing a second, smaller caption near the controls.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tracks = (video as any).textTracks as TextTrackList | undefined;
        if (tracks) {
          for (let i = 0; i < tracks.length; i++) {
            tracks[i].mode = ccEnabledRef.current ? 'showing' : 'disabled';
          }
        }
      } catch {
        // ignore
      }

      // Apply pending seek as early as possible.
      const ps = pendingSeekRef.current;
      const idx = currentChapterIndexRef.current;
      if (ps && ps.chapterIndex === idx) {
        try {
          video.currentTime = ps.time;
          setChapterTime(ps.time);
        } catch {
          // ignore
        }
      }
    };

    const handleCanPlay = () => {
      logNetworkState('canplay');
      if (!isPlayingRef.current || cancelled) return;

      const ps = pendingSeekRef.current;
      const idx = currentChapterIndexRef.current;

      if (ps && ps.chapterIndex === idx) {
        setPendingSeek(null);
      }

      const requestId = ++playRequestIdRef.current;
      video.play()
        .then(() => {
          if (cancelled || requestId !== playRequestIdRef.current) return;
          logger.debug('[ChapterPlayer] Video playback started successfully');
        })
        .catch(err => {
          if (cancelled || requestId !== playRequestIdRef.current) return;
          logger.warn('[ChapterPlayer] Autoplay failed', {
            error: err,
            chapterId: currentChapter?.id
          });
          setIsPlaying(false);
        });
    };

    // Add event listeners
    const events = [
      'loadstart', 'progress', 'canplay', 'playing', 'waiting', 
      'seeking', 'seeked', 'ended', 'error', 'stalled'
    ];

    const eventHandlers = new Map<string, EventListener>();
    events.forEach((event) => {
      const handler: EventListener = () => logNetworkState(event);
      eventHandlers.set(event, handler);
      video.addEventListener(event, handler);
    });
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    
    // Log initial state
    logger.debug('[ChapterPlayer] Setting video source', {
      url: currentUrl,
      chapterId: currentChapter?.id
    });
    
    // Trigger loading for the new chapter source (src is set via JSX prop)
    try {
      video.load();
    } catch (error) {
      logger.warn('[ChapterPlayer] video.load() failed', { error, chapterId: currentChapter?.id });
    }

    // If the browser already considers it playable, attempt to play immediately.
    if (isPlayingRef.current && (video.readyState >= 3 || video.readyState === 4)) {
      handleCanPlay();
    }

    // Cleanup
    return () => {
      cancelled = true;
      logger.debug('[ChapterPlayer] Cleaning up video events');
      events.forEach(event => {
        const handler = eventHandlers.get(event);
        if (handler) {
          video.removeEventListener(event, handler);
        }
      });
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);

      // Do NOT clear src here; changing isPlaying (pause/play) should not cause a reload loop.
      playRequestIdRef.current += 1;
      video.pause();
    };
  }, [currentUrl, currentChapter?.id]);

  useEffect(() => {
    setChapterTime(0);
  }, [currentChapterIndex]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Prevent the browser from rendering embedded/native captions by default.
    // Only show them when the user explicitly enables CC.
    try {
      // HTMLMediaElement.textTracks exists but is not an Array in all browsers.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tracks = (v as any).textTracks as TextTrackList | undefined;
      if (!tracks) return;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = ccEnabled ? 'showing' : 'disabled';
      }
    } catch {
      // ignore
    }
  }, [ccEnabled, currentChapterIndex]);

  // Formatear tiempo
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentChapter || !currentUrl) {
    return (
      <div className="h-full bg-black" />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`chapter-player relative w-full h-full bg-black ${isTheaterMode ? 'max-w-none' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video player */}
      <div className="relative w-full h-full">
        <video
          key={`video-${currentChapter?.id || 'loading'}`}
          ref={videoRef}
          src={currentUrl}
          className="w-full h-full object-contain"
          autoPlay
          playsInline
          muted={isMuted}
          onTimeUpdate={() => {
            const v = videoRef.current;
            if (!v) return;
            setChapterTime(v.currentTime);
          }}
          onEnded={handleChapterEnd}
          onPlay={() => {
            logger.debug('[ChapterPlayer] Video play event');
            setIsPlaying(true);
          }}
          onPause={() => {
            logger.debug('[ChapterPlayer] Video pause event');
            setIsPlaying(false);
          }}
          onError={(e) => {
            logger.error('[ChapterPlayer] Video playback error', { 
              error: e, 
              chapterId: currentChapter?.id,
              currentTime: videoRef.current?.currentTime,
              readyState: videoRef.current?.readyState,
              errorState: videoRef.current?.error
            });
          }}
          onClick={() => {
            void handlePlayPause();
          }}
        />

        {isPreparingNext && <div className="absolute inset-0 bg-black/20" />}
      </div>

      {!!currentChapter.text && (
        <div className="pointer-events-none absolute bottom-[84px] left-0 right-0 z-10 flex justify-center px-4">
          <div className="inline-block max-w-[min(1000px,calc(100vw-32px))] rounded-xl bg-black/80 px-5 py-3 text-center text-white shadow-lg">
            <div className="text-lg sm:text-2xl font-extrabold leading-snug tracking-wide">
              {currentChapter.text}
            </div>
          </div>
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
        }}
      >
        <div className="mx-auto w-full max-w-[min(1000px,calc(100vw-32px))]">
          <div className="rounded-xl bg-gradient-to-t from-black/90 via-black/70 to-black/40 px-4 pt-3 pb-3 shadow-lg">
            <div className="mb-2">
              <div
                className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group"
                onClick={handleTimelineClick}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onMouseMove={handleTimelineDrag}
              >
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-red-500"
                  style={{ width: `${globalProgress}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${globalProgress}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => void handlePlayPause()}
                  className="text-white hover:scale-110 transition-transform"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                </button>

                <div className="group flex items-center">
                  <button
                    onClick={() => {
                      setIsMuted((v) => {
                        const next = !v;
                        if (next === false && volume === 0) {
                          setVolume(0.8);
                        }
                        return next;
                      });
                    }}
                    className="text-white hover:scale-110 transition-transform"
                    aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
                  </button>

                  <div className="ml-2 w-0 overflow-hidden transition-[width] duration-200 group-hover:w-24">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((isMuted ? 0 : volume) * 100)}
                      onChange={(e) => {
                        const next = Math.min(100, Math.max(0, Number(e.target.value)));
                        const nextVol = next / 100;
                        setVolume(nextVol);
                        setIsMuted(next === 0);
                      }}
                      className="h-1 w-24 accent-white"
                      aria-label="Volume"
                    />
                  </div>
                </div>

                <span className="text-sm font-medium tabular-nums">
                  {formatTime(globalElapsedTime)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCcEnabled((v) => !v)}
                  className={`px-2 py-1 rounded text-sm font-bold transition-all ${
                    ccEnabled
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-transparent text-white/70 hover:text-white'
                  }`}
                  aria-pressed={ccEnabled}
                >
                  CC
                </button>

                <button
                  onClick={() => setHdEnabled((v) => !v)}
                  className={`px-2 py-1 rounded text-sm font-bold transition-all ${
                    hdEnabled
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-transparent text-white/70 hover:text-white'
                  }`}
                  aria-pressed={hdEnabled}
                >
                  HD
                </button>

                <button
                  onClick={toggleTheaterMode}
                  className="text-white hover:scale-110 transition-transform"
                  aria-label={isTheaterMode ? 'Exit theater mode' : 'Theater mode'}
                >
                  {isTheaterMode ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>

                <button
                  onClick={() => void toggleFullscreen()}
                  className="px-2 py-1 rounded text-sm font-bold transition-all bg-transparent text-white/70 hover:text-white"
                  aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                >
                  {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute top-4 right-4 select-none text-sm font-semibold tracking-tight">
        <span className="font-extrabold text-white/15">Curios</span>
        <span className="font-extrabold text-sky-400/15">AI</span>
      </div>
    </div>
  );
};
