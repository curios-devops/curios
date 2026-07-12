// Movie Mode results page (swipe-based).
// Layout: TopBar (question + "Watch as…" mode dropdown) → tab nav (Video / Narrative /
// Sources) → a single MAIN VIEWER rendering the active swipe with a lateral swipe RAIL
// (vertical on desktop, horizontal on mobile) and a "Frame n/N" indicator + HD switch.
// NO video is auto-rendered: even the core swipe waits for the user's Play (cost rule).
// Changing the mode dropdown regenerates the movie in that style (1 Pro Credit); the
// "Continue Exploring" topics are kept as-is across mode regenerations.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Compass, Crown, FileText, Film, Link2, Loader2, Play, Sparkles } from 'lucide-react';

import { useSession } from '../../../hooks/useSession.ts';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { logger } from '../../../utils/logger.ts';
import TopBar from '../../../components/results/TopBar.tsx';
import LightMarkdown from '../../../components/LightMarkdown';
import { generateMovie, renderSwipeVideo } from '../movieService.ts';
import { createEnhanceJob, getEnhancedVideo, attachEnhancedToProject, markEnhancedSeen } from '../enhancedVideosService.ts';
import { MoviePersistenceService } from '../video/MoviePersistenceService.ts';
import { MOVIE_MODE_LIST, MOVIE_MODES, normalizeMovieMode } from '../config/movieModes.ts';
import type { MovieExperience, MovieMode, MovieProgress, MovieRelatedTopic, MovieSwipe } from '../types.ts';
import SocialShareRow from '../components/SocialShareRow.tsx';
import SignUpModal from '../../../components/auth/SignUpModal.tsx';

type MovieTab = 'video' | 'narrative' | 'sources';

const TABS: Array<{ id: MovieTab; label: string; icon: typeof Film }> = [
  { id: 'video', label: 'Video', icon: Film },
  { id: 'narrative', label: 'Narrative', icon: FileText },
  { id: 'sources', label: 'Sources', icon: Link2 },
];

