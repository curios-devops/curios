// Animation (Video page type): the answer as a live stage written by Luna/Sol/Astra — a 3D machine
// you can turn, zoom and run (after Marble's experiments and the anatomy figures), or an animated
// story in a famous explainer style (Kurzgesagt, TED-Ed paper, 3Blue1Brown chalk), chosen per question.
// The stage is only the art (a sandboxed page, stage.ts); everything around it is Curios: the
// question with its key word, the steps, the narrator (ElevenLabs, a woman's or a man's voice), the
// live numbers, the surprise moment, speed, controls and the big idea.
// Stories play by themselves; machines wait for each step (Manual) unless Auto is on.
// Simulation (its own Video type, after GPT-6's intelligent UI): the answer is a working model to play
// with — its controls come first (sliders, a picker, a switch, pause) and its steps are "try this"
// suggestions that set the controls to telling values. Kept apart from the animation of the same question.
// One animation per question, kept by the server: opening it again is instant.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Loader2, Maximize, Mars, Minimize, Palette, Pause, Play, RotateCcw, Rotate3d, SlidersHorizontal, Venus, VolumeX } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useSession } from '../../../hooks/useSession.ts';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { decideTier } from '../../auto/modelTier.ts';
import { tts } from '../audio/paragraphNarrator.ts';
import { loadNarratorVoice, narratorGender, NARRATOR_VOICES, saveNarratorVoice } from '../audio/narratorPrefs.ts';
import { tourKey } from '../tour/tourPlan.ts';
import { findAnimation, makeAnimation, type Animation } from './animationStudio.ts';
import { currentTheme, readManifest, stageDocument, type Manifest, type StageEvent } from './stage.ts';

export interface AnimationInfo {
  title: string;
  overview: string;
  related: string[];
}

interface Props {
  question: string;
  /** 'simulation': a model to play with instead of an animation. */
  kind?: 'simulation';
  /** The page's tab: the stage shows on Video only. */
  tab: 'video' | 'hidden';
  belowPlayer?: ReactNode;
  onReady: (info: AnimationInfo) => void;
  onNeedSignIn: () => void;
}

type Stage = 'looking' | 'making' | 'ready' | 'nocredits' | 'limit' | 'failed';
type Voice = 'female' | 'male' | 'off';
const SPEEDS = [0.5, 1, 2] as const;

