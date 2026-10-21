// Cinematic — real-footage montage on the Video page's template: this component draws the
// player + chapter rail (Video tab) and the chapter list (Timeline tab); the page draws the
// shared parts (share, overview, continue exploring, images, sources) from onReady's data.
// One Pexels clip per chapter, cut on the narration (ElevenLabs, sentence by sentence). Captions
// are drawn by the player — fixed type scale, max 2 lines, dark plate — never burned in. The
// control bar copies YouTube: play, volume │ autoplay, captions, fullscreen — icons with tooltips.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Captions, Loader2, Maximize, Minimize, Pause, Play, RotateCcw, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useSession } from '../../../hooks/useSession.ts';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { VOICES } from '../../character/voices.ts';
import { ParagraphNarrator, type NarratorState } from '../audio/paragraphNarrator.ts';
import { loadNarratorVoice } from '../audio/narratorPrefs.ts';
import { captionChunks, captionFit, captionText, chunkAt, findClips, planCinematic, type CinematicScene, type StockClip } from './cinematicPlan.ts';

const CONTROL_BAR = 44; // px — captions sit above it, as on YouTube
const pref = (key: string, fallback: boolean) => { try { const v = localStorage.getItem(key); return v === null ? fallback : v === 'on'; } catch { return fallback; } };
const savePref = (key: string, on: boolean) => { try { localStorage.setItem(key, on ? 'on' : 'off'); } catch { /* storage blocked */ } };

export interface CinematicInfo {
  title: string;
  overview: string;
  related: string[];
  credits: StockClip[];
  /** The chapters as played (clip + narration with its delivery tags) — for the download. */
  scenes: CinematicScene[];
}

interface Props {
  question: string;
  /** 'hidden' while the page shows Images or Sources (stays mounted, keeps its state). */
  tab: 'video' | 'timeline' | 'hidden';
  /** Fresh web results (Exa) for grounding; null while they load. */
  context: { title: string; snippet: string }[] | null;
  /** Shared page sections shown under the player and chapter rail (share, overview). */
  belowPlayer?: ReactNode;
  onReady: (info: CinematicInfo) => void;
  /** Timeline asks to watch a chapter → the page switches to the Video tab. */
  onWatch: () => void;
  onFail: (reason: string) => void;
}