export default function MovieResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, isLoading: sessionLoading } = useSession();
  const { requestProAccess, canUseProFeature } = useProCredits();

  const query = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);
  // Optional explicit style in the URL; otherwise the enhancement agent proposes one.
  const modeParam = useMemo(() => normalizeMovieMode(new URLSearchParams(location.search).get('mode')), [location.search]);
  // Reopen a saved movie (Home "latest enhanced" card) — loads from Supabase, no regeneration.
  const projectIdParam = useMemo(() => new URLSearchParams(location.search).get('projectId') || '', [location.search]);

  const [swipes, setSwipes] = useState<MovieSwipe[]>([]);
  const [experience, setExperience] = useState<MovieExperience | null>(null);
  const [progress, setProgress] = useState<MovieProgress>({ stage: 'enhancing', message: 'Starting...', progress: 0 });
  const [selectedSwipeId, setSelectedSwipeId] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [enhancingIds, setEnhancingIds] = useState<Set<string>>(new Set());
  const [enhanceNotice, setEnhanceNotice] = useState<string | null>(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MovieTab>('video');
  const [mode, setMode] = useState<MovieMode | null>(modeParam ?? null);
  // Kept in its own state so mode regenerations reuse it untouched.
  const [relatedTopics, setRelatedTopics] = useState<MovieRelatedTopic[]>([]);

  const hasStartedRef = useRef(false);
  const experienceRef = useRef<MovieExperience | null>(null);
  experienceRef.current = experience;
  const swipesRef = useRef<MovieSwipe[]>([]);
  swipesRef.current = swipes;
  // Swipes with a queued Enhance: the default image/video pipeline skips them.
  const enhanceRequestedRef = useRef<Set<string>>(new Set());
  // Enhance jobs created before the movie persisted — attached to the project on save.
  const pendingEnhanceJobsRef = useRef<Set<string>>(new Set());

  const upsertSwipe = (swipe: MovieSwipe) =>
    setSwipes((prev) =>
      prev.some((s) => s.id === swipe.id)
        ? prev.map((s) => (s.id === swipe.id ? { ...swipe } : s))
        : [...prev, { ...swipe }].sort((a, b) => a.order - b.order),
    );

  const resetForNewRun = () => {
    setSwipes([]);
    setExperience(null);
    setSelectedSwipeId(null);
    setGeneratingIds(new Set());
    setEnhancingIds(new Set());
    setEnhanceNotice(null);
    setError(null);
    enhanceRequestedRef.current.clear();
  };

  // Shared generation entry point (initial run AND mode regeneration). NOTE renderCoreVideo
  // is OFF: no swipe — not even the core — spends video GPU money until the user hits Play.
  const startGeneration = (questionText: string, modeOverride?: MovieMode) => {
    generateMovie(questionText, {
      userId: session?.user?.id || 'curios-guest',
      // LTX generates each swipe's audio (generate_audio); a separate ElevenLabs
      // narration track would be unused and is redundant cost, so it's disabled.
      enableNarration: false,
      renderCoreVideo: false,
      mode: modeOverride,
      // Mode regeneration keeps the existing Continue Exploring topics as-is.
      relatedTopics: relatedTopics.length > 0 ? relatedTopics : undefined,
      // A swipe with a queued Enhance skips its default image/video render — the
      // premium result will replace it instead.
      isEnhanceRequested: (swipe) => enhanceRequestedRef.current.has(swipe.id),
      onProgress: (p) => {
        setProgress(p);
        if (p.swipes) setSwipes([...p.swipes].sort((a, b) => a.order - b.order));
      },
      onSwipeReady: (swipe) => {
        upsertSwipe(swipe);
        // Auto-select the core swipe as soon as it has an image.
        setSelectedSwipeId((cur) => cur ?? (swipe.isCore && swipe.imageUrl ? swipe.id : cur));
      },
    })
      .then((exp) => {
        setExperience(exp);
        setMode(exp.mode ?? modeOverride ?? null);
        setRelatedTopics(exp.relatedTopics ?? []);
        if (exp.id && !exp.id.startsWith('local-')) {
          // Future reloads must hit the stored movie, never a regeneration.
          window.history.replaceState(null, '', `/movie-results?projectId=${exp.id}`);
          // Movie persisted after Enhance was pressed → attach the jobs to the project
          // so the server also replaces the saved movie_scenes rows.
          if (pendingEnhanceJobsRef.current.size > 0) {
            void attachEnhancedToProject([...pendingEnhanceJobsRef.current], exp.id);
            pendingEnhanceJobsRef.current.clear();
          }
        }
      })
      .catch((err) => {
        logger.error('[MovieResults] Generation failed', { error: err instanceof Error ? err.message : String(err) });
        setError(err instanceof Error ? err.message : 'Movie generation failed');
      });
  };

  // "Continue Exploring" navigates to this same route with a new ?q= — reset everything
  // (except nothing: it's a brand-new question) and let the kickoff effect run again.
  const lastQueryRef = useRef(query);
  useEffect(() => {
    if (!query.trim() || lastQueryRef.current === query) return;
    lastQueryRef.current = query;
    hasStartedRef.current = false;
    resetForNewRun();
    setMode(null);
    setRelatedTopics([]);
    setActiveTab('video');
    setProgress({ stage: 'enhancing', message: 'Starting...', progress: 0 });
  }, [query]);

  // ── Kick off ONCE: load a saved movie (?projectId=), reuse a stored movie for the
  // same question, or — only when nothing is stored — generate (the expensive path).
  // Waits for the auth session: starting before it resolves made userId fall back to
  // 'curios-guest', which silently skipped persistence (and forced regenerations).
  useEffect(() => {
    if (hasStartedRef.current || sessionLoading) return;

    const loadSaved = async (projectId: string): Promise<boolean> => {
      const exp = await new MoviePersistenceService().loadMovieExperience(projectId);
      if (!exp) return false;
      setSwipes(exp.swipes);
      setExperience(exp);
      setMode(exp.mode ?? null);
      setRelatedTopics(exp.relatedTopics ?? []);
      setProgress({ stage: 'complete', message: 'Loaded from your library', progress: 100 });
      const core = exp.swipes.find((s) => s.isCore) || exp.swipes[0];
      if (core) setSelectedSwipeId(core.id);
      return true;
    };

    if (projectIdParam) {
      hasStartedRef.current = true;
      loadSaved(projectIdParam)
        .then((ok) => { if (!ok) setError('Movie not found'); })
        .catch((err) => {
          logger.error('[MovieResults] Load failed', { error: err instanceof Error ? err.message : String(err) });
          setError('Could not load this movie');
        });
      return;
    }

    if (!query.trim()) return;
    hasStartedRef.current = true;

    void (async () => {
      // Reload/back-navigation with the same question → serve the stored movie
      // (text, frames, videos) instead of paying for a new generation.
      if (session?.user?.id) {
        const existingId = await new MoviePersistenceService()
          .findLatestByQuestion(session.user.id, query)
          .catch(() => null);
        if (existingId && (await loadSaved(existingId).catch(() => false))) {
          window.history.replaceState(null, '', `/movie-results?projectId=${existingId}`);
          return;
        }
      }

      startGeneration(query, modeParam);
    })();
  }, [query, modeParam, projectIdParam, session?.user?.id, sessionLoading]);

  const isComplete = progress.stage === 'complete';
  const selectedSwipe = swipes.find((s) => s.id === selectedSwipeId) || swipes.find((s) => s.isCore) || swipes[0];
  const frameIndex = selectedSwipe ? swipes.findIndex((s) => s.id === selectedSwipe.id) + 1 : 0;

  // ── Mode dropdown ("Watch as…"): a Pro feature — every change consumes 1 Pro Credit
  // and regenerates the whole movie (narrative, frames, video) in the new style.
  // Continue Exploring is deliberately kept as-is.
  const handleModeChange = async (next: MovieMode) => {
    if (!isComplete || next === mode) return;
    const questionText = experienceRef.current?.question || query;
    if (!questionText.trim()) return;
    const allowed = await requestProAccess();
    if (!allowed) return; // modal shown by the provider
    setMode(next);
    hasStartedRef.current = true; // stay in "started" state; we drive this run ourselves
    resetForNewRun();
    setProgress({ stage: 'enhancing', message: `Restyling as ${MOVIE_MODES[next].label}...`, progress: 0 });
    startGeneration(questionText, next);
  };

  // Lazy on-demand video generation when a user activates a swipe that has only an image.
  // (renderSwipeVideo also creates the image first if it's missing — the enhance-failed
  // fallback path can arrive here with neither asset.)
  const triggerLazyVideo = async (swipe: MovieSwipe) => {
    if (swipe.videoUrl || generatingIds.has(swipe.id)) return;
    setGeneratingIds((prev) => new Set(prev).add(swipe.id));
    upsertSwipe({ ...swipe, status: 'rendering' });

    const exp = experienceRef.current;
    const projectId = exp?.id && !exp.id.startsWith('local-') ? exp.id : undefined;
    const updated = await renderSwipeVideo({ ...swipe }, {
      userId: session?.user?.id,
      projectId,
      styleSeed: exp?.styleSeed || undefined,
      mode: exp?.mode,
    });

    upsertSwipe(updated);
    setGeneratingIds((prev) => {
      const next = new Set(prev);
      next.delete(swipe.id);
      return next;
    });
  };

  // Single gated entry point for rendering a swipe's video. The CORE swipe is
  // free; any non-core ("premium") swipe consumes 1 Pro Credit via the central
  // ProCreditsProvider, which opens the tier-appropriate modal when blocked.
  const requestRenderSwipe = async (swipe: MovieSwipe) => {
    if (enhanceRequestedRef.current.has(swipe.id)) return; // enhanced version is on its way
    if (swipe.videoUrl || generatingIds.has(swipe.id) || swipe.status === 'rendering' || !swipe.imageUrl) return;
    if (!swipe.isCore) {
      const allowed = await requestProAccess();
      if (!allowed) return; // modal shown by the provider; nothing rendered
    }
    void triggerLazyVideo(swipe);
  };

  const handleSelect = (swipe: MovieSwipe) => {
    setSelectedSwipeId(swipe.id); // viewing the image preview is always free
    void requestRenderSwipe(swipe);
  };

  const clearEnhancing = (swipeId: string) => {
    setEnhancingIds((prev) => {
      const next = new Set(prev);
      next.delete(swipeId);
      return next;
    });
  };

  // Watch a running enhance job. When ready, the enhanced image/video REPLACE the swipe's
  // regular ones in place (and it's marked seen — the user watched it here, so it won't
  // resurface on Home). On failure, fall back to the regular render if the swipe has no video.
  const watchEnhanceJob = async (jobId: string, swipeId: string) => {
    const deadline = Date.now() + 12 * 60_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 6000));
      const row = await getEnhancedVideo(jobId);
      if (!row) continue;
      if (row.status === 'processing') {
        // The enhanced frame lands before the video — replace the image right away.
        if (row.image_url) {
          setSwipes((prev) => prev.map((s) => (s.id === swipeId && s.imageUrl !== row.image_url
            ? { ...s, imageUrl: row.image_url!, enhanced: true }
            : s)));
        }
        continue;
      }

      enhanceRequestedRef.current.delete(swipeId);
      pendingEnhanceJobsRef.current.delete(jobId);
      clearEnhancing(swipeId);

      if (row.status === 'ready' && row.video_url) {
        setSwipes((prev) => prev.map((s) => (s.id === swipeId
          ? { ...s, imageUrl: row.image_url ?? s.imageUrl, videoUrl: row.video_url!, status: 'ready', enhanced: true, error: undefined }
          : s)));
        setEnhanceNotice(null);
        void markEnhancedSeen(jobId);
      } else {
        setEnhanceNotice('Enhance failed — generating the standard video instead.');
        const target = swipesRef.current.find((s) => s.id === swipeId);
        if (target && !target.videoUrl) void triggerLazyVideo(target);
      }
      return;
    }
    // Taking unusually long — the server job keeps going; it will land on Home when ready.
    enhanceRequestedRef.current.delete(swipeId);
    clearEnhancing(swipeId);
    setEnhanceNotice('Still enhancing in the background — your video will appear on your Home page when ready.');
  };

  // Enhance / HD (off by default, Pro): kick a SERVER-owned background job that regenerates
  // this swipe's frame with premium gpt-image-2 and renders its video with Gemini Omni Flash
  // — in the movie's selected visual mode — then replaces the swipe in place. Runs immediately;
  // the job is attached to the project when the save completes. If the user leaves, the result
  // surfaces on the Home page ("latest enhanced" card) instead.
  const requestEnhance = async (swipe: MovieSwipe) => {
    if (enhancingIds.has(swipe.id) || swipe.enhanced) return;
    // Guests must sign in to keep the enhanced video (it surfaces on their Home).
    if (!session?.user?.id) {
      setShowSignUp(true);
      return;
    }

    const allowed = await requestProAccess();
    if (!allowed) return; // modal shown by the provider

    const exp = experienceRef.current;
    const projectId = exp?.id && !exp.id.startsWith('local-') ? exp.id : undefined;

    // From here the default pipeline skips this swipe — the enhanced render replaces it.
    enhanceRequestedRef.current.add(swipe.id);
    setEnhancingIds((prev) => new Set(prev).add(swipe.id));
    setEnhanceNotice('Enhancing — the premium version will replace this swipe here when ready. You can leave; it will also appear on your Home page.');
    try {
      const jobId = await createEnhanceJob({
        userId: session.user.id,
        projectId,
        swipeOrder: swipe.order,
        question: exp?.question || query,
        title: swipe.title,
        imagePrompt: swipe.imagePrompt,
        videoPrompt: swipe.videoPrompt,
        aspectRatio: '16:9',
        mode: exp?.mode ?? mode ?? undefined,
      });
      if (!projectId) pendingEnhanceJobsRef.current.add(jobId);
      void watchEnhanceJob(jobId, swipe.id);
    } catch (err) {
      enhanceRequestedRef.current.delete(swipe.id);
      clearEnhancing(swipe.id);
      setEnhanceNotice(null);
      setError(err instanceof Error ? err.message : 'Could not start enhance');
    }
  };

  const shareUrl = experience?.id && !experience.id.startsWith('local-')
    ? `${window.location.origin}/movie/share/${experience.id}`
    : window.location.href;

  const handleShared = () => {
    if (experience?.id && !experience.id.startsWith('local-')) {
      new MoviePersistenceService().incrementShareCount(experience.id).catch(() => undefined);
    }
  };

  const roleLabel = (s: MovieSwipe) => (s.isCore ? 'Core' : s.role.charAt(0).toUpperCase() + s.role.slice(1));
  const isEnhancing = selectedSwipe ? enhancingIds.has(selectedSwipe.id) : false;
  const isEnhanced = Boolean(selectedSwipe?.enhanced);
  const isGenerating = selectedSwipe ? generatingIds.has(selectedSwipe.id) || (!isEnhancing && selectedSwipe.status === 'rendering') : false;
  const displayQuery = query || experience?.question || '';

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      {/* Top bar: the user's question with the "Watch as…" mode dropdown on the right.
          Changing the style is a Pro action: 1 Pro Credit + full regeneration in that mode. */}
      <TopBar
        query={displayQuery}
        timeAgo=""
        rightSlot={
          <div className="flex items-center gap-1.5">
            <span
              className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
              title="Changing the style regenerates this movie in the new look (1 Pro Credit)."
            >
              Pro
            </span>
            <div className="relative">
              <select
                value={mode ?? ''}
                onChange={(e) => void handleModeChange(e.target.value as MovieMode)}
                disabled={!isComplete}
                title="Watch as… — pick the visual style; the movie regenerates in that look (1 Pro Credit)"
                className="appearance-none rounded-full pl-4 pr-8 py-2 text-sm font-medium transition-all cursor-pointer hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)', border: 'none' }}
              >
                {!mode && <option value="" disabled>Watch as…</option>}
                {MOVIE_MODE_LIST.map((m) => (
                  <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--ui-text-on-accent)' }}
              />
            </div>
          </div>
        }
      />

      {/* Tab navigation (same pattern as Cinematic: Video / Narrative / Sources) */}
      <div className="border-b" style={{ borderColor: 'var(--ui-bg-elevated)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                  style={isActive
                    ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }
                    : { borderColor: 'transparent', color: 'var(--ui-text-muted)' }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg p-4 text-sm" style={{ backgroundColor: 'var(--ui-bg-elevated)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {enhanceNotice && (
          <div className="mb-4 rounded-lg p-4 text-sm flex items-start gap-2" style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--accent-primary)' }}>
            <Sparkles size={16} className="mt-0.5 flex-shrink-0" />
            <span>{enhanceNotice}</span>
          </div>
        )}

        {/* Progress bar while generating */}
        {!isComplete && !error && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--ui-text-secondary)' }}>
              <Loader2 size={16} className="animate-spin" />
              <span>{progress.message}</span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress.progress}%`, backgroundColor: 'var(--accent-primary)' }}
              />
            </div>
          </div>
        )}

        {/* ── Video tab: main viewer + lateral swipe rail ─────────────────────── */}
        {activeTab === 'video' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main viewer (active swipe) */}
          <div className="flex-1 min-w-0">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              {selectedSwipe?.videoUrl ? (
                <video src={selectedSwipe.videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
              ) : selectedSwipe?.imageUrl ? (
                <>
                  <img src={selectedSwipe.imageUrl} alt={selectedSwipe.title} className="w-full h-full object-contain" />
                  {/* Image-only swipe → video renders only when the user presses Play */}
                  <button
                    onClick={() => selectedSwipe && requestRenderSwipe(selectedSwipe)}
                    disabled={isGenerating || isEnhancing}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-colors"
                    style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#fff' }}
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 size={30} className="animate-spin" />
                        <span className="text-sm">Enhancing this swipe…</span>
                      </>
                    ) : isGenerating ? (
                      <>
                        <Loader2 size={30} className="animate-spin" />
                        <span className="text-sm">Generating video…</span>
                      </>
                    ) : (
                      <>
                        <span className="h-14 w-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-primary)' }}>
                          <Play size={26} className="ml-1" />
                        </span>
                        <span className="text-sm font-medium">Tap to generate this swipe</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-white/70">
                  <Loader2 size={28} className="animate-spin" />
                  <span className="text-sm">{isEnhancing ? 'Enhancing this swipe…' : 'Creating your swipes…'}</span>
                </div>
              )}
            </div>

            {/* Frame indicator + HD switch (the relocated Enhance — premium re-render of
                the ACTIVE swipe in the movie's visual mode, 1 Pro Credit) */}
            {swipes.length > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs font-medium" style={{ color: 'var(--ui-text-muted)' }}>
                  Frame {frameIndex}/{swipes.length}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {swipes.map((s) => (
                      <span
                        key={s.id}
                        className="h-1 rounded-full transition-all"
                        style={{
                          width: s.id === selectedSwipe?.id ? '20px' : '10px',
                          backgroundColor: s.id === selectedSwipe?.id ? 'var(--accent-primary)' : 'var(--ui-bg-elevated)',
                        }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => selectedSwipe && requestEnhance(selectedSwipe)}
                    disabled={!selectedSwipe || isEnhancing || isEnhanced}
                    title="HD — enhance this swipe with a source-grounded, premium video in the selected style (1 Pro Credit)"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer hover:opacity-90 disabled:cursor-default"
                    style={isEnhanced
                      ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }
                      : { backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-secondary)', border: '1px solid var(--ui-bg-elevated)' }}
                  >
                    {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Crown size={12} />}
                    <span>HD</span>
                    {!isEnhanced && !isEnhancing && (
                      <span
                        className="text-[8px] font-bold uppercase tracking-wide px-1 py-px rounded"
                        style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
                      >
                        Pro
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {selectedSwipe && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--accent-primary)' }}>
                    {roleLabel(selectedSwipe)}
                  </span>
                  {selectedSwipe.enhanced && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
                      <Crown size={10} /> Enhanced
                    </span>
                  )}
                  <h2 className="text-sm font-medium">{selectedSwipe.title}</h2>
                </div>
                {selectedSwipe.narration && (
                  <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>{selectedSwipe.narration}</p>
                )}
              </div>
            )}

            {/* Viral packaging + social row (when complete) */}
            {isComplete && experience?.viral && (
              <div className="mt-6 rounded-xl p-5" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent-primary)' }}>
                  <Sparkles size={16} />
                  <span className="text-xs font-medium uppercase tracking-wide">Share your swipe</span>
                </div>
                <h3 className="text-lg font-semibold">{experience.viral.title}</h3>
                {experience.viral.caption && (
                  <p className="text-sm mt-1 mb-3" style={{ color: 'var(--ui-text-muted)' }}>{experience.viral.caption}</p>
                )}
                {experience.viral.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {experience.viral.hashtags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-secondary)' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <SocialShareRow
                  shareUrl={shareUrl}
                  title={experience.viral.title}
                  caption={experience.viral.caption}
                  videoUrl={selectedSwipe?.videoUrl || experience.coreVideoUrl}
                  onShared={handleShared}
                />
              </div>
            )}
          </div>

          {/* Lateral swipe rail (desktop) → horizontal on mobile */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
                Swipes {swipes.length > 0 && `(${swipes.length})`}
              </span>
              <span
                className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
                title="Selecting any swipe outside Core consumes 1 Pro Credit."
              >
                Pro
              </span>
            </div>
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[70vh] pb-2 lg:pb-0 scrollbar-hide">
              {swipes.map((swipe, idx) => {
                const isSel = swipe.id === selectedSwipe?.id;
                const rendering = generatingIds.has(swipe.id) || swipe.status === 'rendering';
                // Non-core swipes are locked once Pro Credits are exhausted (unless
                // already rendered, which is free to re-view).
                const locked = !swipe.isCore && !swipe.videoUrl && !canUseProFeature;
                return (
                  <button
                    key={swipe.id}
                    onClick={() => handleSelect(swipe)}
                    className="relative flex-shrink-0 w-40 lg:w-full aspect-video rounded-lg overflow-hidden border-2 transition-all"
                    style={{
                      borderColor: isSel ? 'var(--accent-primary)' : 'transparent',
                      opacity: locked ? 0.5 : 1,
                      cursor: locked ? 'not-allowed' : 'pointer',
                      filter: locked ? 'grayscale(100%)' : 'none',
                    }}
                  >
                    {swipe.imageUrl ? (
                      <img src={swipe.imageUrl} alt={swipe.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
                        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--ui-text-muted)' }} />
                      </div>
                    )}
                    <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                      {idx + 1}/{swipes.length}
                    </span>
                    <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: swipe.isCore ? 'var(--accent-primary)' : 'rgba(0,0,0,0.6)' }}>
                      {roleLabel(swipe)}
                    </span>
                    {enhancingIds.has(swipe.id) ? (
                      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" /> enhance
                      </span>
                    ) : rendering ? (
                      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" /> render
                      </span>
                    ) : swipe.enhanced ? (
                      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded text-white flex items-center gap-1" style={{ backgroundColor: 'var(--accent-primary)' }}>
                        <Crown size={10} /> ▶
                      </span>
                    ) : swipe.videoUrl ? (
                      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/80 text-white">▶</span>
                    ) : swipe.status === 'error' ? (
                      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-red-600/80 text-white">!</span>
                    ) : swipe.imageUrl ? (
                      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">preview</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
        )}

        {/* ── Narrative tab: the written explanation behind the swipes ─────────── */}
        {activeTab === 'narrative' && (
          <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
            {experience?.narrative ? (
              <div className="prose prose-base dark:prose-invert max-w-none">
                <LightMarkdown>{experience.narrative}</LightMarkdown>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ui-text-muted)' }}>
                {!isComplete && <Loader2 size={14} className="animate-spin" />}
                <span>{isComplete ? 'No narrative available for this movie.' : 'Writing your explanation…'}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Sources tab: what grounded this movie ────────────────────────────── */}
        {activeTab === 'sources' && (
          <div className="space-y-3">
            {(experience?.sources?.length ?? 0) > 0 ? (
              experience!.sources.map((source, index) => {
                const domain = extractDomain(source.url);
                return (
                  <a
                    key={`${source.url}-${index}`}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-4 p-4 rounded-xl transition-all hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: 'var(--ui-bg-elevated)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {domain && (
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                            alt=""
                            className="w-4 h-4 rounded-sm"
                            loading="lazy"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <span className="text-xs font-medium" style={{ color: 'var(--ui-text-muted)' }}>{domain}</span>
                      </div>
                      <h3 className="text-base font-semibold mb-1 line-clamp-2">{source.title}</h3>
                      <p className="text-sm line-clamp-2" style={{ color: 'var(--ui-text-muted)' }}>{source.snippet}</p>
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
                <p style={{ color: 'var(--ui-text-muted)' }}>
                  {isComplete ? 'No sources available' : 'Collecting sources…'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Continue Exploring: 4 related themes, each opens a new movie run ──── */}
        {relatedTopics.length > 0 && (
          <section className="mt-6 rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
            <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--accent-primary)' }}>
              <Compass size={16} />
              <h3 className="text-base font-semibold" style={{ color: 'var(--ui-text-primary)' }}>Continue Exploring</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {relatedTopics.map((topic) => (
                <button
                  key={topic.title}
                  onClick={() => navigate(`/movie-results?q=${encodeURIComponent(topic.title)}`)}
                  className="text-left flex-shrink-0 w-44 sm:w-52 rounded-lg overflow-hidden border-2 border-transparent transition-all cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
                >
                  <div className="aspect-video bg-black/20">
                    {topic.imageUrl ? (
                      <img src={topic.imageUrl} alt={topic.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film size={18} style={{ color: 'var(--ui-text-muted)' }} />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-sm font-medium line-clamp-2">{topic.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <SignUpModal
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
        context="pro"
        subtitle="You need to be signed in to view your saved video."
      />
    </div>
  );
}
