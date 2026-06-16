// Movie Mode orchestrator (swipe-based).
// Pipeline: enhance → research → narrative → swipe set → gpt-image-2 images (all swipes)
// → narration (all swipes) → LTX video for the CORE swipe only → viral → persist.
//
// Secondary swipes stay as image previews and lazy-generate their video on demand via
// renderSwipeVideo(). No final stitch — each swipe is a standalone shareable unit.
//
// Reuses cinematic infrastructure: search tools, streamNarrative, NarrationService.

import { searchWithTavily } from '../../commonService/searchTools/tavilyService.ts';
import { braveSearchTool } from '../../commonService/searchTools/braveSearchTool.ts';
import { streamNarrative } from '../cinematic/core/narrativeFlow.ts';
import { NarrationService } from '../cinematic/audio/NarrationService.ts';
import { logger } from '../../utils/logger.ts';

import { enhanceQuestion } from './agents/QuestionEnhancementAgent.ts';
import { buildSwipeSet } from './agents/StoryboardAgent.ts';
import { packageForVirality } from './agents/ViralDirectorAgent.ts';
import { GptImageProvider } from './providers/GptImageProvider.ts';
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

  // Step 5 — images for ALL swipes (cheap previews), each appears as soon as ready
  emit?.({ stage: 'images', message: `Creating ${swipes.length} swipe frames...`, progress: 52, swipes });
  const imageProvider = new GptImageProvider();
  await Promise.all(
    swipes.map(async (swipe) => {
      try {
        swipe.imageUrl = await imageProvider.generate(swipe.imagePrompt, { userId });
        swipe.status = 'image_ready';
      } catch (error) {
        swipe.status = 'error';
        swipe.error = error instanceof Error ? error.message : String(error);
      }
      options.onSwipeReady?.(swipe);
      emit?.({ stage: 'images', message: 'Generating swipe frames...', progress: 58, swipes });
    }),
  );

  // Step 6 — narration for all swipes (cheap; lets every swipe read aloud over its frame)
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

  // Step 7 — video for the CORE swipe ONLY. Secondary swipes render lazily on demand.
  const coreSwipe = swipes.find((s) => s.isCore) || swipes[0];
  if (renderCoreVideo && coreSwipe?.imageUrl && coreSwipe.status !== 'error') {
    emit?.({ stage: 'rendering', message: 'Rendering your core swipe...', progress: 70, swipes });
    const ltx = new RunPodLTXProvider();
    coreSwipe.status = 'rendering';
    options.onSwipeReady?.(coreSwipe);
    try {
      const { videoUrl } = await ltx.generate({
        imageUrl: coreSwipe.imageUrl,
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
    }
    options.onSwipeReady?.(coreSwipe);
    emit?.({ stage: 'rendering', message: 'Core swipe ready', progress: 84, swipes });
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
  if (!swipe.imageUrl) {
    swipe.status = 'error';
    swipe.error = 'No image to animate';
    return swipe;
  }
  if (swipe.videoUrl) return swipe; // already cached

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