export default function CinematicMontage({ question, tab, context, belowPlayer, onReady, onWatch, onFail }: Props) {
  const { session } = useSession();
  const { t } = useTranslation();
  const [stage, setStage] = useState<'planning' | 'footage' | 'ready'>('planning');
  const [title, setTitle] = useState('');
  const [scenes, setScenes] = useState<CinematicScene[]>([]);
  const [shot, setShot] = useState(0);
  const [narration, setNarration] = useState<NarratorState | 'idle'>('idle');
  const [captionsOn, setCaptionsOn] = useState(() => pref('cinematicCaptions', true));
  const [autoplay, setAutoplay] = useState(() => pref('cinematicAutoplay', true));
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [chunk, setChunk] = useState(0);
  const narratorRef = useRef<ParagraphNarrator | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const timing = useRef({ start: 0, duration: 0, pausedAt: 0 });
  const playerRef = useRef<HTMLDivElement | null>(null);
  const autoplayRef = useRef(autoplay);
  autoplayRef.current = autoplay;
  const [playerWidth, setPlayerWidth] = useState(800);
  const fit = captionFit(playerWidth);
  const cbRef = useRef({ onReady, onFail });
  cbRef.current = { onReady, onFail };

  useEffect(() => {
    if (context === null) return; // wait for the web results
    let alive = true;
    (async () => {
      const plan = await planCinematic(question, context);
      if (!alive) return;
      setTitle(plan.title);
      setStage('footage');
      const found = await findClips(plan);
      if (!alive) return;
      setScenes(found);
      setStage('ready');
      cbRef.current.onReady({
        title: plan.title,
        overview: found.map((s) => captionText(s.narration)).join(' '),
        related: plan.related,
        credits: [...new Map(found.map((s) => [s.clip.credit, s.clip])).values()],
        scenes: found,
      });
    })().catch((err) => alive && cbRef.current.onFail(err instanceof Error ? err.message : String(err)));
    return () => { alive = false; narratorRef.current?.stop(); };
  }, [question, context]);

  // Caption size and line length follow the player's real width (also in fullscreen).
  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPlayerWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [stage, tab]);

  // The visible clip plays; the others wait, muted (narration is the soundtrack).
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === shot && narration !== 'paused' && narration !== 'held' && tab === 'video') void v.play().catch(() => {});
      else v.pause();
    });
  }, [shot, narration, scenes.length, tab]);

  // Caption card follows the time spoken within the current chapter.
  useEffect(() => {
    if (narration !== 'playing') return;
    const id = window.setInterval(() => {
      const { start, duration } = timing.current;
      const chunks = captionChunks(captionText(scenes[shot]?.narration ?? ''), fit.maxChars);
      setChunk(chunkAt(chunks, (performance.now() - start) / 1000, duration));
    }, 150);
    return () => window.clearInterval(id);
  }, [narration, shot, scenes, fit.maxChars]);

  useEffect(() => { narratorRef.current?.setVolume(muted ? 0 : volume); }, [volume, muted]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /** Starts the film at chapter `from` (the rail and the Timeline jump). */
  const play = (from = 0) => {
    narratorRef.current?.stop();
    const voice = loadNarratorVoice(session?.user);
    const gender = VOICES.find((v) => v.id === voice)?.gender === 'male' ? 'male' : 'female';
    // Built synchronously in the tap so Safari lets the audio start.
    const narrator = new ParagraphNarrator(
      scenes.map((s) => s.narration),
      voice,
      gender,
      (state) => setNarration(state),
      (i, duration) => {
        timing.current = { start: performance.now(), duration, pausedAt: 0 };
        setChunk(0);
        setShot(i);
        const v = videoRefs.current[i];
        if (v) v.currentTime = 0;
      },
      () => autoplayRef.current,
    );
    narrator.setVolume(muted ? 0 : volume);
    narratorRef.current = narrator;
    setShot(from);
    void narrator.start(from);
  };

  const togglePause = () => {
    const n = narratorRef.current;
    if (!n || narration === 'ended') return play();
    if (narration === 'held') return play(shot + 1); // autoplay off: next chapter on demand
    if (narration === 'playing') {
      timing.current.pausedAt = performance.now();
      n.pause();
    } else if (narration === 'paused') {
      timing.current.start += performance.now() - timing.current.pausedAt;
      n.resume();
    }
  };

  // Leaving the Video tab pauses the film (it resumes where it was).
  useEffect(() => {
    if (tab !== 'video' && narration === 'playing') togglePause();
  }, [tab]);

  const toggleFullscreen = () => {
    const el = playerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => setFullscreen((f) => !f));
    else setFullscreen((f) => !f); // iPhone Safari: no element fullscreen → fill the window
  };

  if (tab === 'hidden') return null;

  if (stage !== 'ready') {
    return (
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center gap-3 text-white/70">
        <Loader2 size={28} className="animate-spin" />
        <span className="text-sm">{t(stage === 'planning' ? 'vidStage_planning' : 'vidStage_footage')}</span>
      </div>
    );
  }

  if (tab === 'timeline') {
    return (
      <ol className="space-y-3">
        {scenes.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => { onWatch(); play(i); }}
              className="w-full flex gap-4 p-3 rounded-xl text-left transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--ui-bg-elevated)' }}
            >
              {s.clip.image && <img src={s.clip.image} alt="" className="w-32 sm:w-40 aspect-video object-cover rounded-lg flex-shrink-0" loading="lazy" />}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent-primary)' }}>
                  {t('vidFrame').replace('{n}', String(i + 1)).replace('{total}', String(scenes.length))}
                </p>
                <p className="text-sm leading-relaxed">{captionText(s.narration)}</p>
              </div>
            </button>
          </li>
        ))}
      </ol>
    );
  }

  const started = narration !== 'idle';
  const lines = captionChunks(captionText(scenes[shot]?.narration ?? ''), fit.maxChars)[chunk] ?? [];
  const playLabel = narration === 'playing' ? t('vidPause') : narration === 'ended' ? t('vidReplay') : t('vidPlay');
  const level = muted ? 0 : volume;
  const VolumeIcon = level === 0 ? VolumeX : level < 0.5 ? Volume1 : Volume2;
  const iconBtn = 'p-1.5 hover:opacity-80';

  return (
    <>
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div
          ref={playerRef}
          className={fullscreen && !document.fullscreenElement ? 'fixed inset-0 z-[200] bg-black' : 'relative rounded-xl overflow-hidden bg-black aspect-video'}
        >
          {scenes.map((s, i) => (
            <video
              key={`${s.clip.id}-${i}`}
              ref={(el) => { videoRefs.current[i] = el; }}
              src={s.clip.url}
              poster={s.clip.image || undefined}
              muted
              loop
              playsInline
              preload={i <= shot + 1 ? 'auto' : 'none'}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${fullscreen ? 'object-contain' : 'object-cover'}`}
              style={{ opacity: i === shot ? 1 : 0 }}
            />
          ))}

          {/* Title card until the film starts */}
          {!started && (
            <button
              type="button"
              onClick={() => play()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.2))' }}
              aria-label={t('vidPlay')}
            >
              <span className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}>
                <Play size={28} className="ml-1" />
              </span>
              {title && <span className="px-6 text-center font-semibold" style={{ fontSize: Math.round(fit.fontPx * 1.3), lineHeight: 1.2 }}>{title}</span>}
            </button>
          )}

          {/* Captions: the player owns size and placement (never the model). */}
          {started && captionsOn && lines.length > 0 && (
            <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ bottom: CONTROL_BAR + 8, paddingInline: '7%' }}>
              <p className="flex flex-col items-center text-center font-semibold text-white" style={{ fontSize: fit.fontPx, lineHeight: 1.35, maxWidth: '86%' }}>
                {lines.map((line, i) => (
                  <span key={i} className="inline-block rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.72)', padding: '0.12em 0.5em', margin: '0.06em 0' }}>
                    {line}
                  </span>
                ))}
              </p>
            </div>
          )}

          {/* Control bar, YouTube style: play, volume │ autoplay, captions, fullscreen. */}
          {started && (
            <div
              className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 text-white"
              style={{ height: CONTROL_BAR, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
            >
              <div className="flex items-center gap-1">
                <button type="button" onClick={togglePause} aria-label={playLabel} title={playLabel} className={iconBtn}>
                  {narration === 'ended' ? <RotateCcw size={20} /> : narration === 'playing' ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <div className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    aria-label={level === 0 ? t('vidUnmute') : t('vidMute')}
                    title={level === 0 ? t('vidUnmute') : t('vidMute')}
                    className={iconBtn}
                  >
                    <VolumeIcon size={20} />
                  </button>
                  {/* The slider opens on hover, like YouTube (touch screens use the mute button). */}
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={level}
                    onChange={(e) => { setVolume(Number(e.target.value)); setMuted(Number(e.target.value) === 0); }}
                    aria-label={t('vidVolume')}
                    title={t('vidVolume')}
                    className="w-0 opacity-0 group-hover:w-20 group-hover:opacity-100 focus:w-20 focus:opacity-100 transition-all duration-200 accent-white cursor-pointer"
                  />
                </div>
                {narration === 'loading' && <Loader2 size={16} className="animate-spin opacity-80 ml-1" />}
                <span className="text-xs tabular-nums opacity-90 ml-1">{shot + 1} / {scenes.length}</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Autoplay switch: track + knob with a play glyph, like YouTube's */}
                <button
                  type="button"
                  onClick={() => setAutoplay((a) => { savePref('cinematicAutoplay', !a); return !a; })}
                  aria-pressed={autoplay}
                  aria-label={autoplay ? t('vidAutoplayOn') : t('vidAutoplayOff')}
                  title={autoplay ? t('vidAutoplayOn') : t('vidAutoplayOff')}
                  className="p-1.5 hover:opacity-80"
                >
                  <span className="relative block w-8 h-3.5 rounded-full" style={{ backgroundColor: autoplay ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)' }}>
                    <span
                      className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center transition-all"
                      style={{ left: autoplay ? 14 : -2, backgroundColor: autoplay ? '#fff' : '#d4d4d4', color: '#111' }}
                    >
                      {autoplay ? <Play size={10} className="ml-px" fill="currentColor" /> : <Pause size={10} fill="currentColor" />}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCaptionsOn((on) => { savePref('cinematicCaptions', !on); return !on; })}
                  aria-pressed={captionsOn}
                  aria-label={t('vidCaptions')}
                  title={t('vidCaptions')}
                  className={`relative ${iconBtn}`}
                >
                  <Captions size={22} />
                  {/* On = a bar under the icon, as on YouTube (in our accent) */}
                  {captionsOn && <span className="absolute left-1.5 right-1.5 -bottom-0.5 h-[3px] rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />}
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={fullscreen ? t('vidExitFullscreen') : t('vidFullscreen')}
                  title={fullscreen ? t('vidExitFullscreen') : t('vidFullscreen')}
                  className={iconBtn}
                >
                  {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {title && <h2 className="mt-3 text-base font-semibold">{title}</h2>}
        <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>{captionText(scenes[shot]?.narration ?? '')}</p>
      </div>

      {/* Chapter rail (vertical on desktop, horizontal on mobile) — same as the Video rail */}
      <aside className="lg:w-64 flex-shrink-0">
        <div className="mb-2">
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
            {t('vidSwipes')} ({scenes.length})
          </span>
        </div>
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[70vh] pb-2 lg:pb-0 scrollbar-hide">
          {scenes.map((s, i) => (
            <button
              key={`${s.clip.id}-${i}`}
              type="button"
              onClick={() => play(i)}
              className="relative flex-shrink-0 w-40 lg:w-full aspect-video rounded-lg overflow-hidden border-2 transition-all"
              style={{ borderColor: i === shot ? 'var(--accent-primary)' : 'transparent', backgroundColor: 'var(--ui-bg-elevated)' }}
            >
              {s.clip.image && <img src={s.clip.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
              <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">{i + 1}/{scenes.length}</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
    {belowPlayer}
    </>
  );
}
