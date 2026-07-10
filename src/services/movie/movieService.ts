// Movie Mode orchestrator (swipe-based).
// Pipeline: enhance → research → narrative → swipe set → CORE frame (Nano Banana 2 Lite)
// → CORE video (LTX) kicked immediately + the 4 secondary frames generated in the background
// (staggered, non-blocking) → narration (optional) → viral → persist.
//
// Speed rule: the core video only needs the core frame, so we never wait on the secondary
// frames to start it. Secondary swipes stay as image previews and lazy-generate their video
// on demand via renderSwipeVideo(). Premium "Enhance" (gpt-image-2 + Omni) is a separate
// server-owned background job — see the enhance-swipe edge function + enhancedVideosService.
// No final stitch — each swipe is a standalone shareable unit.
//
// Reuses cinematic infrastructure: search tools, streamNarrative, NarrationService.

import { searchWithTavily } from '../../commonService/searchTools/tavilyService.ts';
import { braveSearchTool } from '../../commonService/searchTools/braveSearchTool.ts';
import { streamNarrative } from '../cinematic/core/narrativeFlow.ts';
import { NarrationService } from '../cinematic/audio/NarrationService.ts';
import { logger } from '../../utils/logger.ts';

import { enhanceQuestion } from './agents/QuestionEnhancementAgent.ts';
import { warmMovieGpu } from './warmupService.ts';
import { buildSwipeSet } from './agents/StoryboardAgent.ts';
import { packageForVirality } from './agents/ViralDirectorAgent.ts';
import { NanoBananaProvider } from './providers/NanoBananaProvider.ts';
import { RunPodLTXProvider } from './providers/RunPodLTXProvider.ts';
import { MoviePersistenceService } from './video/MoviePersistenceService.ts';
import type {
  GenerateMovieOptions,
  MovieExperience,
  MovieSwipe,
  MovieSource,
  RenderSwipeVideoOptions,
} from './types.ts';

const DEFAULT_USER_ID = 'curios-guest';

// Secondary frames fire near-concurrently (paid Vertex tier handles 8 parallel fine);
// a small stagger just avoids a synchronized burst.
const SECONDARY_IMAGE_STAGGER_MS = 250;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// LTX-2 can synthesize a spoken voiceover when the prompt asks for it. We fold the
// swipe's narration script into the motion prompt so the generated audio speaks it —
// giving narration without a separate TTS (ElevenLabs) call. (Experimental: phrasing
// may need tuning depending on how LTX interprets the voiceover directive.)
function buildLtxPrompt(swipe: MovieSwipe): string {
  const motion = swipe.videoPrompt?.trim() || '';
  const script = swipe.narration?.trim();
  if (!script) return motion;
  return `${motion}\n\nVoiceover: a single calm narrator clearly speaks these exact words aloud, with no on-screen text or captions: "${script}"`;
}

