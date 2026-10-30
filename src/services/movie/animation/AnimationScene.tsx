// Animation (Video page type): the answer as a live stage written by Luna/Sol/Astra — a 3D machine
// you can turn, zoom and run (after Marble's experiments and the anatomy figures), or an animated
// story in a famous explainer style (Kurzgesagt, TED-Ed paper, 3Blue1Brown chalk), chosen per question.
// The stage is only the art (a sandboxed page, stage.ts); everything around it is Curios: the
// question with its key word, the steps, the narrator (ElevenLabs, the viewer's chosen voice) with a
// one-line caption in step with it, the live numbers, the surprise moment, speed, controls and the big idea.
// Stories play by themselves; machines wait for each step (Manual) unless Auto is on.
// Simulation (its own Video type, after GPT-6's intelligent UI): the answer is a working model to play
// with — its controls come first (sliders, a picker, a switch, pause) and its steps are "try this"
// suggestions that set the controls to telling values. Kept apart from the animation of the same question.
// One animation per question, kept by the server: opening it again is instant.
// Its video is recorded once in the cloud (Cloud Run, /render/animation → RenderPage) and shared by
// everyone; the page gets it through onVideo. On a phone the viewer picks landscape or portrait (TikTok):
// portrait is a second version of the stage, re-composed for the tall frame by the studio and recorded
// too; until it is there the landscape stage shows whole, with bands. Should the cloud recording fail,
// the page mounts an invisible twin (twin) that plays it once, silently, and records it in the browser.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Captions, Loader2, Maximize, Minimize, Palette, Pause, Play, RectangleHorizontal, RectangleVertical, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useSession } from '../../../hooks/useSession.ts';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { decideTier } from '../../auto/modelTier.ts';
import { tts } from '../audio/paragraphNarrator.ts';
import { loadNarratorVoice, narratorGender, NARRATOR_VOICES, saveNarratorVoice } from '../audio/narratorPrefs.ts';
import { captionLines, lineAt, readingSeconds } from './captions.ts';
import { tourKey } from '../tour/tourPlan.ts';
import { findRelatedPosters } from '../cinematic/cinematicPlan.ts';
import { findAnimation, makeAnimation, portraitAnimation, type Animation } from './animationStudio.ts';
import { startRecording, videoSize, type Recording } from './recorder.ts';
import { currentTheme, readManifest, stageDocument, stockSearch, type Manifest, type StageEvent } from './stage.ts';

export interface AnimationInfo {
  /** The animation's key (studio) and what its viewer's movie is made of. */
  key: string;
  question: string;
  title: string;
  bigIdea: string;
  beats: number;
  overview: string;
  related: string[];
  /** A stock picture per related question (Continue exploring), when found. */
  relatedImages?: (string | undefined)[];
}

/** The cloud video of what the player shows (landscape or portrait): url once recorded. */
export interface StageVideo { url: string | null; poster: string | null; render: Animation['render']; portrait: boolean }
/** One recording of the whole animation, made in this browser (render page, twin). */
export interface Film { video: Blob; poster: Blob | null; seconds: number; w: number; h: number }

interface Props {
  question: string;
  /** 'simulation': a model to play with instead of an animation. */
  kind?: 'simulation';
  /** The page's tab: the stage shows on Video only. */
  tab: 'video' | 'hidden';
  belowPlayer?: ReactNode;
  onReady: (info: AnimationInfo) => void;
  onNeedSignIn: () => void;
  onVideo?: (video: StageVideo) => void;
  /** Mount the invisible twin that records it here (the cloud recording failed); its film, or null. */
  twin?: (film: Film | null) => void;
}

type Stage = 'looking' | 'making' | 'ready' | 'nocredits' | 'limit' | 'failed';
/** A narrator voice id, or no voice. */
type Voice = string;
const SPEEDS = [0.5, 1, 2] as const;

