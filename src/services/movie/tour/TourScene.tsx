// Immersion (the 'tour' type) on the Video page — after xgenlabs.ai: a generated world you step
// into, seen through the eyes of the people who live there. Same template as the other types:
// player, then share, overview and Continue exploring from the page.
//   World: a Viggle scene (360° panorama + walkable 3D splat). A world already made for the
//   question opens at once and free; a new one costs 1 Pro Credit (caps per day by tier).
//   Cast: the director peoples it with 3-6 characters (made once per world, no extra credit):
//   pick one to explore as them (their hands in first person); the others stand in the world and
//   talk to you, each with their own voice, when you walk up to them.
// No credits left: a guest is asked to sign up, a free account to go Pro; Pro stops at 10 new
// worlds a day. A guest who spent their last credit is offered to sign up to keep it.
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, Maximize, MessageCircle, Minimize, Rotate3d, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useSession } from '../../../hooks/useSession.ts';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { findRelatedPosters } from '../cinematic/cinematicPlan.ts';
import { tts } from '../audio/paragraphNarrator.ts';
import { captionText } from '../audio/voiceDirection.ts';
import { claimTour, findTour, guestTours, makeCast, makeTour, planCast, planTour, rememberGuestTour, tourKey, type CastMember, type Tour } from './tourPlan.ts';
import type { TourMode } from './TourViewer.tsx';

const TourViewer = lazy(() => import('./TourViewer.tsx'));

export interface TourInfo {
  title: string;
  overview: string;
  related: string[];
  relatedImages?: (string | undefined)[];
  panoramaUrl: string;
}

interface Props {
  question: string;
  /** The page's tab: the world shows on Video only. */
  tab: 'video' | 'hidden';
  context: { title: string; snippet: string }[] | null;
  belowPlayer?: ReactNode;
  onReady: (info: TourInfo) => void;
  onNeedSignIn: () => void;
}

type Stage = 'looking' | 'nocredits' | 'designing' | 'building' | 'ready' | 'limit' | 'failed';

