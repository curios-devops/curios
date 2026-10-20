// Cinematic — real-footage montage. One Pexels clip per shot, cut on the narration: each shot's
// sentence is spoken (ElevenLabs, sentence by sentence) while its clip plays, and captions are
// drawn by the player — fixed type scale, max 2 lines × 42 characters, bottom safe area, dark
// plate behind white text — instead of being burned into the video (the old tiny Arial-22 look).
import { useEffect, useRef, useState } from 'react';
import { Captions, Loader2, Pause, Play, RotateCcw } from 'lucide-react';
import { useSession } from '../../../hooks/useSession.ts';
import { VOICES } from '../../character/voices.ts';
import { ParagraphNarrator, type NarratorState } from '../audio/paragraphNarrator.ts';
import { loadNarratorVoice } from '../audio/narratorPrefs.ts';
import { captionChunks, captionFit, chunkAt, findClips, planCinematic, type CinematicScene } from './cinematicPlan.ts';

const CAPTIONS_KEY = 'cinematicCaptions';
const readCaptions = () => { try { return localStorage.getItem(CAPTIONS_KEY) !== 'off'; } catch { return true; } };

export default function CinematicMontage({ question, onFail }: { question: string; onFail: (reason: string) => void }) {
  const { session } = useSession();
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
  }, [stage]);

  // The visible clip plays; the others wait at their start, muted (narration is the soundtrack).
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === shot && narration !== 'paused') void v.play().catch(() => {});
      else v.pause();
    });
  }, [shot, narration, scenes.length]);

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

  const play = () => {
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
    void narrator.start(0);
  };

  const togglePause = () => {
    const n = narratorRef.current;
    if (!n) return play();
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

  if (stage !== 'ready') {
    return (
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center gap-3 text-white/70">
        <Loader2 size={28} className="animate-spin" />
        <span className="text-sm">{stage === 'planning' ? 'Planning the shots…' : 'Finding real footage…'}</span>
      </div>
    );
  }

  const started = narration !== 'idle';
  const lines = captionChunks(scenes[shot]?.narration ?? '', fit.maxChars)[chunk] ?? [];

  return (
    <div>
      <div ref={playerRef} className="relative rounded-xl overflow-hidden bg-black aspect-video" style={{ containerType: 'inline-size' }}>
        {scenes.map((s, i) => (
          <video
            key={`${s.clip.id}-${i}`}
            ref={(el) => { videoRefs.current[i] = el; }}
            src={s.clip.url}
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
            onClick={play}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.2))' }}
          >
            <span className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}>
              <Play size={28} className="ml-1" />
            </span>
            {title && <span className="px-6 text-center font-semibold" style={{ fontSize: 'clamp(18px, 4.5cqw, 40px)', lineHeight: 1.2 }}>{title}</span>}
          </button>
        )}

        {/* Captions: the player owns size and placement (never the model). */}
        {started && captionsOn && lines.length > 0 && (
          <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ bottom: '7%', paddingInline: '7%' }}>
            <p
              className="flex flex-col items-center text-center font-semibold text-white"
              style={{ fontSize: fit.fontPx, lineHeight: 1.35, maxWidth: '86%' }}
            >
              {lines.map((line, i) => (
                <span key={i} className="inline-block rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.72)', padding: '0.12em 0.5em', margin: '0.06em 0' }}>
                  {line}
                </span>
              ))}
            </p>
          </div>
        )}

        {narration === 'loading' && started && (
          <div className="absolute top-3 right-3 text-white/80"><Loader2 size={18} className="animate-spin" /></div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={narration === 'ended' ? play : togglePause}
            className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
            aria-label={narration === 'playing' ? 'Pause' : narration === 'ended' ? 'Replay' : 'Play'}
          >
            {narration === 'ended' ? <RotateCcw size={16} /> : narration === 'playing' ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <div className="flex gap-1">
            {scenes.map((_, i) => (
              <span key={i} className="h-1 rounded-full transition-all" style={{ width: i === shot ? 20 : 10, backgroundColor: i === shot ? 'var(--accent-primary)' : 'var(--ui-bg-elevated)' }} />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleCaptions}
          aria-pressed={captionsOn}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
          style={captionsOn
            ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }
            : { backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-secondary)' }}
        >
          <Captions size={14} /> {captionsOn ? 'Captions on' : 'Captions off'}
        </button>
      </div>

      {title && <h2 className="mt-3 text-base font-semibold">{title}</h2>}
      <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>{scenes[shot]?.narration}</p>

      {/* Footage credits (Pexels license: free to use; credit is the right thing to do) */}
      <p className="mt-4 text-xs" style={{ color: 'var(--ui-text-muted)' }}>
        Footage from Pexels:{' '}
        {[...new Map(scenes.map((s) => [s.clip.credit, s.clip])).values()].map((c, i, all) => (
          <span key={c.id}>
            <a href={c.pageUrl} target="_blank" rel="noopener noreferrer" className="underline">{c.credit}</a>
            {i < all.length - 1 ? ', ' : ''}
          </span>
        ))}
      </p>
    </div>
  );
}