export default function AnimationScene({ question, kind, tab, belowPlayer, onReady, onNeedSignIn }: Props) {
  const { t } = useTranslation();
  const { session, isLoading: sessionLoading } = useSession();
  const { tier, promptUpgrade } = useProCredits();
  const [stage, setStage] = useState<Stage>('looking');
  const [animation, setAnimation] = useState<Animation | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const cb = useRef({ onReady });
  cb.current = { onReady };
  const signedIn = Boolean(session?.user);

  useEffect(() => {
    if (sessionLoading || !question.trim()) return;
    const controller = new AbortController();
    const key = kind === 'simulation' ? `sim|${tourKey(question)}` : tourKey(question);
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
      cb.current.onReady({ title: m.title, overview: [m.bigIdea, ...m.beats.map((b) => b.say)].filter(Boolean).join(' '), related: m.related });
    }
    return () => controller.abort();
    // tier only matters for a new animation; re-running on it would start another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, kind, signedIn, sessionLoading]);

  useEffect(() => {
    if (stage !== 'making') return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [stage]);

  if (tab === 'hidden') return null;
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
  return <Player animation={animation} belowPlayer={belowPlayer} />;
}

function Player({ animation, belowPlayer }: { animation: Animation; belowPlayer?: ReactNode }) {
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
  const srcDoc = useMemo(() => stageDocument(animation.html, theme), [animation.html, theme]);

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
  const [voice, setVoice] = useState<Voice>(() => narratorGender(loadNarratorVoice(session?.user)));
  const [fullscreen, setFullscreen] = useState(false);
  const run = useRef({ auto, voice, token: 0 });
  run.current.auto = auto;
  run.current.voice = voice;
  const doneRef = useRef<((i: number) => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const send = (msg: Record<string, unknown>) => frameRef.current?.contentWindow?.postMessage({ curios: 1, ...msg }, '*');

  useEffect(() => {
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

  const voiceId = (v: Voice) => NARRATOR_VOICES.find((x) => x.gender === v)?.id ?? NARRATOR_VOICES[0].id;

  /** Voice line i, resolved when it has been said (at once when the voice is off or fails). */
  const say = async (i: number, token: number): Promise<void> => {
    const v = run.current.voice;
    if (v === 'off') return;
    try {
      const sound = await tts(manifest.beats[i].say, voiceId(v), v, new AbortController().signal);
      if (run.current.token !== token) return;
      const url = URL.createObjectURL(new Blob([sound], { type: 'audio/mpeg' }));
      const audio = new Audio(url);
      audioRef.current = audio;
      await new Promise<void>((resolve) => { audio.onended = audio.onerror = () => resolve(); audio.play().catch(() => resolve()); });
      URL.revokeObjectURL(url);
    } catch { /* the caption stays */ }
  };

  /** Plays beat i on the stage with its narration; with Auto on, goes on to the next. */
  const play = async (i: number) => {
    const token = ++run.current.token;
    audioRef.current?.pause();
    setCurrent(i);
    setPlaying(true);
    // The next line is fetched while this one plays, so the voice doesn't wait between beats.
    const next = manifest.beats[i + 1];
    if (next && run.current.voice !== 'off') void tts(next.say, voiceId(run.current.voice), run.current.voice, new AbortController().signal).catch(() => undefined);
    const beatDone = new Promise<void>((resolve) => {
      doneRef.current = (k) => { if (k === i) resolve(); };
      setTimeout(resolve, 45000); // a beat that never reports back
    });
    send({ cmd: 'beat', i });
    await Promise.all([beatDone, say(i, token)]);
    if (run.current.token !== token) return;
    setPlaying(false);
    if (run.current.auto && i + 1 < manifest.beats.length) void play(i + 1);
  };

  const restart = () => {
    run.current.token++;
    audioRef.current?.pause();
    send({ cmd: 'reset' });
    setCurrent(-1);
    setPlaying(false);
    setCallout('');
  };

  // Stories start by themselves once the stage is ready.
  const started = useRef(false);
  useEffect(() => {
    if (ready && !machine && !started.current) { started.current = true; void play(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  useEffect(() => () => { run.current.token++; audioRef.current?.pause(); }, []);

  useEffect(() => { send({ cmd: 'speed', x: speed }); }, [speed, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseVoice = (v: Voice) => {
    setVoice(v);
    if (v === 'off') audioRef.current?.pause();
    else saveNarratorVoice(voiceId(v), session?.user);
  };

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
  const beat = current >= 0 ? manifest.beats[current] : null;
  const title = manifest.title || animation.question;
  const hi = manifest.highlight ? title.toLowerCase().indexOf(manifest.highlight.toLowerCase()) : -1;
  const pill = (on: boolean) => (on ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' } : { color: 'var(--ui-text-secondary)' });
  const styleName = simulation ? t('vidType_simulation') : machine ? '3D' : t(`vidAnimStyle_${animation.style}`);

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
      <h2 className="font-bricolage text-xl sm:text-2xl font-bold mb-3" style={{ color: 'var(--ui-text-primary)' }}>
        {hi >= 0 ? <>{title.slice(0, hi)}<span style={{ color: 'var(--accent-primary)' }}>{title.slice(hi, hi + manifest.highlight.length)}</span>{title.slice(hi + manifest.highlight.length)}</> : title}
      </h2>

      <div
        ref={playerRef}
        className={`relative overflow-hidden ${pseudoFull ? 'fixed inset-0 z-[200]' : `rounded-xl ${machine ? 'aspect-[4/5] sm:aspect-video' : 'aspect-video'}`}`}
        style={{ backgroundColor: theme.ground }}
      >
        <iframe ref={frameRef} title={title} srcDoc={srcDoc} sandbox="allow-scripts" className="absolute inset-0 w-full h-full border-0" />

        <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white pointer-events-none ${label}`} style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          {simulation ? <SlidersHorizontal size={12} /> : machine ? <Rotate3d size={12} /> : <Palette size={12} />} {styleName}
        </span>

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

        {beat && (
          <div className="absolute inset-x-3 bottom-14 mx-auto max-w-2xl rounded-xl px-4 py-2.5 text-white pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
            <p className={`${label} opacity-70 mb-0.5`}>{current + 1} · {beat.label}</p>
            <p className="text-sm sm:text-base">{beat.say}</p>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 py-2 text-white" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
          <div className="flex rounded-full p-0.5" style={{ background: 'rgba(0,0,0,0.5)' }} role="group" aria-label={t('vidAnimVoice')}>
            {([['female', Venus], ['male', Mars], ['off', VolumeX]] as const).map(([v, Icon]) => (
              <button key={v} type="button" onClick={() => chooseVoice(v)} aria-pressed={voice === v} title={t(`vidAnimVoice_${v}`)} aria-label={t(`vidAnimVoice_${v}`)} className="p-1.5 rounded-full" style={voice === v ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' } : { color: '#fff' }}>
                <Icon size={14} />
              </button>
            ))}
          </div>
          <div className="flex rounded-full p-0.5" style={{ background: 'rgba(0,0,0,0.5)' }} role="group" aria-label={t('vidAnimSpeed')}>
            {SPEEDS.map((x) => (
              <button key={x} type="button" onClick={() => setSpeed(x)} aria-pressed={speed === x} className="px-2 py-1 rounded-full text-xs font-semibold tabular-nums" style={speed === x ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' } : { color: '#fff' }}>
                ×{x}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { setPaused((p) => !p); send({ cmd: 'pause', paused: !paused }); }} aria-label={paused ? t('vidAnimPlay') : t('vidAnimPause')} title={paused ? t('vidAnimPlay') : t('vidAnimPause')} className="p-1">
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <span className={`hidden sm:block ml-1 text-white/70 truncate ${label}`}>{animation.kind === 'machine' ? t('vidAnimHint3d') : ''}</span>
          <button type="button" onClick={toggleFullscreen} title={fullscreen ? t('vidExitFullscreen') : t('vidFullscreen')} aria-label={fullscreen ? t('vidExitFullscreen') : t('vidFullscreen')} className="ml-auto p-1">
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
          <button type="button" onClick={restart} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full" style={{ color: 'var(--ui-text-secondary)' }}>
            <RotateCcw size={13} /> {t('vidAnimRestart')}
          </button>
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