const touch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export default function TourScene({ question, tab, context, belowPlayer, onReady, onNeedSignIn }: Props) {
  const { t } = useTranslation();
  const { session, isLoading: sessionLoading } = useSession();
  const { requestProAccess, promptUpgrade, tier, remaining } = useProCredits();
  // One charge per world, even if the page re-runs (web facts arriving, signing in midway).
  const chargedRef = useRef<string | null>(null);
  const [stage, setStage] = useState<Stage>('looking');
  const [tour, setTour] = useState<Tour | null>(null);
  const [casting, setCasting] = useState(false);
  const [mode, setMode] = useState<TourMode>('360');
  const [loading3d, setLoading3d] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const cb = useRef({ onReady });
  cb.current = { onReady };
  const signedIn = Boolean(session?.user);

  useEffect(() => {
    if (sessionLoading || !question.trim()) return;
    const controller = new AbortController();
    const key = tourKey(question);
    const show = (found: Tour) => {
      setTour(found);
      setStage('ready');
      const related = found.related.map((r) => r.question);
      const info: TourInfo = { title: found.title, overview: found.overview, related, panoramaUrl: found.panoramaUrl };
      cb.current.onReady(info);
      // Continue exploring gets its own stock footage, never holding the world back.
      void findRelatedPosters({ related, relatedSearch: found.related.map((r) => r.search || '') }, [])
        .then((relatedImages) => { if (!controller.signal.aborted) cb.current.onReady({ ...info, relatedImages }); });
      // The world's people, made once (the next visitors get them at once).
      if (!found.cast?.length) {
        setCasting(true);
        void planCast(found)
          .then((cast) => makeCast(key, cast))
          .then((withCast) => { if (!controller.signal.aborted) setTour(withCast); })
          .catch(() => undefined)
          .finally(() => { if (!controller.signal.aborted) setCasting(false); });
      }
    };
    (async () => {
      const found = await findTour(key).catch(() => ({ tour: null, left: 1 }));
      const existing = found.tour;
      if (controller.signal.aborted) return;
      if (existing) {
        // A guest's world, now signed in → it's saved to their account.
        if (signedIn && !existing.owned && guestTours().includes(key)) {
          void claimTour(key).then(() => rememberGuestTour(key, false), () => undefined);
        }
        return show(existing);
      }
      if (context === null) return; // wait for the web facts (the effect runs again)
      // Today's cap for this tier (guest 1, free 3, Pro 10) — before any credit is charged.
      if (chargedRef.current !== key && found.left <= 0) return setStage(tier === 'pro' ? 'limit' : 'nocredits');
      if (chargedRef.current !== key) {
        // 1 Pro Credit per new world; none left → the tier's modal (sign up / go Pro) opens.
        if (!(await requestProAccess())) return setStage('nocredits');
        chargedRef.current = key;
        if (!signedIn) rememberGuestTour(key);
      }
      if (controller.signal.aborted) return;
      setStage('designing');
      const plan = await planTour(question, context);
      if (controller.signal.aborted) return;
      setStage('building');
      show(await makeTour(key, question, plan, controller.signal));
    })().catch((err) => {
      if (controller.signal.aborted) return;
      setStage(String(err instanceof Error ? err.message : err).includes('daily_limit') ? 'limit' : 'failed');
    });
    return () => controller.abort();
    // requestProAccess is stable enough; re-running on it would re-charge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, signedIn, sessionLoading, context === null]);

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

  // ── The people: whose eyes you see through, who is near, what they say ─────────────────────
  const cast: CastMember[] = tour?.cast ?? [];
  const [as, setAs] = useState<number | null>(null);
  const others = cast.map((c, i) => ({ c, i })).filter(({ i }) => i !== as);
  const [near, setNear] = useState<number | null>(null); // index in `others`
  const [moving, setMoving] = useState(false);
  const [speech, setSpeech] = useState<{ name: string; text: string } | null>(null);
  const [muted, setMuted] = useState(false);
  const lineRef = useRef<Record<number, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stick = useRef({ x: 0, y: 0 });
  const nearPerson = near !== null ? others[near] : undefined;

  const becomes = (i: number | null) => {
    setAs(i);
    setNear(null);
    if (i !== null) setMode('3d');
  };

  const talk = async () => {
    if (!nearPerson) return;
    const { c, i } = nearPerson;
    const n = lineRef.current[i] ?? 0;
    lineRef.current[i] = n + 1;
    const line = c.lines[n % c.lines.length];
    setSpeech({ name: c.name, text: captionText(line) });
    audioRef.current?.pause();
    if (muted) return;
    try {
      const sound = await tts(line, c.voiceId, c.gender, new AbortController().signal);
      const url = URL.createObjectURL(new Blob([sound], { type: 'audio/mpeg' }));
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); setSpeech((s) => (s?.text === captionText(line) ? null : s)); };
      await audio.play();
    } catch { /* the subtitle stays */ }
  };
  useEffect(() => {
    if (mode !== '3d') return;
    const onKey = (e: KeyboardEvent) => { if (e.code === 'KeyE' && !(e.target instanceof HTMLInputElement)) void talk(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  useEffect(() => () => audioRef.current?.pause(), []);

  // Touch joystick: drag inside the ring to walk (forward = up).
  const joyRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const joy = (e: React.PointerEvent) => {
    const r = joyRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
    const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    stick.current = { x, y };
    setKnob({ x, y });
  };
  const joyEnd = () => { stick.current = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); };

  if (tab === 'hidden') return null;

  const status = stage === 'looking' || stage === 'designing' ? t('vidTourDesigning')
    : stage === 'building' ? t('vidTourBuilding')
    : stage === 'limit' ? t('vidTourLimit')
    : stage === 'failed' ? t('vidTourFailed')
    : null;
  const noCredits = tier === 'guest' ? t('vidTourNoCreditsGuest') : tier === 'free' ? t('vidTourNoCreditsFree') : t('vidTourNoCreditsPro');
  // After the world: a guest who just used their last credit is offered to keep it.
  const offerSave = stage === 'ready' && !signedIn && remaining <= 0 && guestTours().includes(tourKey(question));
  const pseudoFull = fullscreen && !document.fullscreenElement;
  const me = as !== null ? cast[as] : null;
  const label = 'text-[11px] uppercase tracking-[0.08em]';

  return (
    <>
      <div
        ref={playerRef}
        className={`relative overflow-hidden bg-black ${pseudoFull ? 'fixed inset-0 z-[200]' : 'rounded-xl aspect-video'}`}
      >
        {stage === 'ready' && tour ? (
          <>
            <Suspense fallback={null}>
              <TourViewer
                spzUrl={tour.spzUrl}
                panoramaUrl={tour.panoramaUrl}
                mode={mode}
                onLoading3d={setLoading3d}
                on3dError={() => setMode('360')}
                people={others.map(({ c }) => ({ name: c.name, bodyUrl: c.bodyUrl }))}
                onNear={setNear}
                onMoving={setMoving}
                stick={stick}
              />
            </Suspense>
            {loading3d && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 pointer-events-none" style={{ background: 'rgba(0,0,0,0.45)' }}>
                <Loader2 size={28} className="animate-spin" />
                <span className="text-sm">{t('vidTourLoading3d')}</span>
              </div>
            )}

            {/* First person: the chosen character's hands, swaying while you walk. */}
            {mode === '3d' && me?.handsUrl && !loading3d && (
              <img
                src={me.handsUrl}
                alt=""
                className={`absolute left-1/2 bottom-0 w-[72%] max-w-[760px] pointer-events-none select-none ${speech ? 'imm-hands-talk' : moving ? 'imm-hands-walk' : 'imm-hands-idle'}`}
                style={{ translate: '-50% 18%' }}
              />
            )}
            {mode === '3d' && me && (
              <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-white ${label}`} style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                {t('vidImmLive')} · {me.name}
              </span>
            )}

            {/* Someone close: talk to them (E, or the button on touch). */}
            {mode === '3d' && nearPerson && (
              <button
                type="button"
                onClick={() => void talk()}
                className="absolute left-1/2 -translate-x-1/2 bottom-[34%] inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
              >
                <MessageCircle size={16} /> {t('vidImmTalk').replace('{name}', nearPerson.c.name)}{!touch() && <span className="opacity-60">· E</span>}
              </button>
            )}
            {speech && (
              <div className="absolute inset-x-4 bottom-14 sm:bottom-16 mx-auto max-w-xl rounded-xl px-4 py-3 text-white" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
                <p className={`${label} opacity-70 mb-1`}>{speech.name}</p>
                <p className="text-sm sm:text-base">{speech.text}</p>
              </div>
            )}

            {/* Touch joystick */}
            {mode === '3d' && touch() && !loading3d && (
              <div
                ref={joyRef}
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); joy(e); }}
                onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') joy(e); }}
                onPointerUp={joyEnd}
                onPointerCancel={joyEnd}
                className="absolute left-4 bottom-14 w-24 h-24 rounded-full touch-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)' }}
                aria-label={t('vidImmControlsTouch')}
              >
                <span className="absolute w-10 h-10 rounded-full" style={{ left: `calc(50% - 20px + ${knob.x * 28}px)`, top: `calc(50% - 20px + ${knob.y * 28}px)`, backgroundColor: 'rgba(255,255,255,0.55)' }} />
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-3 py-2 text-white" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
              <div className="flex rounded-full p-0.5" style={{ background: 'rgba(0,0,0,0.5)' }}>
                {(['360', '3d'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                    style={mode === m ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' } : { color: '#fff' }}
                  >
                    {m === '360' ? t('vidTour360') : t('vidTour3d')}
                  </button>
                ))}
              </div>
              <span className={`hidden sm:block text-white/70 truncate whitespace-pre ${label}`}>
                {mode === '360' ? t('vidTourHint360') : t('vidImmControls')}
              </span>
              <span className="ml-auto text-[10px] text-white/60 whitespace-nowrap">{t('vidTourCredit')}</span>
              {cast.length > 0 && (
                <button type="button" onClick={() => { setMuted((m) => !m); audioRef.current?.pause(); }} className="p-1" aria-label={muted ? t('vidImmUnmute') : t('vidImmMute')} title={muted ? t('vidImmUnmute') : t('vidImmMute')}>
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              )}
              <button type="button" onClick={toggleFullscreen} title={fullscreen ? t('vidExitFullscreen') : t('vidFullscreen')} aria-label={fullscreen ? t('vidExitFullscreen') : t('vidFullscreen')} className="p-1">
                {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
            {stage === 'nocredits' ? (
              <>
                <Rotate3d size={32} />
                <p className="text-sm max-w-sm">{noCredits}</p>
                {tier !== 'pro' && (
                  <button type="button" onClick={promptUpgrade} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}>
                    {tier === 'guest' ? t('vidSignUp') : t('vidGoPro')}
                  </button>
                )}
              </>
            ) : (
              <>
                {(stage === 'looking' || stage === 'designing' || stage === 'building') ? <Loader2 size={28} className="animate-spin" /> : <Rotate3d size={28} />}
                {status && <span className="text-sm">{status}</span>}
                {stage === 'designing' && <span className="text-xs text-white/55">{t('vidTourCost')}</span>}
              </>
            )}
          </div>
        )}
      </div>

      {/* The lenses: whose eyes you see the world through (XGEN's role cards). */}
      {stage === 'ready' && (casting || cast.length > 0) && (
        <section className="mt-5">
          <p className={`${label} mb-3`} style={{ color: 'var(--ui-text-muted)' }}>
            {casting ? <span className="inline-flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> {t('vidImmCasting')}</span> : t('vidImmLenses')}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {cast.map((c, i) => (
              <button
                key={c.name}
                type="button"
                onClick={() => becomes(as === i ? null : i)}
                aria-pressed={as === i}
                className="relative flex-shrink-0 w-40 sm:w-48 h-56 rounded-xl overflow-hidden text-left border transition-colors"
                style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: as === i ? 'var(--accent-primary)' : 'transparent' }}
              >
                <img src={c.bodyUrl} alt={c.name} className="absolute inset-x-0 bottom-0 mx-auto h-[88%] object-contain object-bottom" loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                  <p className={`${label} text-white`}>{c.name}</p>
                  <p className="text-[11px] leading-snug text-white/75 line-clamp-2">{c.tagline || c.role}</p>
                </div>
                {as === i && (
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-white ${label}`} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>{t('vidImmLive')}</span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {offerSave && (
        <div className="mt-4 rounded-xl p-4 flex flex-wrap items-center gap-3" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
          <Rotate3d size={18} style={{ color: 'var(--accent-primary)' }} />
          <p className="text-sm flex-1 min-w-[12rem]">{t('vidTourSaveGuest')}</p>
          <button type="button" onClick={onNeedSignIn} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}>
            {t('vidSignUp')}
          </button>
        </div>
      )}
      {belowPlayer}
    </>
  );
}
