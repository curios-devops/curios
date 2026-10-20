// Cinematic — real-footage montage, on the same template as Video (tabs Video / Narrative /
// Sources; main viewer + shot rail). One Pexels clip per shot, cut on the narration: each shot's
// sentence is spoken (ElevenLabs, sentence by sentence) while its clip plays. Captions are drawn
// by the player — fixed type scale, max 2 lines, dark plate behind white text — never burned in,
// and switched with a YouTube-style CC button in the player's control bar.
import { useEffect, useRef, useState } from 'react';
import { Captions, Loader2, Pause, Play, RotateCcw } from 'lucide-react';
import { useSession } from '../../../hooks/useSession.ts';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { VOICES } from '../../character/voices.ts';
import { ParagraphNarrator, type NarratorState } from '../audio/paragraphNarrator.ts';
import { loadNarratorVoice } from '../audio/narratorPrefs.ts';
import { captionChunks, captionFit, chunkAt, findClips, planCinematic, type CinematicScene } from './cinematicPlan.ts';

const CAPTIONS_KEY = 'cinematicCaptions';
const readCaptions = () => { try { return localStorage.getItem(CAPTIONS_KEY) !== 'off'; } catch { return true; } };
const CONTROL_BAR = 44; // px — captions sit above it, as on YouTube

export type CinematicTab = 'video' | 'narrative' | 'sources';

