// Video results page — one template for every type.
// Layout: TopBar (the question) → tab nav (Video / Narrative / Sources) → the type button
// (Magazine-style: current type framed in the accent; its menu regenerates the video as
// another type) → a MAIN VIEWER with a lateral RAIL (swipes, or Cinematic's shots).
// NO video is auto-rendered: even the core swipe waits for the user's Play (cost rule).
// Types (?type=): Auto lets Decisions pick the technique (cinematic / video / animation);
// Cinematic is a real-footage montage (CinematicMontage), Animation = the Cartoon style,
// HD = Video + the premium (Veo/Omni) render of the core swipe, Character opens a character
// with the question, Explore (world model) isn't connected → Video. Fallbacks: any technique
// failing → Video; a Video clip failing → its still frame animated (Ken Burns).
// Every string comes from src/locales/video (the interface language).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronsUp, Compass, Crown, Download, Film, Heart, Image as ImageIcon, Link2, ListOrdered, Loader2, Play, Share2, Sparkles } from 'lucide-react';

import { useSession } from '../../../hooks/useSession.ts';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { logger } from '../../../utils/logger.ts';
import TopBar from '../../../components/results/TopBar.tsx';
import LightMarkdown from '../../../components/LightMarkdown';
import { generateMovie, renderSwipeVideo } from '../movieService.ts';
import { createEnhanceJob, getEnhancedVideo, attachEnhancedToProject, markEnhancedSeen } from '../enhancedVideosService.ts';
import { MoviePersistenceService } from '../video/MoviePersistenceService.ts';
import { normalizeMovieMode } from '../config/movieModes.ts';
import type { MovieExperience, MovieMode, MovieProgress, MovieRelatedTopic, MovieSwipe } from '../types.ts';
import SocialShareRow from '../components/SocialShareRow.tsx';
import { buildCrawlerShareUrl } from '../../../components/share/buildSocialShareUrl.ts';
import SignUpModal from '../../../components/auth/SignUpModal.tsx';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { decideTier, pickVideoModel, stepUp } from '../../auto/modelTier.ts';
import { appSettings } from '../../../config/appSettings.ts';
import { searchExa } from '../../search/providers/engines/exaService.ts';
import type { WebSearchResult } from '../../search/providers/webSearchProvider.ts';
import { setMovieModel } from '../core/llm.ts';
import { VIDEO_TYPES, detectVideoType, movieModeFor, parseVideoType, resolveVideoType, type VideoType } from '../videoType.ts';
import CinematicMontage, { type CinematicInfo } from '../cinematic/CinematicMontage.tsx';
import { getFilmLikeState, saveCinematicFilm, toggleCinematicLike } from '../cinematic/cinematicFilms.ts';
import { exportCinematic, saveFilm } from '../cinematic/exportCinematic.ts';
import { loadNarratorVoice } from '../audio/narratorPrefs.ts';
import { VOICES } from '../../character/voices.ts';

type MovieTab = 'video' | 'timeline' | 'images' | 'sources';

const TABS: Array<{ id: MovieTab; label: string; icon: typeof Film }> = [
  { id: 'video', label: 'vidTab_video', icon: Film },
  { id: 'timeline', label: 'vidTab_timeline', icon: ListOrdered },
  { id: 'images', label: 'vidTab_images', icon: ImageIcon },
  { id: 'sources', label: 'vidTab_sources', icon: Link2 },
];