async function researchSources(query: string): Promise<MovieSource[]> {
  try {
    const tavily = await searchWithTavily(query);
    if (tavily.results?.length) {
      return tavily.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content }));
    }
  } catch (error) {
    logger.warn('[MovieService] Tavily failed, trying Brave', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const brave = await braveSearchTool(query);
    return brave.web.map((w) => ({ title: w.title, url: w.url, snippet: w.content }));
  } catch (error) {
    logger.warn('[MovieService] Brave fallback failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function generateMovie(
  question: string,
  options: GenerateMovieOptions = {},
): Promise<MovieExperience> {
  const startTime = Date.now();
  const userId = options.userId || DEFAULT_USER_ID;
  const aspectRatio = options.aspectRatio || '16:9';
  const renderCoreVideo = options.renderCoreVideo !== false; // default true
  const emit = options.onProgress;

  // Wake the self-hosted video GPU (no-op if already warm or RunPod isn't configured) —
  // the weights load while steps 1-5 run, so the core video render hits a warm worker.
  warmMovieGpu();

  // Step 1 — enhance the question
  emit?.({ stage: 'enhancing', message: 'Understanding your question...', progress: 6 });
  const enhanced = await enhanceQuestion(question);

  // Step 2 — research / grounding
  emit?.({ stage: 'research', message: 'Collecting trusted sources...', progress: 16 });
  const sources = await researchSources(enhanced.researchQuestion);

  // Step 3 — narrative (reuse cinematic narrator)
  emit?.({ stage: 'directing', message: 'Writing the swipe script...', progress: 30 });
  const narrative = await streamNarrative(question, sources);

  // Step 4 — swipe set (1 core + 4 secondary)
  emit?.({ stage: 'storyboard', message: 'Designing your swipes...', progress: 42 });
  const { title, description, swipes } = await buildSwipeSet({
    question,
    visualStoryQuestion: enhanced.visualStoryQuestion,
    narrative,
    sources,
  });

  const styleSeed = Math.floor(Math.random() * 1_000_000); // shared seed → style consistency

  // Cheap/fast default image model (Nano Banana 2 Lite). gpt-image-2 is reserved for the
  // premium Enhance job (enhance-swipe edge function), not the default generation.
  const imageProvider = new NanoBananaProvider();
  const coreSwipe = swipes.find((s) => s.isCore) || swipes[0];
  const secondarySwipes = swipes.filter((s) => s.id !== coreSwipe?.id);

  // Step 5 — CORE frame first: it's the only thing the core video (image-to-video) needs,
  // so we get it before anything else and don't wait on the secondary frames.
  emit?.({ stage: 'images', message: 'Creating your core frame...', progress: 50, swipes });
  if (coreSwipe) {
    if (options.isEnhanceRequested?.(coreSwipe)) {
      // User already queued the premium Enhance for this swipe — don't spend the default render.
      logger.info('[MovieService] Core frame skipped: Enhance queued', { swipeId: coreSwipe.id });
    } else {
      try {
        coreSwipe.imageUrl = await imageProvider.generate(coreSwipe.imagePrompt, { userId });
        coreSwipe.status = 'image_ready';
      } catch (error) {
        coreSwipe.status = 'error';
        coreSwipe.error = error instanceof Error ? error.message : String(error);
      }
    }
    options.onSwipeReady?.(coreSwipe);
  }

  // Step 6 — kick the CORE video NOW, without awaiting. The secondary frames must not
  // block the video the user is waiting on; both run concurrently below.
  const ltx = new RunPodLTXProvider();
  const coreVideoPromise: Promise<void> =
    renderCoreVideo && coreSwipe?.imageUrl && coreSwipe.status !== 'error' && !options.isEnhanceRequested?.(coreSwipe)
      ? (async () => {
          emit?.({ stage: 'rendering', message: 'Rendering your core swipe...', progress: 64, swipes });
          coreSwipe.status = 'rendering';
          options.onSwipeReady?.(coreSwipe);
          try {
            const { videoUrl } = await ltx.generate({
              imageUrl: coreSwipe.imageUrl!,
              prompt: buildLtxPrompt(coreSwipe),
              duration: coreSwipe.durationSeconds,
              seed: styleSeed,
              userId,
              sceneId: coreSwipe.id,
            });
            coreSwipe.videoUrl = videoUrl;
            coreSwipe.status = 'ready';
          } catch (error) {
            coreSwipe.status = 'error';
            coreSwipe.error = error instanceof Error ? error.message : String(error);
            logger.error('[MovieService] Core swipe video failed', { error: coreSwipe.error });
          }
          options.onSwipeReady?.(coreSwipe);
        })()
      : Promise.resolve();

  // Step 7 — secondary frames in the background, staggered ~1s apart (Gemini rate limit),
  // each surfacing as soon as it's ready. Their video stays lazy/on-demand (renderSwipeVideo).
  const secondaryImagesPromise = Promise.all(
    secondarySwipes.map(async (swipe, index) => {
      await delay(index * SECONDARY_IMAGE_STAGGER_MS);
      if (options.isEnhanceRequested?.(swipe)) {
        options.onSwipeReady?.(swipe);
        return;
      }
      try {
        swipe.imageUrl = await imageProvider.generate(swipe.imagePrompt, { userId });
        swipe.status = 'image_ready';
      } catch (error) {
        swipe.status = 'error';
        swipe.error = error instanceof Error ? error.message : String(error);
      }
      options.onSwipeReady?.(swipe);
      emit?.({ stage: 'images', message: 'Adding more swipe frames...', progress: 74, swipes });
    }),
  );

  await Promise.all([coreVideoPromise, secondaryImagesPromise]);

  // Optional narration (disabled by default in the UI) — needs the frames, so it runs here.
  if (options.enableNarration) {
    try {
      const narrationService = new NarrationService();
      const segments = swipes.map((s) => ({
        text: s.narration,
        startTime: 0,
        duration: s.durationSeconds,
        sceneId: s.id,
      }));
      const results = await narrationService.generateSegmentedNarration(segments);
      swipes.forEach((s) => {
        const r = results.get(s.id);
        if (r) s.narrationAudioUrl = r.audioUrl;
      });
    } catch (error) {
      logger.warn('[MovieService] Narration failed (non-fatal)', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const totalDurationSeconds = swipes.reduce((sum, s) => sum + s.durationSeconds, 0);

  const experience: MovieExperience = {
    id: `${Date.now()}`,
    question,
    enhanced,
    title,
    description,
    narrative,
    swipes,
    sources,
    totalDurationSeconds,
    styleSeed,
    coreVideoUrl: coreSwipe?.videoUrl,
    fullVideoUrl: coreSwipe?.videoUrl,
  };

  // Step 8 — viral packaging
  emit?.({ stage: 'viral', message: 'Optimizing for virality...', progress: 92, swipes });
  experience.viral = await packageForVirality({ question, narrative, swipes });

  // Persist
  try {
    const persistence = new MoviePersistenceService();
    const savedId = await persistence.saveMovie(experience, userId, aspectRatio, Date.now() - startTime);
    experience.id = savedId;
  } catch (error) {
    logger.warn('[MovieService] Persistence failed (non-fatal)', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  emit?.({
    stage: 'complete',
    message: coreSwipe?.videoUrl ? 'Your swipes are ready' : 'Your swipe frames are ready',
    progress: 100,
    swipes,
  });

  logger.info('[MovieService] Generation finished', {
    durationMs: Date.now() - startTime,
    swipeCount: swipes.length,
    coreRendered: Boolean(coreSwipe?.videoUrl),
  });

  return experience;
}

/**
 * Lazy, on-demand video generation for a single (usually secondary) swipe.
 * Triggered when the user selects/navigates to a swipe that has only an image.
 * Mutates and returns the swipe; best-effort persists the new video URL.
 */
export async function renderSwipeVideo(
  swipe: MovieSwipe,
  options: RenderSwipeVideoOptions = {},
): Promise<MovieSwipe> {
  if (swipe.videoUrl) return swipe; // already cached

  // A swipe whose default frame was skipped (Enhance queued, then failed) has no
  // image yet — generate it now so the fallback render can proceed.
  if (!swipe.imageUrl) {
    try {
      swipe.imageUrl = await new NanoBananaProvider().generate(swipe.imagePrompt, { userId: options.userId });
      swipe.status = 'image_ready';
    } catch (error) {
      swipe.status = 'error';
      swipe.error = error instanceof Error ? error.message : String(error);
      return swipe;
    }
  }

  const ltx = new RunPodLTXProvider();
  swipe.status = 'rendering';
  try {
    const { videoUrl } = await ltx.generate({
      imageUrl: swipe.imageUrl,
      prompt: buildLtxPrompt(swipe),
      duration: swipe.durationSeconds,
      seed: options.styleSeed,
      userId: options.userId,
      projectId: options.projectId,
      sceneId: swipe.id,
    });
    swipe.videoUrl = videoUrl;
    swipe.status = 'ready';

    if (options.projectId) {
      new MoviePersistenceService()
        .updateSwipeVideo(options.projectId, swipe.order, videoUrl)
        .catch(() => undefined);
    }
  } catch (error) {
    swipe.status = 'error';
    swipe.error = error instanceof Error ? error.message : String(error);
  }
  return swipe;
}