export default function CinematicMontage({ question, tab, onFail }: { question: string; tab: CinematicTab; onFail: (reason: string) => void }) {
  const { session } = useSession();
  const { t } = useTranslation();
  const [stage, setStage] = useState<'planning' | 'footage' | 'ready'>('planning');
  const [title, setTitle] = useState('');
  const [scenes, setScenes] = useState<CinematicScene[]>([]);
  const [shot, setShot] = useState(0);
  const [narration, setNarration] = useState<NarratorState | 'idle'>('idle');
  const [captionsOn, setCaptionsOn] = useState(readCaptions);
  const [chunk, setChunk] = useState(0);
  const narratorRef = useRef<ParagraphNarrator | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const timing = useRef({ start: 0, duration: 0, pausedAt: 0 });
  const playerRef = useRef<HTMLDivElement | null>(null);
  const [playerWidth, setPlayerWidth] = useState(800);
  const fit = captionFit(playerWidth);
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;

  useEffect(() => {
    let alive = true;
    (async () => {
      const plan = await planCinematic(question);
      if (!alive) return;
      setTitle(plan.title);
      setStage('footage');
      const found = await findClips(plan);
      if (!alive) return;
      setScenes(found);
      setStage('ready');
    })().catch((err) => alive && onFailRef.current(err instanceof Error ? err.message : String(err)));
    return () => { alive = false; narratorRef.current?.stop(); };
  }, [question]);

  // Caption size and line length follow the player's real width.
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
      if (i === shot && narration !== 'paused' && tab === 'video') void v.play().catch(() => {});
      else v.pause();
    });
  }, [shot, narration, scenes.length, tab]);

  // Caption card follows the time spoken within the current shot.
  useEffect(() => {
    if (narration !== 'playing') return;
    const id = window.setInterval(() => {
      const { start, duration } = timing.current;
      const chunks = captionChunks(scenes[shot]?.narration ?? '', fit.maxChars);
      setChunk(chunkAt(chunks, (performance.now() - start) / 1000, duration));
    }, 150);
    return () => window.clearInterval(id);
  }, [narration, shot, scenes, fit.maxChars]);

  /** Starts the film at `from` (0 = beginning; the rail jumps to a shot). */
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
    );
    narratorRef.current = narrator;
    setShot(from);
    void narrator.start(from);
  };

  const togglePause = () => {
    const n = narratorRef.current;
    if (!n || narration === 'ended') return play();
    if (narration === 'playing') {
      timing.current.pausedAt = performance.now();
      n.pause();
    } else if (narration === 'paused') {
      timing.current.start += performance.now() - timing.current.pausedAt;
      n.resume();
    }
  };

  const toggleCaptions = () => {
    setCaptionsOn((on) => {
      try { localStorage.setItem(CAPTIONS_KEY, on ? 'off' : 'on'); } catch { /* storage blocked */ }
      return !on;
    });
  };

  // Leaving the Video tab pauses the film (it resumes where it was).
  useEffect(() => {
    if (tab !== 'video' && narration === 'playing') togglePause();
  }, [tab]);

  if (stage !== 'ready') {
    return (
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center gap-3 text-white/70">
        <Loader2 size={28} className="animate-spin" />
        <span className="text-sm">{t(stage === 'planning' ? 'vidStage_planning' : 'vidStage_footage')}</span>
      </div>
    );
  }

  const credits = [...new Map(scenes.map((s) => [s.clip.credit, s.clip])).values()];

  if (tab === 'narrative') {
    return (
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
        {title && <h2 className="text-xl font-semibold mb-3">{title}</h2>}
        <div className="space-y-3 text-base leading-relaxed">
          {scenes.map((s, i) => <p key={i}>{s.narration}</p>)}
        </div>
      </div>
    );
  }

  if (tab === 'sources') {
    return (
      <div className="space-y-3">
        {credits.map((c) => (
          <a
            key={c.id}
            href={c.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-4 p-4 rounded-xl transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--ui-bg-elevated)' }}
          >
            {c.image && <img src={c.image} alt="" className="w-28 aspect-video object-cover rounded-lg flex-shrink-0" loading="lazy" />}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <img src="https://www.google.com/s2/favicons?domain=pexels.com&sz=32" alt="" className="w-4 h-4 rounded-sm" loading="lazy" />
                <span className="text-xs font-medium" style={{ color: 'var(--ui-text-muted)' }}>pexels.com</span>
              </div>
              <p className="text-sm font-semibold">{t('vidFootageBy').replace('{name}', c.credit)}</p>
            </div>
          </a>
        ))}
      </div>
    );
  }

  const started = narration !== 'idle';
  const lines = captionChunks(scenes[shot]?.narration ?? '', fit.maxChars)[chunk] ?? [];
  const playLabel = narration === 'playing' ? t('vidPause') : narration === 'ended' ? t('vidReplay') : t('vidPlay');

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div ref={playerRef} className="relative rounded-xl overflow-hidden bg-black aspect-video">
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
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
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

          {/* Control bar, YouTube style: play/pause and shot count on the left, CC on the right. */}
          {started && (
            <div
              className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 text-white"
              style={{ height: CONTROL_BAR, background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}
            >
              <div className="flex items-center gap-3">
                <button type="button" onClick={togglePause} aria-label={playLabel} title={playLabel} className="p-1.5 hover:opacity-80">
                  {narration === 'ended' ? <RotateCcw size={20} /> : narration === 'playing' ? <Pause size={20} /> : <Play size={20} />}
                </button>
                {narration === 'loading' && <Loader2 size={16} className="animate-spin opacity-80" />}
                <span className="text-xs tabular-nums opacity-90">{shot + 1} / {scenes.length}</span>
              </div>
              <button
                type="button"
                onClick={toggleCaptions}
                aria-pressed={captionsOn}
                aria-label={t('vidCaptions')}
                title={t('vidCaptions')}
                className="relative p-1.5 hover:opacity-80"
              >
                <Captions size={22} />
                {/* On = a bar under the icon, as on YouTube (in our accent) */}
                {captionsOn && <span className="absolute left-1.5 right-1.5 -bottom-0.5 h-[3px] rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />}
              </button>
            </div>
          )}
        </div>

        {title && <h2 className="mt-3 text-base font-semibold">{title}</h2>}
        <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>{scenes[shot]?.narration}</p>
      </div>

      {/* Shot rail (vertical on desktop, horizontal on mobile) — same as the Video swipes rail */}
      <aside className="lg:w-64 flex-shrink-0">
        <div className="mb-2">
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
            {t('vidShots')} ({scenes.length})
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
  );
}