export default function MovieResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, isLoading: sessionLoading } = useSession();
  const { requestProAccess, canUseProFeature } = useProCredits();
  const { t } = useTranslation();

  const query = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);
  // Decisions rates the question: easy/medium → Luna, complex → Sol (Astra for Premium), and
  // complex questions get more time at the edge. Once per question.
  // Only the HD button goes higher (Luna → Sol → Astra); it sets modelOverrideRef.
  const modelRef = useRef<{ key: string; ready: Promise<void> } | null>(null);
  const modelOverrideRef = useRef<string | null>(null);
  const [answerModel, setAnswerModel] = useState<string | null>(null);
  const chooseModel = (): Promise<void> => {
    if (modelOverrideRef.current) return Promise.resolve();
    if (modelRef.current?.key !== query) {
      modelRef.current = {
        key: query,
        ready: decideTier(query).then((tier) => {
          const model = pickVideoModel(tier);
          setMovieModel(model, tier === 'complex' ? 110_000 : undefined);
          setAnswerModel(model);
        }),
      };
    }
    return modelRef.current.ready;
  };
  // Optional explicit style in the URL; otherwise the enhancement agent proposes one.
  const modeParam = useMemo(() => normalizeMovieMode(new URLSearchParams(location.search).get('mode')), [location.search]);
  // Reopen a saved movie (Home "latest enhanced" card) — loads from Supabase, no regeneration.
  const projectIdParam = useMemo(() => new URLSearchParams(location.search).get('projectId') || '', [location.search]);
  // Opening frame painted by Search's Explore further (only our own storage / Cloudinary URLs).
  const typeParam = useMemo(() => parseVideoType(new URLSearchParams(location.search).get('type')), [location.search]);
  const frameParam = useMemo(() => {
    const f = new URLSearchParams(location.search).get('frame') || '';
    return /^https:\/\/([a-z0-9-]+\.supabase\.co|res\.cloudinary\.com)\//.test(f) ? f : undefined;
  }, [location.search]);

  const [swipes, setSwipes] = useState<MovieSwipe[]>([]);
  const [experience, setExperience] = useState<MovieExperience | null>(null);
  const [progress, setProgress] = useState<MovieProgress>({ stage: 'enhancing', message: 'Starting...', progress: 0 });
  const [selectedSwipeId, setSelectedSwipeId] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [enhancingIds, setEnhancingIds] = useState<Set<string>>(new Set());
  const [enhanceNotice, setEnhanceNotice] = useState<string | null>(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [signUpSubtitle, setSignUpSubtitle] = useState<string | null>(null);
  // Share line: the share card opens from its button; the heart is the video's popularity.
  const [shareOpen, setShareOpen] = useState(false);
  const [like, setLike] = useState<{ count: number; liked: boolean } | null>(null);
  const [likeGuestNote, setLikeGuestNote] = useState(false);
  // Cinematic download: composed in the browser in real time (0–1 while it records).
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportFailed, setExportFailed] = useState(false);
  const exportAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => exportAbortRef.current?.abort(), []);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MovieTab>('video');
  const [mode, setMode] = useState<MovieMode | null>(modeParam ?? null);
  // Kept in its own state so mode regenerations reuse it untouched.
  const [relatedTopics, setRelatedTopics] = useState<MovieRelatedTopic[]>([]);
  // The narrative as soon as it's written (Overview shows before the movie completes).
  const [draftNarrative, setDraftNarrative] = useState<string | null>(null);
  // The technique actually running (after Auto / availability / fallbacks).
  const [videoType, setVideoType] = useState<VideoType | null>(null);
  const [typeNotice, setTypeNotice] = useState<string | null>(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  // Cinematic's data for the shared sections; cineRun remounts it (HD regeneration).
  const [cine, setCine] = useState<CinematicInfo | null>(null);
  const [cineRun, setCineRun] = useState(0);
  // Fresh web results (Exa) for every type: Images and Sources tabs, Cinematic's facts.
  const [web, setWeb] = useState<WebSearchResult[] | null>(null);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!typeMenuOpen) return;
    const close = (e: PointerEvent) => { if (!typeMenuRef.current?.contains(e.target as Node)) setTypeMenuOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [typeMenuOpen]);
  // HD: once the core swipe has its frame, its premium render starts by itself.
  const hdPendingRef = useRef(false);

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
    setDraftNarrative(null);
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
    // Answer model for this question (Luna / Sol / Astra) — chosen once per question.
    chooseModel().then(() => {
      return generateMovie(questionText, {
      userId: session?.user?.id || 'curios-guest',
      // LTX generates each swipe's audio (generate_audio); a separate ElevenLabs
      // narration track would be unused and is redundant cost, so it's disabled.
      enableNarration: false,
      renderCoreVideo: false,
      mode: modeOverride,
      // A mode change repaints every frame in the new style.
      coreFrameUrl: modeOverride ? undefined : frameParam,
      // Mode regeneration keeps the existing Continue Exploring topics as-is.
      relatedTopics: relatedTopics.length > 0 ? relatedTopics : undefined,
      // A swipe with a queued Enhance skips its default image/video render — the
      // premium result will replace it instead.
      isEnhanceRequested: (swipe) => enhanceRequestedRef.current.has(swipe.id),
      onProgress: (p) => {
        setProgress(p);
        if (p.swipes) {
          setSwipes([...p.swipes].sort((a, b) => a.order - b.order));
          // Select the core swipe right away: its title and script show while its frame paints.
          const core = p.swipes.find((s) => s.isCore) ?? p.swipes[0];
          if (core) setSelectedSwipeId((cur) => cur ?? core.id);
        }
      },
      onPartial: (patch) => {
        if (patch.narrative) setDraftNarrative(patch.narrative);
        if (patch.relatedTopics) setRelatedTopics(patch.relatedTopics);
      },
      onSwipeReady: (swipe) => {
        upsertSwipe(swipe);
        // Auto-select the core swipe as soon as it has an image.
        setSelectedSwipeId((cur) => cur ?? (swipe.isCore && swipe.imageUrl ? swipe.id : cur));
      },
    });
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
        setError(t('vidGenFailed'));
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
      setProgress({ stage: 'complete', message: '', progress: 100 });
      const core = exp.swipes.find((s) => s.isCore) || exp.swipes[0];
      if (core) setSelectedSwipeId(core.id);
      return true;
    };

    if (projectIdParam) {
      hasStartedRef.current = true;
      loadSaved(projectIdParam)
        .then((ok) => { if (!ok) setError(t('vidNotFound')); })
        .catch((err) => {
          logger.error('[MovieResults] Load failed', { error: err instanceof Error ? err.message : String(err) });
          setError(t('vidLoadFailed'));
        });
      return;
    }

    if (!query.trim()) return;
    hasStartedRef.current = true;

    void (async () => {
      // Reload/back-navigation with the same question → serve the stored movie
      // (text, frames, videos) instead of paying for a new generation.
      // (Skipped when the user chose "Continue with Astra" — that's an explicit regeneration.)
      if (session?.user?.id && typeParam === 'auto') {
        const existingId = await new MoviePersistenceService()
          .findLatestByQuestion(session.user.id, query)
          .catch(() => null);
        if (existingId && (await loadSaved(existingId).catch(() => false))) {
          window.history.replaceState(null, '', `/movie-results?projectId=${existingId}`);
          return;
        }
      }

      // The technique (Decisions) and the model (difficulty) are decided together.
      const [picked] = await Promise.all([
        typeParam === 'auto' ? detectVideoType(query) : Promise.resolve(typeParam),
        chooseModel(),
      ]);
      const { type, noticeKey } = resolveVideoType(picked);
      if (noticeKey) setTypeNotice(t(noticeKey));
      if (type === 'character') {
        navigate(`/character?q=${encodeURIComponent(query)}`, { replace: true });
        return;
      }
      setVideoType(type);
      if (type === 'cinematic') return; // CinematicMontage takes it from here
      hdPendingRef.current = type === 'hd';
      startGeneration(query, modeParam ?? movieModeFor(type));
    })();
  }, [query, modeParam, projectIdParam, session?.user?.id, sessionLoading]);

  // Cinematic found no usable footage (or failed) → the default technique, Video.
  const fallbackToVideo = (reason: string) => {
    logger.warn('[MovieResults] Cinematic fell back to Video', { reason });
    setTypeNotice(t('vidNoticeNoFootage'));
    setVideoType('video');
    startGeneration(query, modeParam);
  };

  const chooseType = (id: string) => {
    if (!query.trim()) return;
    window.location.assign(`/movie-results?q=${encodeURIComponent(query)}&type=${id}`);
  };

  const isComplete = progress.stage === 'complete';
  const selectedSwipe = swipes.find((s) => s.id === selectedSwipeId) || swipes.find((s) => s.isCore) || swipes[0];
  const frameIndex = selectedSwipe ? swipes.findIndex((s) => s.id === selectedSwipe.id) + 1 : 0;

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
        setEnhanceNotice(t('vidEnhanceFailed'));
        const target = swipesRef.current.find((s) => s.id === swipeId);
        if (target && !target.videoUrl) void triggerLazyVideo(target);
      }
      return;
    }
    // Taking unusually long — the server job keeps going; it will land on Home when ready.
    enhanceRequestedRef.current.delete(swipeId);
    clearEnhancing(swipeId);
    setEnhanceNotice(t('vidEnhanceBackground'));
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
      setSignUpSubtitle(null);
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
    setEnhanceNotice(t('vidEnhancing'));
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
      setError(t('vidEnhanceStartFailed'));
    }
  };

  // HD: start the premium render of the core swipe as soon as it has a frame (Pro, once).
  useEffect(() => {
    if (!hdPendingRef.current) return;
    const core = swipes.find((s) => s.isCore && s.imageUrl);
    if (!core) return;
    hdPendingRef.current = false;
    void requestEnhance(core);
  }, [swipes]);

  const savedId = experience?.id && !experience.id.startsWith('local-') ? experience.id : null;

  const handleShared = () => {
    if (savedId) new MoviePersistenceService().incrementShareCount(savedId).catch(() => undefined);
  };

  // Hearts. A generated video's live on its saved row (movie_project_likes; the row carries
  // its creator and like_count). A Cinematic film gets its own row (cinematic_films) once the
  // signed-in creator's film is ready; a shared link brings the film id (?film=).
  const userId = session?.user?.id;
  const filmParam = useMemo(() => new URLSearchParams(location.search).get('film'), [location.search]);
  const [filmId, setFilmId] = useState<string | null>(filmParam);
  useEffect(() => {
    if (videoType !== 'cinematic' || !cine || filmParam || !userId) return;
    let alive = true;
    saveCinematicFilm(userId, query, cine.title, cine.credits[0]?.image).then((id) => { if (alive && id) setFilmId(id); });
    return () => { alive = false; };
  }, [videoType, cine, filmParam, userId, query]);
  const likeTarget = videoType === 'cinematic'
    ? (filmId ? { kind: 'film' as const, id: filmId } : null)
    : (savedId ? { kind: 'movie' as const, id: savedId } : null);
  useEffect(() => {
    setLike(null);
    if (!likeTarget) return;
    let alive = true;
    const load = likeTarget.kind === 'film'
      ? getFilmLikeState(likeTarget.id, userId)
      : new MoviePersistenceService().getLikeState(likeTarget.id, userId);
    load.then((s) => { if (alive) setLike(s); }).catch(() => undefined);
    return () => { alive = false; };
  }, [likeTarget?.kind, likeTarget?.id, userId]);
  const toggleLike = async () => {
    if (!userId) { setLikeGuestNote(true); return; }
    if (!likeTarget || !like) return;
    const liked = !like.liked;
    setLike({ liked, count: Math.max(0, like.count + (liked ? 1 : -1)) });
    try {
      if (likeTarget.kind === 'film') await toggleCinematicLike(likeTarget.id);
      else await new MoviePersistenceService().toggleLike(likeTarget.id, userId);
    } catch {
      setLike(like);
    }
  };

  const roleLabel = (s: MovieSwipe) => t(`vidRole_${s.isCore ? 'core' : s.role}`);
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

  // Web search once per question (also for saved videos opened by id).
  const webQuery = displayQuery;
  useEffect(() => {
    if (!webQuery.trim()) return;
    let alive = true;
    setWeb(null);
    searchExa(webQuery, 8).then((r) => { if (alive) setWeb(r); });
    return () => { alive = false; };
  }, [webQuery]);
  const webImages = (web ?? []).filter((r, i, all) => r.image && all.findIndex((x) => x.image === r.image) === i);
  const sourceList: { title: string; url: string; snippet: string }[] =
    videoType !== 'cinematic' && (experience?.sources?.length ?? 0) > 0 ? experience!.sources : (web ?? []);
  const exploreTopics: { title: string; imageUrl?: string }[] =
    videoType === 'cinematic'
      ? (cine?.related ?? []).map((title, i) => ({ title, imageUrl: cine?.credits[(i + 1) % cine.credits.length]?.image || undefined }))
      : relatedTopics;

  // HD / quality extension: rebuild this video one model up — Luna → Sol, Sol → Astra
  // (Astra costs 1 Pro Credit). The only way Astra is ever used for Video.
  const nextModel = answerModel ? stepUp(answerModel) : null;
  const canStepUp = Boolean(nextModel && nextModel !== answerModel)
    && (videoType === 'cinematic' ? Boolean(cine) : isComplete);
  const stepUpQuality = async () => {
    if (!canStepUp || !nextModel) return;
    if (nextModel === appSettings.models.astra && !(await requestProAccess())) return;
    modelOverrideRef.current = nextModel;
    setMovieModel(nextModel, 110_000);
    setAnswerModel(nextModel);
    if (videoType === 'cinematic') {
      setCine(null);
      setCineRun((n) => n + 1);
      return;
    }
    hasStartedRef.current = true;
    resetForNewRun();
    setProgress({ stage: 'enhancing', message: '', progress: 0 });
    startGeneration(experienceRef.current?.question || query, mode ?? undefined);
  };
  // Video types: "Mejorar" (premium Veo render of the chapter on screen) lives up here.
  const enhanceButton = (
    <button
      type="button"
      onClick={() => selectedSwipe && requestEnhance(selectedSwipe)}
      disabled={!selectedSwipe || isEnhancing || isEnhanced}
      title={t('vidHdTip')}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-default"
      style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
    >
      {isEnhancing ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />} {t('vidEnhance')}
    </button>
  );
  const qualityButton = (
    <button
      type="button"
      onClick={() => void stepUpQuality()}
      disabled={!canStepUp}
      title={answerModel && !nextModel ? '' : answerModel === appSettings.models.astra ? t('vidQualityMax') : t('vidQualityTip')}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-default"
      style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
    >
      <ChevronsUp size={16} /> HD
    </button>
  );

  // Shared under the player for every type: share, then the overview (shown, not collapsed).
  // Links go through curiosai.com/share so WhatsApp, X, LinkedIn… show this video's own
  // title, caption and frame (the SPA page only has the generic site tags); people who
  // open it are sent on to the video.
  const site = 'https://curiosai.com';
  const shareLink = (title: string, caption: string, image: string | undefined, deepLink: string) =>
    buildCrawlerShareUrl({ title, description: caption, imageUrls: image ? [image] : [], deepLink });
  const coreImage = swipes.find((s) => s.isCore)?.imageUrl || selectedSwipe?.imageUrl;
  const shareCard = videoType === 'cinematic'
    ? (cine ? (() => {
        const caption = cine.overview.split(/(?<=[.!?])\s/)[0];
        return { title: cine.title, caption, hashtags: [] as string[], video: undefined,
          url: shareLink(cine.title, caption, cine.credits[0]?.image, `${site}/movie-results?q=${encodeURIComponent(displayQuery)}&type=cinematic${filmId ? `&film=${filmId}` : ''}`) };
      })() : null)
    : (isComplete && experience?.viral ? {
        title: experience.viral.title, caption: experience.viral.caption, hashtags: experience.viral.hashtags,
        video: selectedSwipe?.videoUrl || experience.coreVideoUrl,
        url: shareLink(experience.viral.title, experience.viral.caption, coreImage,
          savedId ? `${site}/movie/share/${savedId}` : `${site}/movie-results?q=${encodeURIComponent(displayQuery)}`),
      } : null);
  const overview = videoType === 'cinematic' ? cine?.overview : (experience?.narrative ?? draftNarrative);
  const downloadFilm = async () => {
    if (!cine || exportProgress !== null) return;
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExportFailed(false);
    setExportProgress(0);
    try {
      const voiceId = loadNarratorVoice(session?.user);
      const film = await exportCinematic({
        title: cine.title,
        scenes: cine.scenes,
        voiceId,
        gender: VOICES.find((v) => v.id === voiceId)?.gender === 'male' ? 'male' : 'female',
        captions: (() => { try { return localStorage.getItem('cinematicCaptions') !== 'off'; } catch { return true; } })(),
        onProgress: setExportProgress,
        signal: controller.signal,
      });
      saveFilm(film, cine.title);
    } catch (err) {
      if (!controller.signal.aborted) {
        logger.warn('[MovieResults] Cinematic download failed', { error: err instanceof Error ? err.message : String(err) });
        setExportFailed(true);
      }
    } finally {
      setExportProgress(null);
    }
  };
  const lineBtn = 'inline-flex items-center gap-2 h-10 px-4 rounded-full border text-sm font-medium transition-colors';
  const lineBtnStyle = { borderColor: 'var(--ui-border-default)', backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-primary)' } as const;
  const sharedSections = (
    <>
      {shareCard && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* Heart on the left: guests always see it (tapping asks them to sign up). */}
          {(like || !userId) && (
            <button
              type="button"
              onClick={() => void toggleLike()}
              aria-pressed={Boolean(like?.liked)}
              title={like?.liked ? t('vidUnlike') : t('vidLike')}
              aria-label={like?.liked ? t('vidUnlike') : t('vidLike')}
              className={`${lineBtn} ${like && like.count > 0 ? '' : '!px-0 w-10 justify-center'}`}
              style={{ ...lineBtnStyle, color: like?.liked ? 'var(--accent-primary)' : lineBtnStyle.color }}
            >
              <Heart size={16} fill={like?.liked ? 'currentColor' : 'none'} />
              {like && like.count > 0 && <span>{like.count}</span>}
            </button>
          )}
          {videoType === 'cinematic' && cine && (
            <button
              type="button"
              onClick={() => void downloadFilm()}
              disabled={exportProgress !== null}
              title={exportProgress !== null ? t('vidDownloading') : t('vidDownload')}
              aria-label={t('vidDownload')}
              className={`${lineBtn} ${exportProgress !== null ? '' : '!px-0 w-10 justify-center'} disabled:cursor-wait`}
              style={lineBtnStyle}
            >
              {exportProgress !== null ? (
                <><Loader2 size={16} className="animate-spin" /><span className="tabular-nums">{Math.round(exportProgress * 100)}%</span></>
              ) : (
                <Download size={16} />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShareOpen((o) => !o)}
            aria-expanded={shareOpen}
            title={t('vidShareAction')}
            aria-label={t('vidShareAction')}
            className={`${lineBtn} !px-0 w-10 justify-center`}
            style={lineBtnStyle}
          >
            <Share2 size={16} />
          </button>
          {exportProgress !== null && (
            <p className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>{t('vidDownloadKeepOpen')}</p>
          )}
          {exportFailed && (
            <p className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>{t('vidDownloadFailed')}</p>
          )}
          {likeGuestNote && (
            <p className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>
              {t('vidLikeGuest')}{' '}
              <button
                type="button"
                onClick={() => { setSignUpSubtitle(t('vidLikeGuest')); setShowSignUp(true); }}
                className="font-medium underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                {t('vidSignUp')}
              </button>
            </p>
          )}
        </div>
      )}
      {shareCard && shareOpen && (
        <div className="mt-3 rounded-xl p-5" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent-primary)' }}>
            <Share2 size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">{t('vidShare')}</span>
          </div>
          <h3 className="text-lg font-semibold">{shareCard.title}</h3>
          {shareCard.caption && (
            <p className="text-sm mt-1 mb-3" style={{ color: 'var(--ui-text-muted)' }}>{shareCard.caption}</p>
          )}
          {shareCard.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {shareCard.hashtags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-secondary)' }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <SocialShareRow shareUrl={shareCard.url} title={shareCard.title} caption={shareCard.caption} videoUrl={shareCard.video} onShared={handleShared} />
        </div>
      )}
      {overview && (
        <section className="mt-6 rounded-xl p-5 sm:p-6" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
          <h3 className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--accent-primary)' }}>{t('vidOverview')}</h3>
          <div className="prose prose-base dark:prose-invert max-w-none">
            <LightMarkdown>{overview}</LightMarkdown>
          </div>
        </section>
      )}
    </>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      <TopBar query={displayQuery} timeAgo="" rightSlot={videoType === 'cinematic' ? qualityButton : enhanceButton} />


      {/* Tab navigation: Video / Narrative / Sources (every type uses this template) */}
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
                  {t(tab.label)}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* The video's type, Magazine-style: the current one in a framed button; the menu
            regenerates the video as another type. */}
        {videoType && (
          <div className="mb-4 relative inline-block" ref={typeMenuRef}>
            <button
              type="button"
              onClick={() => setTypeMenuOpen((o) => !o)}
              aria-expanded={typeMenuOpen}
              title={t('vidChangeType')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-transparent text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-opacity hover:opacity-80"
              style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
            >
              {t(`vidType_${videoType}`)}
              <ChevronDown size={14} className={`transition-transform ${typeMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {typeMenuOpen && (
              <div
                className="absolute left-0 top-full mt-2 rounded-lg shadow-lg border overflow-hidden min-w-[200px] z-20"
                style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
              >
                {VIDEO_TYPES.filter((v) => v.id !== 'auto' && v.id !== videoType).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => chooseType(v.id)}
                    className="w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--ui-bg-secondary)]"
                    style={{ color: 'var(--ui-text-primary)' }}
                  >
                    {t(`vidType_${v.id}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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

        {typeNotice && (
          <div className="mb-4 rounded-lg p-4 text-sm" style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-secondary)' }}>
            {typeNotice}
          </div>
        )}

        {/* Progress bar while generating */}
        {videoType !== 'cinematic' && !isComplete && !error && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--ui-text-secondary)' }}>
              <Loader2 size={16} className="animate-spin" />
              <span>{t(`vidStage_${progress.stage}`)}</span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress.progress}%`, backgroundColor: 'var(--accent-primary)' }}
              />
            </div>
          </div>
        )}

        {/* ── Video tab: player + chapter rail, then share, overview (shared template) ── */}
        {videoType === 'cinematic' ? (
          <CinematicMontage
            key={cineRun}
            question={query || experience?.question || ''}
            tab={activeTab === 'video' ? 'video' : activeTab === 'timeline' ? 'timeline' : 'hidden'}
            context={web}
            belowPlayer={sharedSections}
            onReady={setCine}
            onWatch={() => setActiveTab('video')}
            onFail={fallbackToVideo}
          />
        ) : activeTab === 'video' && (
          <>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main viewer (active swipe) */}
          <div className="flex-1 min-w-0">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              {selectedSwipe?.videoUrl ? (
                <video src={selectedSwipe.videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
              ) : selectedSwipe?.imageUrl && selectedSwipe.status === 'error' && !isGenerating ? (
                <>
                  {/* Last fallback: the clip couldn't be made — animate the still frame instead. */}
                  <img src={selectedSwipe.imageUrl} alt={selectedSwipe.title} className="w-full h-full object-cover ken-burns" />
                  <button
                    type="button"
                    onClick={() => selectedSwipe && requestRenderSwipe({ ...selectedSwipe, status: 'image_ready' })}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  >
                    <Play size={12} /> {t('vidRetry')}
                  </button>
                </>
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
                        <span className="text-sm">{t('vidEnhancingSwipe')}</span>
                      </>
                    ) : isGenerating ? (
                      <>
                        <Loader2 size={30} className="animate-spin" />
                        <span className="text-sm">{t('vidGenerating')}</span>
                      </>
                    ) : (
                      <>
                        <span className="h-14 w-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}>
                          <Play size={26} className="ml-1" />
                        </span>
                        <span className="text-sm font-medium">{t('vidTapToGenerate')}</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-white/70">
                  <Loader2 size={28} className="animate-spin" />
                  <span className="text-sm">{t(isEnhancing ? 'vidEnhancingSwipe' : 'vidCreatingSwipes')}</span>
                </div>
              )}
            </div>

            {/* Frame indicator (Mejorar — the premium re-render of the active swipe — is in the top bar) */}
            {swipes.length > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs font-medium" style={{ color: 'var(--ui-text-muted)' }}>
                  {t('vidFrame').replace('{n}', String(frameIndex)).replace('{total}', String(swipes.length))}
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
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded text-[var(--ui-text-on-accent)]" style={{ backgroundColor: 'var(--accent-primary)' }}>
                      <Crown size={10} /> {t('vidEnhanced')}
                    </span>
                  )}
                  <h2 className="text-sm font-medium">{selectedSwipe.title}</h2>
                </div>
                {selectedSwipe.narration && (
                  <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>{selectedSwipe.narration}</p>
                )}
              </div>
            )}
          </div>

          {/* Lateral swipe rail (desktop) → horizontal on mobile */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="mb-2">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
                {t('vidSwipes')} {swipes.length > 0 && `(${swipes.length})`}
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
                    <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded" style={swipe.isCore ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' } : { backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}>
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
                      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded text-[var(--ui-text-on-accent)] flex items-center gap-1" style={{ backgroundColor: 'var(--accent-primary)' }}>
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
        {sharedSections}
          </>
        )}

        {/* ── Timeline tab: the chapters in order ─────────────────────────────── */}
        {activeTab === 'timeline' && videoType !== 'cinematic' && (
          <ol className="space-y-3">
            {swipes.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => { handleSelect(s); setActiveTab('video'); }}
                  className="w-full flex gap-4 p-3 rounded-xl text-left transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--ui-bg-elevated)' }}
                >
                  {s.imageUrl && <img src={s.imageUrl} alt="" className="w-32 sm:w-40 aspect-video object-cover rounded-lg flex-shrink-0" loading="lazy" />}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent-primary)' }}>
                      {t('vidFrame').replace('{n}', String(i + 1)).replace('{total}', String(swipes.length))} · {roleLabel(s)}
                    </p>
                    <p className="text-sm font-semibold">{s.title}</p>
                    {s.narration && <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>{s.narration}</p>}
                  </div>
                </button>
              </li>
            ))}
            {swipes.length === 0 && (
              <li className="flex items-center gap-2 text-sm" style={{ color: 'var(--ui-text-muted)' }}>
                <Loader2 size={14} className="animate-spin" /> {t('vidCreatingSwipes')}
              </li>
            )}
          </ol>
        )}

        {/* ── Images tab: pictures from the web search (Exa) ──────────────────── */}
        {activeTab === 'images' && (
          webImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {webImages.map((r) => (
                <a key={r.image} href={r.url} target="_blank" rel="noopener noreferrer" title={r.title} className="block rounded-xl overflow-hidden aspect-video" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
                  <img src={r.image} alt={r.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-muted)' }}>
              {t(web === null ? 'vidCollectingSources' : 'vidNoImages')}
            </div>
          )
        )}

        {/* ── Sources tab: what grounded this video (+ footage credits for Cinematic) ── */}
        {activeTab === 'sources' && (
          <div className="space-y-3">
            {sourceList.length > 0 ? (
              sourceList.map((source, index) => {
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
                  {t(web === null || (videoType !== 'cinematic' && !isComplete) ? 'vidCollectingSources' : 'vidNoSources')}
                </p>
              </div>
            )}
            {videoType === 'cinematic' && cine && cine.credits.length > 0 && (
              <>
                <h3 className="pt-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>{t('vidFootage')}</h3>
                {cine.credits.map((c) => (
                  <a key={c.id} href={c.pageUrl} target="_blank" rel="noopener noreferrer" className="flex gap-4 p-4 rounded-xl transition-all hover:opacity-90" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
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
              </>
            )}
          </div>
        )}

        {/* ── Continue exploring: related questions, each opens a new video ────── */}
        {exploreTopics.length > 0 && (
          <section className="mt-6 rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
            <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--accent-primary)' }}>
              <Compass size={16} />
              <h3 className="text-base font-semibold" style={{ color: 'var(--ui-text-primary)' }}>{t('vidContinue')}</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {exploreTopics.map((topic) => (
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
        subtitle={signUpSubtitle ?? 'You need to be signed in to view your saved video.'}
      />
    </div>
  );
}