export default function AnimationScene({ question, kind, tab, belowPlayer, onReady, onNeedSignIn, onVideo, twin }: Props) {
  const { t } = useTranslation();
  const { session, isLoading: sessionLoading } = useSession();
  const { tier, promptUpgrade } = useProCredits();
  const [stage, setStage] = useState<Stage>('looking');
  const [animation, setAnimation] = useState<Animation | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const cb = useRef({ onReady });
  cb.current = { onReady };
  const signedIn = Boolean(session?.user);

  const key = kind === 'simulation' ? `sim|${tourKey(question)}` : tourKey(question);
  useEffect(() => {
    if (sessionLoading || !question.trim()) return;
    const controller = new AbortController();
    (async () => {
      const found = await findAnimation(key).catch(() => ({ animation: null, making: false, left: 1 }));
      if (controller.signal.aborted) return;
      if (found.animation) return show(found.animation);
      if (!found.making && found.left <= 0) return setStage(tier === 'pro' ? 'limit' : 'nocredits');
      setStage('making');
      // The question's difficulty picks the writer: easy → Luna, complex → Sol (Astra for Pro).
      const rated = await decideTier(question);
      const model = rated === 'easy' ? 'luna' : rated === 'complex' && tier === 'pro' ? 'astra' : 'sol';
      show(await makeAnimation(key, question, model, controller.signal, found.making, kind));
    })().catch((err) => {
      if (controller.signal.aborted) return;
      const msg = String(err instanceof Error ? err.message : err);
      setStage(msg.includes('daily_limit') ? 'limit' : msg.includes('sign_in_required') ? 'nocredits' : 'failed');
    });
    function show(a: Animation) {
      const m = readManifest(a.html, a.kind === 'simulation' ? 0 : 2);
      if (!m) return setStage('failed');
      setAnimation(a);
      setStage('ready');
      const info: AnimationInfo = { key, question: a.question, title: m.title || a.question, bigIdea: m.bigIdea, beats: m.beats.length, overview: [m.bigIdea, ...m.beats.map((b) => b.say)].filter(Boolean).join(' '), related: m.related };
      cb.current.onReady(info);
      // Continue exploring gets its own stock pictures, never holding the animation back.
      void findRelatedPosters({ related: m.related, relatedSearch: m.related.map((q, i) => m.relatedSearch[i] || stockSearch(q, m.title)) }, [])
        .then((relatedImages) => { if (!controller.signal.aborted) cb.current.onReady({ ...info, relatedImages }); });
    }
    return () => controller.abort();
    // tier only matters for a new animation; re-running on it would start another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, kind, signedIn, sessionLoading]);

  // The cloud recording: asked for when the animation was written (or first opened); checked until it is in.
  useEffect(() => {
    if (!animation || (animation.render !== 'queued' && animation.render !== null && animation.render !== undefined)) return;
    const id = setInterval(() => {
      void findAnimation(key).then((f) => { if (f.animation && f.animation.render !== animation.render) setAnimation(f.animation); }).catch(() => undefined);
    }, 8000);
    return () => clearInterval(id);
  }, [animation, key]);

  useEffect(() => {
    if (stage !== 'making') return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [stage]);

  // The twin: an invisible player, off to the side, that plays it once silently and records it.
  const twinPlayer = twin && animation && (
    <div aria-hidden="true" className="fixed left-0 top-0 w-[640px] opacity-0 pointer-events-none -z-10">
      <Player animation={animation} animationKey={key} recorder={{ silent: true, onFilm: twin }} />
    </div>
  );
  if (tab === 'hidden') return twinPlayer || null;
  const label = 'text-[11px] uppercase tracking-[0.08em]';

  if (stage !== 'ready' || !animation) {
    const noCredits = tier === 'guest' ? t('vidAnimNoCreditsGuest') : t('vidAnimNoCreditsFree');
    return (
      <>
        <div className="relative rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-secondary)' }}>
          {stage === 'nocredits' ? (
            <>
              <Palette size={28} />
              <p className="text-sm max-w-sm">{noCredits}</p>
              <button type="button" onClick={tier === 'guest' ? onNeedSignIn : promptUpgrade} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}>
                {tier === 'guest' ? t('vidSignUp') : t('vidGoPro')}
              </button>
            </>
          ) : stage === 'limit' || stage === 'failed' ? (
            <>
              <Palette size={28} />
              <p className="text-sm max-w-sm">{stage === 'limit' ? t('vidAnimLimit') : t('vidAnimFailed')}</p>
            </>
          ) : (
            <>
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
              <p className="text-sm">{stage === 'making' ? t(elapsed < 20 ? 'vidAnimDirecting' : elapsed < 70 ? 'vidAnimBuilding' : 'vidAnimPolishing') : t('vidAnimLooking')}</p>
              {stage === 'making' && <p className={label} style={{ color: 'var(--ui-text-muted)' }}>{t('vidAnimWait')} · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</p>}
            </>
          )}
        </div>
        {belowPlayer}
      </>
    );
  }
  return <><Player animation={animation} animationKey={key} belowPlayer={belowPlayer} onVideo={onVideo} />{twinPlayer}</>;
}

interface Take { rec: Recording; w: number; h: number; started: number; next: number; poster: Promise<Blob | null> }

/**
 * The player. With `recorder` it is a recorder instead: it plays the whole animation once from the start
 * at normal speed with the narrator and hands over the film (null if it couldn't) — `fill` takes the whole
 * window (the cloud render page), `silent` keeps the narrator out of the speakers (the twin).
 */
export function Player({ animation, animationKey, belowPlayer, onVideo, recorder }: {
  animation: Animation; animationKey: string; belowPlayer?: ReactNode; onVideo?: (video: StageVideo) => void;
  recorder?: { silent?: boolean; fill?: boolean; onFilm: (film: Film | null) => void };
}) {
  const { t } = useTranslation();
  const { session } = useSession();
  const simulation = animation.kind === 'simulation';
  const manifest = useMemo(() => readManifest(animation.html, simulation ? 0 : 2) as Manifest, [animation.html, simulation]);
  const machine = animation.kind === 'machine' || simulation; // waits for the viewer, 3D-friendly frame
  const frameRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  // The theme the stage was drawn in; a theme change redraws it.
  const [theme, setTheme] = useState(currentTheme);
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme((old) => { const now = currentTheme(); return JSON.stringify(now) === JSON.stringify(old) ? old : now; }));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    return () => obs.disconnect();
  }, []);
  const [portrait, setPortrait] = useState(false); // phones only: the player (and a saved video) in TikTok's shape
  const [portraitPage, setPortraitPage] = useState<Animation | null>(null);
  const [portraitMaking, setPortraitMaking] = useState(false);
  useEffect(() => {
    if (!portrait || portraitPage) return;
    const controller = new AbortController();
    setPortraitMaking(true);
    portraitAnimation(animationKey, controller.signal)
      .then((a) => { if (readManifest(a.html, 0)) setPortraitPage(a); })
      .catch(() => undefined) // stays landscape, whole
      .finally(() => { if (!controller.signal.aborted) setPortraitMaking(false); });
    return () => { controller.abort(); setPortraitMaking(false); };
  }, [portrait, portraitPage, animationKey]);
  // The portrait version's own cloud recording, checked until it is in.
  useEffect(() => {
    if (!portraitPage || portraitPage.render === 'ready' || portraitPage.render === 'failed') return;
    const id = setInterval(() => {
      void findAnimation(`${animationKey}|portrait`).then((f) => { if (f.animation && f.animation.render !== portraitPage.render) setPortraitPage(f.animation); }).catch(() => undefined);
    }, 8000);
    return () => clearInterval(id);
  }, [portraitPage, animationKey]);
  const shown = portrait && portraitPage ? portraitPage : animation;
  useEffect(() => {
    onVideo?.({ url: shown.videoUrl ?? null, poster: shown.posterUrl ?? null, render: shown.render ?? null, portrait: shown !== animation });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.videoUrl, shown.render, shown]);
  const page = portrait && portraitPage ? portraitPage.html : animation.html;
  const letterbox = portrait && !portraitPage;
  const srcDoc = useMemo(() => stageDocument(page, theme), [page, theme]);

  const [ready, setReady] = useState(false);
  const [auto, setAuto] = useState(!machine);
  const [current, setCurrent] = useState(-1); // the beat playing or last played
  const [playing, setPlaying] = useState(false);
  const [readouts, setReadouts] = useState<Record<string, number>>({});
  const [callout, setCallout] = useState('');
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [controls, setControls] = useState<Record<string, number | string>>(() => Object.fromEntries(manifest.controls.map((c) => [c.id, c.value])));
  const [paused, setPaused] = useState(false);
  const setControl = (id: string, value: number | string) => { setControls((s) => ({ ...s, [id]: value })); send({ cmd: 'set', id, value }); };
  const [voice, setVoice] = useState<Voice>(() => loadNarratorVoice(session?.user));
  const [voiceMenu, setVoiceMenu] = useState(false);
  const voiceMenuRef = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState('');
  const [captionsOn, setCaptionsOn] = useState(() => { try { return localStorage.getItem('animationCaptions') !== 'off'; } catch { return true; } });
  const [fullscreen, setFullscreen] = useState(false);
  const take = useRef<Take | null>(null);
  const captionRef = useRef('');
  captionRef.current = caption;
  const run = useRef({ auto, voice, token: 0 });
  run.current.auto = auto;
  run.current.voice = voice;
  const doneRef = useRef<((i: number) => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const send = (msg: Record<string, unknown>) => frameRef.current?.contentWindow?.postMessage({ curios: 1, ...msg }, '*');

  useEffect(() => {
    dropTake(); // a new stage (theme, portrait version) breaks a recording
    setReady(false);
    setCurrent(-1);
    setCallout('');
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const m = e.data as StageEvent & { curios?: number };
      if (!m?.curios) return;
      if (m.ev === 'ready') setReady(true);
      else if (m.ev === 'readouts') setReadouts((r) => ({ ...r, ...m.values }));
      else if (m.ev === 'controls') setControls((c) => ({ ...c, ...m.values })); // the stage moved them (a suggestion, a drag)
      else if (m.ev === 'callout') setCallout(m.text);
      else if (m.ev === 'done') doneRef.current?.(m.i);
      else if (m.ev === 'frame') { if (take.current) take.current.rec.frame(m.bitmap, captionRef.current); else m.bitmap.close(); }
      else if (m.ev === 'error') console.warn('[animation stage]', m.message);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [srcDoc]);

  // A stage that never says ready (a slow library, a quiet bug) still gets played after a few seconds.
  useEffect(() => {
    if (ready) return;
    const id = setTimeout(() => setReady(true), 6000);
    return () => clearTimeout(id);
  }, [ready, srcDoc]);

  /** Voice line i, resolved when it has been said (at once when the voice is off or fails). The caption
   *  follows the voice line by line; without a voice it follows the reading pace. */
  const say = async (i: number, token: number): Promise<void> => {
    const v = run.current.voice;
    const text = manifest.beats[i].say;
    const lines = captionLines(text);
    const show = (done: number) => { if (run.current.token === token) setCaption(lines[lineAt(lines, Math.min(1, done))]); };
    const paced = () => {
      const start = performance.now(), total = readingSeconds(text) * 1000;
      const id = setInterval(() => {
        const done = (performance.now() - start) / total;
        show(done);
        if (done >= 1 || run.current.token !== token) clearInterval(id);
      }, 250);
    };
    show(0);
    if (v === 'off') return paced();
    try {
      const sound = await tts(text, v, narratorGender(v), new AbortController().signal);
      if (run.current.token !== token) return;
      const url = URL.createObjectURL(new Blob([sound], { type: 'audio/mpeg' }));
      const audio = new Audio(url);
      audioRef.current = audio;
      take.current?.rec.voice(audio);
      audio.ontimeupdate = () => { if (audio.duration) show(audio.currentTime / audio.duration); };
      await new Promise<void>((resolve) => { audio.onended = audio.onerror = () => resolve(); audio.play().catch(() => { paced(); resolve(); }); });
      URL.revokeObjectURL(url);
    } catch { paced(); }
  };

  /** Plays beat i on the stage with its narration; with Auto on, goes on to the next. */
  const play = async (i: number) => {
    if (take.current && i !== take.current.next) dropTake(); // the run was broken: not one whole video
    const token = ++run.current.token;
    audioRef.current?.pause();
    setCurrent(i);
    setPlaying(true);
    // The next line is fetched while this one plays, so the voice doesn't wait between beats.
    const next = manifest.beats[i + 1];
    if (next && run.current.voice !== 'off') void tts(next.say, run.current.voice, narratorGender(run.current.voice), new AbortController().signal).catch(() => undefined);
    const beatDone = new Promise<void>((resolve) => {
      doneRef.current = (k) => { if (k === i) resolve(); };
      setTimeout(resolve, 45000); // a beat that never reports back
    });
    send({ cmd: 'beat', i });
    await Promise.all([beatDone, say(i, token)]);
    if (run.current.token !== token) return;
    setPlaying(false);
    const t = take.current;
    if (t && t.next === i) {
      if (i === 0) t.poster = t.rec.poster();
      t.next = i + 1;
      if (t.next === manifest.beats.length) void finishTake();
    }
    if (run.current.auto && i + 1 < manifest.beats.length) void play(i + 1);
  };

  const restart = () => {
    dropTake();
    run.current.token++;
    audioRef.current?.pause();
    send({ cmd: 'reset' });
    setCurrent(-1);
    setPlaying(false);
    setCallout('');
    setCaption('');
  };

  // Stories start by themselves once the stage is ready; a recorder records its one run instead.
  const started = useRef(false);
  useEffect(() => {
    if (!ready || started.current || (machine && !recorder)) return;
    started.current = true;
    void (recorder ? recordRun() : play(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  useEffect(() => () => { run.current.token++; audioRef.current?.pause(); dropTake(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A recorder's take: the whole animation, first beat to last at normal speed. Anything that breaks the run
  // (a step out of order, restart, a speed change, pause, a new stage) drops it, and the film is null.
  async function beginTake(): Promise<boolean> {
    // The video takes the player's shape; the stage is fitted into it whole.
    const box = frameRef.current?.getBoundingClientRect(), shape = playerRef.current?.getBoundingClientRect();
    if (!box?.width || !shape?.width || take.current) return false;
    const { w, h } = videoSize(shape.width, shape.height);
    let r: Recording;
    try { r = await startRecording(w, h, 1000, recorder?.silent); } catch { return false; }
    // Silent and without sound the narrator would play out loud and be missing from the video.
    if (recorder?.silent && !r.withSound && run.current.voice !== 'off') { void r.stop(); return false; }
    take.current = { rec: r, w, h, started: performance.now(), next: 0, poster: Promise.resolve(null) };
    send({ cmd: 'capture', on: true, scale: Math.min(w / box.width, h / box.height) });
    return true;
  }
  function dropTake() {
    const t = take.current;
    if (!t) return;
    take.current = null;
    send({ cmd: 'capture', on: false });
    void t.rec.stop();
    recorder?.onFilm(null);
  }
  async function finishTake() {
    const t = take.current;
    if (!t) return;
    await new Promise((r) => setTimeout(r, 800)); // the last picture stays a moment
    if (take.current !== t) return;
    take.current = null;
    send({ cmd: 'capture', on: false });
    const video = await t.rec.stop();
    recorder?.onFilm({ video, poster: await t.poster, seconds: (performance.now() - t.started) / 1000, w: t.w, h: t.h });
  }
  async function recordRun() {
    setAuto(false);
    run.current.auto = false;
    if (!(await beginTake())) return recorder?.onFilm(null);
    await new Promise((r) => setTimeout(r, 600)); // the first pictures
    for (let i = 0; i < manifest.beats.length && take.current; i++) await play(i);
  }

  useEffect(() => { if (speed !== 1) dropTake(); send({ cmd: 'speed', x: speed }); }, [speed, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseVoice = (v: Voice) => {
    setVoice(v);
    setVoiceMenu(false);
    if (v === 'off') audioRef.current?.pause();
    else saveNarratorVoice(v, session?.user);
  };
  useEffect(() => {
    if (!voiceMenu) return;
    const close = (e: MouseEvent) => { if (!voiceMenuRef.current?.contains(e.target as Node)) setVoiceMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [voiceMenu]);
  const narrator = NARRATOR_VOICES.find((x) => x.id === voice);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    const el = playerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => setFullscreen((f) => !f));
    else setFullscreen((f) => !f); // iPhone: no element fullscreen → fill the window
  };
  const pseudoFull = fullscreen && !document.fullscreenElement;

  const label = 'text-[11px] uppercase tracking-[0.08em]';
  const nextBeat = current + 1;
  const title = manifest.title || animation.question;
  const hi = manifest.highlight ? title.toLowerCase().indexOf(manifest.highlight.toLowerCase()) : -1;
  const pill = (on: boolean) => (on ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' } : { color: 'var(--ui-text-secondary)' });

  const controlsUi = manifest.controls.map((c) => (
    <div key={c.id} className="flex items-center gap-3 text-sm" style={{ color: 'var(--ui-text-secondary)' }}>
      <span className="w-28 sm:w-36 flex-shrink-0">{c.label}</span>
      {c.type === 'range' ? (
        <>
          <input type="range" min={c.min} max={c.max} step={c.step} value={Number(controls[c.id])} onChange={(e) => setControl(c.id, Number(e.target.value))} aria-label={c.label} className="flex-1 min-w-0" style={{ accentColor: 'var(--accent-primary)' }} />
          <span className="w-20 text-right tabular-nums" style={{ color: 'var(--ui-text-primary)' }}>{formatValue(Number(controls[c.id]))} {c.unit}</span>
        </>
      ) : c.type === 'choice' ? (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide" role="group" aria-label={c.label}>
          {c.options.map((o) => (
            <button key={String(o.value)} type="button" onClick={() => setControl(c.id, o.value)} aria-pressed={controls[c.id] === o.value} className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors" style={controls[c.id] === o.value ? { backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' } : { borderColor: 'var(--ui-border-default)', color: 'var(--ui-text-primary)' }}>
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" role="switch" aria-checked={Boolean(controls[c.id])} aria-label={c.label} onClick={() => setControl(c.id, controls[c.id] ? 0 : 1)} className="relative w-10 h-6 rounded-full transition-colors" style={{ backgroundColor: controls[c.id] ? 'var(--accent-primary)' : 'var(--ui-border-default)' }}>
          <span className="absolute top-1 w-4 h-4 rounded-full transition-all" style={{ left: controls[c.id] ? '1.25rem' : '0.25rem', backgroundColor: 'var(--ui-bg-elevated)' }} />
        </button>
      )}
    </div>
  ));

  return (
    <>
      {/* The question, its key word in the accent (Marble). */}
      <h2 className="font-bricolage text-2xl sm:text-4xl font-bold leading-tight tracking-tight mb-3" style={{ color: 'var(--ui-text-primary)' }}>
        {hi >= 0 ? <>{title.slice(0, hi)}<span style={{ color: 'var(--accent-primary)' }}>{title.slice(hi, hi + manifest.highlight.length)}</span>{title.slice(hi + manifest.highlight.length)}</> : title}
      </h2>

      <div
        ref={playerRef}
        className={`overflow-hidden ${pseudoFull || recorder?.fill ? 'fixed inset-0 z-[200]' : `relative rounded-xl ${portrait ? 'mx-auto max-w-[calc(80vh*9/16)] aspect-[9/16] sm:max-w-none sm:aspect-video' : machine ? 'aspect-[4/5] sm:aspect-video' : 'aspect-video'}`}`}
        style={{ backgroundColor: theme.ground }}
      >
        <iframe ref={frameRef} title={title} srcDoc={srcDoc} sandbox="allow-scripts" className={`absolute border-0 ${letterbox ? 'inset-x-0 top-1/2 -translate-y-1/2 w-full aspect-video' : 'inset-0 w-full h-full'}`} />
        {portraitMaking && (
          <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white pointer-events-none ${label}`} style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
            <Loader2 size={12} className="animate-spin" /> {t('vidAnimPortraitMaking')}
          </span>
        )}

        {/* Live numbers from the stage's model, and the surprise moment. */}
        {manifest.readouts.length > 0 && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
            <div className="flex flex-wrap justify-end gap-1.5">
              {manifest.readouts.map((r) => (
                <div key={r.id} className="rounded-lg px-2.5 py-1.5 text-right" style={{ backgroundColor: 'var(--ui-bg-elevated)', border: '1px solid var(--ui-border-default)' }}>
                  <p className={`${label} leading-none`} style={{ color: 'var(--ui-text-muted)' }}>{r.label}</p>
                  <p className="text-sm sm:text-base font-semibold tabular-nums leading-tight" style={{ color: 'var(--ui-text-primary)' }}>
                    {readouts[r.id] === undefined ? '–' : formatValue(readouts[r.id])}<span className="text-xs font-normal ml-0.5" style={{ color: 'var(--ui-text-secondary)' }}>{r.unit}</span>
                  </p>
                </div>
              ))}
            </div>
            {callout && <span key={callout} className="anim-callout px-3 py-1 rounded-full text-xs sm:text-sm font-semibold" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}>{callout}</span>}
          </div>
        )}

        {captionsOn && caption && (
          <div className="absolute inset-x-0 bottom-12 flex justify-center px-3 pointer-events-none">
            <p className="px-2 py-0.5 rounded text-sm sm:text-base text-center text-white" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>{caption}</p>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 py-2 text-white" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
          {/* The narrator: one button, the voices in its menu (the viewer's last choice is kept). */}
          <div className="relative" ref={voiceMenuRef}>
            <button type="button" onClick={() => setVoiceMenu((o) => !o)} aria-expanded={voiceMenu} aria-label={t('vidAnimVoice')} title={t('vidAnimVoice')} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(0,0,0,0.5)' }}>
              {narrator ? <Volume2 size={14} /> : <VolumeX size={14} />} {narrator?.name ?? t('vidAnimVoice_off')}
            </button>
            {voiceMenu && (
              <div className="absolute left-0 bottom-full mb-2 p-1 rounded-lg border shadow-lg w-max min-w-[160px] max-h-40 overflow-y-auto z-10" role="menu" style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}>
                {[...NARRATOR_VOICES.map((v) => ({ id: v.id, name: v.name, note: t(v.gender === 'male' ? 'voiceMale' : 'voiceFemale') })), { id: 'off', name: t('vidAnimVoice_off'), note: '' }].map((o) => (
                  <button key={o.id} type="button" role="menuitemradio" aria-checked={voice === o.id} onClick={() => chooseVoice(o.id)} className="w-full flex items-center justify-between gap-4 px-2 py-1.5 rounded-md text-sm" style={{ color: voice === o.id ? 'var(--accent-primary)' : 'var(--ui-text-primary)' }}>
                    <span>{o.name}</span><span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>{o.note}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex rounded-full p-0.5" style={{ background: 'rgba(0,0,0,0.5)' }} role="group" aria-label={t('vidAnimSpeed')}>
            {SPEEDS.map((x) => (
              <button key={x} type="button" onClick={() => setSpeed(x)} aria-pressed={speed === x} className="px-2 py-1 rounded-full text-xs font-semibold tabular-nums" style={speed === x ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' } : { color: '#fff' }}>
                ×{x}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { if (!paused) dropTake(); setPaused((p) => !p); send({ cmd: 'pause', paused: !paused }); }} aria-label={paused ? t('vidAnimPlay') : t('vidAnimPause')} title={paused ? t('vidAnimPlay') : t('vidAnimPause')} className="p-1">
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <span className={`hidden sm:block ml-1 text-white/70 truncate ${label}`}>{animation.kind === 'machine' ? t('vidAnimHint3d') : ''}</span>
          <button type="button" onClick={() => setCaptionsOn((on) => { try { localStorage.setItem('animationCaptions', on ? 'off' : 'on'); } catch { /* storage blocked */ } return !on; })} aria-pressed={captionsOn} aria-label={t('vidCaptions')} title={t('vidCaptions')} className="ml-auto p-1" style={{ opacity: captionsOn ? 1 : 0.5 }}>
            <Captions size={18} />
          </button>
          <button type="button" onClick={toggleFullscreen} title={fullscreen ? t('vidExitFullscreen') : t('vidFullscreen')} aria-label={fullscreen ? t('vidExitFullscreen') : t('vidFullscreen')} className="p-1">
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
          </div>
        )}
      </div>

      {/* The steps: Manual waits for each press (the next one pulses), Auto plays them all.
          A simulation shows its controls first and its steps as "try this" suggestions, in any order. */}
      <section className="mt-4 space-y-3">
        {simulation && controlsUi}
        {simulation && manifest.beats.length > 0 && <p className={label} style={{ color: 'var(--ui-text-muted)' }}>{t('vidSimTry')}</p>}
        <div className={`flex flex-wrap items-center gap-2 ${simulation ? 'hidden' : ''}`}>
          <div className="flex rounded-full p-0.5 border" style={{ borderColor: 'var(--ui-border-default)' }} role="group">
            {([false, true] as const).map((a) => (
              <button key={String(a)} type="button" onClick={() => { setAuto(a); if (a && !playing && nextBeat < manifest.beats.length) void play(Math.max(0, nextBeat)); }} aria-pressed={auto === a} className="px-3 py-1 rounded-full text-xs font-semibold transition-colors" style={pill(auto === a)}>
                {a ? t('vidAnimAuto') : t('vidAnimManual')}
              </button>
            ))}
          </div>
          <button type="button" onClick={restart} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full disabled:opacity-40" style={{ color: 'var(--ui-text-secondary)' }}>
            <RotateCcw size={13} /> {t('vidAnimRestart')}
          </button>
          <div className="sm:hidden ml-auto flex rounded-full p-0.5 border" style={{ borderColor: 'var(--ui-border-default)' }} role="group">
            {([false, true] as const).map((p) => (
              <button key={String(p)} type="button" onClick={() => { dropTake(); setPortrait(p); }} aria-pressed={portrait === p} aria-label={t(p ? 'vidAnimPortrait' : 'vidAnimLandscape')} title={t(p ? 'vidAnimPortrait' : 'vidAnimLandscape')} className="px-2.5 py-1 rounded-full" style={pill(portrait === p)}>
                {p ? <RectangleVertical size={14} /> : <RectangleHorizontal size={14} />}
              </button>
            ))}
          </div>
        </div>
        <ol className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {manifest.beats.map((b, i) => {
            const live = i === current, done = i < current || (i === current && !playing), next = i === nextBeat && !playing;
            const enabled = ready && (i <= nextBeat || !machine || simulation);
            return (
              <li key={i} className="flex-shrink-0">
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => void play(i)}
                  className={`inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full border text-sm transition-colors disabled:cursor-not-allowed ${next && !auto && !simulation ? 'anim-next' : ''}`}
                  style={{
                    borderColor: live || next ? 'var(--accent-primary)' : 'var(--ui-border-default)',
                    backgroundColor: live ? 'var(--accent-primary)' : 'var(--ui-bg-elevated)',
                    color: live ? 'var(--ui-text-on-accent)' : 'var(--ui-text-primary)',
                    opacity: !enabled ? 0.45 : done && !live ? 0.6 : 1,
                  }}
                >
                  <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-semibold" style={{ border: '1px solid currentColor' }}>
                    {next && !auto && !live && !simulation ? <Play size={11} /> : i + 1}
                  </span>
                  {b.label}
                </button>
              </li>
            );
          })}
        </ol>
        {!simulation && controlsUi}
        {manifest.bigIdea && (
          <p className="text-sm sm:text-base" style={{ color: 'var(--ui-text-primary)' }}>
            <span className={`${label} mr-2`} style={{ color: 'var(--accent-primary)' }}>{t('vidAnimBigIdea')}</span>{manifest.bigIdea}
          </p>
        )}
      </section>
      {belowPlayer}
    </>
  );
}

function formatValue(v: number): string {
  const a = Math.abs(v);
  return a >= 1000 ? Math.round(v).toLocaleString() : a >= 10 ? v.toFixed(0) : a >= 1 ? v.toFixed(1) : v.toFixed(2);
}
