// The 360 Tour on the Video page (same template as the other types: player, then share,
// overview and Continue exploring from the page). A tour already made for the question opens
// at once and free. A new one (a Viggle "session") costs 1 Pro Credit — guests included — and
// takes ~25 s. No credits left: a guest is asked to sign up, a free account to go Pro; Pro
// stops at 10 new tours a day ("today's maximum"). A guest who spent their last credit on a
// tour is offered to sign up to keep it; on sign-in it's claimed.
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, Maximize, Minimize, Rotate3d } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useSession } from '../../../hooks/useSession.ts';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { findRelatedPosters } from '../cinematic/cinematicPlan.ts';
import { claimTour, findTour, guestTours, makeTour, planTour, rememberGuestTour, tourKey, type Tour } from './tourPlan.ts';
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
  /** The page's tab: the tour shows on Video only. */
  tab: 'video' | 'hidden';
  context: { title: string; snippet: string }[] | null;
  belowPlayer?: ReactNode;
  onReady: (info: TourInfo) => void;
  onNeedSignIn: () => void;
}

type Stage = 'looking' | 'nocredits' | 'designing' | 'building' | 'ready' | 'limit' | 'failed';

export default function TourScene({ question, tab, context, belowPlayer, onReady, onNeedSignIn }: Props) {
  const { t } = useTranslation();
  const { session, isLoading: sessionLoading } = useSession();
  const { requestProAccess, promptUpgrade, tier, remaining } = useProCredits();
  // One charge per tour, even if the page re-runs (web facts arriving, signing in midway).
  const chargedRef = useRef<string | null>(null);
  const [stage, setStage] = useState<Stage>('looking');
  const [tour, setTour] = useState<Tour | null>(null);
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
      // Continue exploring gets its own stock footage, never holding the tour back.
      void findRelatedPosters({ related, relatedSearch: found.related.map((r) => r.search || '') }, [])
        .then((relatedImages) => { if (!controller.signal.aborted) cb.current.onReady({ ...info, relatedImages }); });
    };
    (async () => {
      const found = await findTour(key).catch(() => ({ tour: null, left: 1 }));
      const existing = found.tour;
      if (controller.signal.aborted) return;
      if (existing) {
        // A guest's tour, now signed in → it's saved to their account.
        if (signedIn && !existing.owned && guestTours().includes(key)) {
          void claimTour(key).then(() => rememberGuestTour(key, false), () => undefined);
        }
        return show(existing);
      }
      if (context === null) return; // wait for the web facts (the effect runs again)
      // Today's tour cap for this tier (guest 1, free 3, Pro 10) — before any credit is charged.
      if (chargedRef.current !== key && found.left <= 0) return setStage(tier === 'pro' ? 'limit' : 'nocredits');
      if (chargedRef.current !== key) {
        // 1 Pro Credit per new tour; none left → the tier's modal (sign up / go Pro) opens.
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

  if (tab === 'hidden') return null;

  const status = stage === 'looking' || stage === 'designing' ? t('vidTourDesigning')
    : stage === 'building' ? t('vidTourBuilding')
    : stage === 'limit' ? t('vidTourLimit')
    : stage === 'failed' ? t('vidTourFailed')
    : null;
  const noCredits = tier === 'guest' ? t('vidTourNoCreditsGuest') : tier === 'free' ? t('vidTourNoCreditsFree') : t('vidTourNoCreditsPro');
  // After the tour: a guest who just used their last credit is offered to keep it.
  const offerSave = stage === 'ready' && !signedIn && remaining <= 0 && guestTours().includes(tourKey(question));
  const pseudoFull = fullscreen && !document.fullscreenElement;

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
              />
            </Suspense>
            {loading3d && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 pointer-events-none" style={{ background: 'rgba(0,0,0,0.45)' }}>
                <Loader2 size={28} className="animate-spin" />
                <span className="text-sm">{t('vidTourLoading3d')}</span>
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
              <span className="hidden sm:block text-xs text-white/75 truncate">{mode === '360' ? t('vidTourHint360') : t('vidTourHint3d')}</span>
              <span className="ml-auto text-[10px] text-white/60 whitespace-nowrap">{t('vidTourCredit')}</span>
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
