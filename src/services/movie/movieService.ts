// Movie Mode orchestrator (swipe-based).
// Pipeline: enhance → research → narrative → swipe set → then, all at once: every frame
// (Nano Banana 2 Lite, core first, paced), the Continue-exploring images and the viral
// packaging; the CORE video (LTX) chains only on the core frame → persist.
//
// Speed rule: only chain a step on what it actually needs; everything else runs in
// parallel and reaches the page as soon as it's ready (onSwipeReady / onPartial). Secondary swipes stay as image previews and lazy-generate their video
// on demand via renderSwipeVideo(). Premium "Enhance" (gpt-image-2 + Omni) is a separate
// server-owned background job — see the enhance-swipe edge function + enhancedVideosService.
// No final stitch — each swipe is a standalone shareable unit.
//
// Reuses cinematic infrastructure: search tools, streamNarrative, NarrationService.

import { supabase } from '../../lib/supabase.ts';
import { executeWebSearch } from '../search/providers/webSearchProvider.ts';
import { streamNarrative } from './core/narrativeFlow.ts';
import { NarrationService } from './audio/NarrationService.ts';
import { logger } from '../../utils/logger.ts';

import { enhanceQuestion } from './agents/QuestionEnhancementAgent.ts';
import { MOVIE_MODES, DEFAULT_MOVIE_MODE, normalizeMovieMode } from './config/movieModes.ts';
import { warmMovieGpu } from './warmupService.ts';
import { buildSwipeSet } from './agents/StoryboardAgent.ts';
import { packageForVirality } from './agents/ViralDirectorAgent.ts';
import { NanoBananaProvider } from './providers/NanoBananaProvider.ts';
import { RunPodLTXProvider } from './providers/RunPodLTXProvider.ts';
import { MoviePersistenceService } from './video/MoviePersistenceService.ts';
import type {
  GenerateMovieOptions,
  MovieExperience,
  MovieMode,
  MovieRelatedTopic,
  MovieSwipe,
  MovieSource,
  RenderSwipeVideoOptions,
} from './types.ts';

const DEFAULT_USER_ID = 'curios-guest';

// Spacing between image requests. Vertex serves Gemini from a dynamic shared quota (no fixed
// per-project RPM; a 429 means momentary contention, and gemini-image retries it with backoff
// and reports `throttled`). 2026-07-10: 250ms tripped 429s on the 4th/5th frame (before the
// retries existed). 2026-10-21: 9 frames at 1s spacing → 0 throttled, ~15s each.
const FRAME_STAGGER_MS = 1000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// LTX-2 can synthesize a spoken voiceover when the prompt asks for it. We fold the
// swipe's narration script into the motion prompt so the generated audio speaks it —
// giving narration without a separate TTS (ElevenLabs) call. (Experimental: phrasing
// may need tuning depending on how LTX interprets the voiceover directive.)
//
// Two behaviours are steered here: (1) the animation must be alive — real in-frame
// subject motion, not a slow zoom/pan; for REAL (realismScore > 80) that motion may
// only be what physically exists in the frame; (2) the narrator is energetic and
// passionate, in the voice chosen for this set.
function buildLtxPrompt(swipe: MovieSwipe, realismScore?: number, mode?: MovieMode): string {
  const motion = swipe.videoPrompt?.trim() || '';
  const modeSpec = mode ? MOVIE_MODES[mode] : undefined;
  // Stylized modes get their own motion character; the strict "real footage" rule only
  // applies when the movie IS photojournalistic (real mode / high realism, no mode set).
  const isReal = modeSpec ? modeSpec.id === 'real' : (realismScore ?? 0) > 80;
  const animationRule = isReal && (realismScore ?? 100) > 80
    ? 'Animate only what genuinely exists in the frame with physically-plausible motion — no new objects, characters, faces or lip-sync. Bring the real subject to life (ignite engines, exhaust, smoke, sparks, moving crowds/water/flame). Do not settle for a slow zoom or static pan.'
    : `Bring the whole scene dramatically to life with vivid in-frame motion — the subject itself moves. Do not settle for a slow zoom or static pan.${modeSpec && modeSpec.id !== 'real' ? ` Keep the established visual style: ${modeSpec.motionStyle}` : ''}`;

  const script = swipe.narration?.trim();
  if (!script) return `${motion}\n\n${animationRule}`;

  const voice = swipe.narratorGender === 'male' ? 'male' : 'female';
  return `${motion}\n\n${animationRule}\n\nVoiceover: a single ${voice} narrator speaks these exact words aloud with high energy, genuine excitement and passionate cadence (never flat or robotic), with no on-screen text or captions: "${script}"`;
}

async function researchSources(query: string): Promise<MovieSource[]> {
  // Same Exa → Tavily → Brave chain as Search (paced per engine).
  const results = await executeWebSearch(query).catch(() => []);
  return results.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet }));
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

  // Visual mode: explicit user choice (mode dropdown) wins; otherwise the agent's proposal.
  const mode = normalizeMovieMode(options.mode) ||
    enhanced.proposedMode ||
    ((enhanced.realismScore ?? 0) >= 50 ? 'real' : DEFAULT_MOVIE_MODE);
  const modeSpec = MOVIE_MODES[mode];

  // Pipeline A "REAL" (docs/Movie/enhaced_refactor.md), cheap default variant: for
  // photojournalistic topics (realismScore ≥ 50) find ONE real reference photo and ground
  // ALL swipe frames on it. Runs concurrently with research/narrative/storyboard — zero
  // added latency; any failure just means the frames stay prompt-only.
  // Free-grounding modes (meme) never fetch it — the style, not the photo, leads.
  const referenceImagePromise: Promise<string | undefined> =
    (enhanced.realismScore ?? 0) >= 50 && modeSpec.grounding !== 'free'
      ? supabase.functions
          .invoke('movie-reference-image', { body: { query: enhanced.researchQuestion } })
          .then(({ data }) => (data as { imageUrl?: string | null })?.imageUrl || undefined)
          .catch(() => undefined)
      : Promise.resolve(undefined);

  // Step 2 — research / grounding
  emit?.({ stage: 'research', message: 'Collecting trusted sources...', progress: 16 });
  const sources = await researchSources(enhanced.researchQuestion);

  // Step 3 — narrative (reuse cinematic narrator)
  emit?.({ stage: 'directing', message: 'Writing the swipe script...', progress: 30 });
  // Streams straight into the page's Overview while it's written.
  const narrative = await streamNarrative(question, sources, (_chunk, full) => options.onPartial?.({ narrative: full }));

  // Cheap/fast default image model (Nano Banana 2 Lite). gpt-image-2 is reserved for the
  // premium Enhance job (enhance-swipe edge function), not the default generation.
  const imageProvider = new NanoBananaProvider();
  // Image requests leave FRAME_STAGGER_MS apart (see the constant for the measurements).
  // One shared timetable: each request takes the next free slot, counted from now or from the
  // previous slot — never stacking delays on top of time already spent waiting.
  let nextFree = 0;
  const nextSlot = () => {
    const now = Date.now();
    const at = Math.max(now, nextFree);
    nextFree = at + FRAME_STAGGER_MS;
    return delay(at - now);
  };
  const generateFrame = async (prompt: string, wait: Promise<unknown>) => {
    await wait;
    const referenceImageUrl = await referenceImagePromise;
    return imageProvider.generate(prompt, {
      userId,
      referenceImageUrl,
      realismScore: enhanced.realismScore,
      grounding: modeSpec.grounding,
    });
  };
  // Frames started while the storyboard is still being written, by their exact prompt.
  const earlyFrames = new Map<string, Promise<string>>();

  // Step 4 — swipe set (1 core + 4 secondary). It streams: each swipe's frame starts
  // painting as soon as that swipe is written, not when the whole storyboard is done.
  emit?.({ stage: 'storyboard', message: 'Designing your swipes...', progress: 42 });
  const { title, description, narratorGender, swipes, relatedTopics: relatedTopicTitles } = await buildSwipeSet({
    question,
    visualStoryQuestion: enhanced.visualStoryQuestion,
    narrative,
    sources,
    realismScore: enhanced.realismScore,
    mode: modeSpec,
    onSwipeWritten: ({ imagePrompt, isCore }) => {
      if (isCore && options.coreFrameUrl) return; // the opening frame was already painted
      if (earlyFrames.has(imagePrompt)) return;
      const frame = generateFrame(imagePrompt, nextSlot());
      frame.catch(() => undefined); // awaited (and its error handled) by paintFrame
      earlyFrames.set(imagePrompt, frame);
    },
  });

  const styleSeed = Math.floor(Math.random() * 1_000_000); // shared seed → style consistency

  const coreSwipe = swipes.find((s) => s.isCore) || swipes[0];
  const secondarySwipes = swipes.filter((s) => s.id !== coreSwipe?.id);

  // From here everything that doesn't need something else runs at once, and each piece
  // shows up on the page as soon as it's ready. Only true dependencies are chained:
  // core video ← core frame. Viral packaging only needs the swipe titles, so it starts now.
  emit?.({ stage: 'images', message: 'Creating your frames...', progress: 50, swipes });
  options.onPartial?.({ title, description, narrative, relatedTopics: options.relatedTopics ?? relatedTopicTitles.map((t) => ({ title: t })) });
  const viralPromise = packageForVirality({ question, narrative, swipes });
  void referenceImagePromise.then((url) => { if (url) logger.info('[MovieService] Grounding frames on real photo', { referenceImageUrl: url }); });

  // A frame already painting from the streamed storyboard is reused; otherwise paint it now.
  const paintFrame = async (swipe: MovieSwipe) => {
    try {
      swipe.imageUrl = await (earlyFrames.get(swipe.imagePrompt) ?? generateFrame(swipe.imagePrompt, nextSlot()));
      swipe.status = 'image_ready';
    } catch (error) {
      swipe.status = 'error';
      swipe.error = error instanceof Error ? error.message : String(error);
    }
  };

  // Core frame → (only then) core video.
  const ltx = new RunPodLTXProvider();
  const corePromise: Promise<void> = (async () => {
    if (!coreSwipe) return;
    if (options.coreFrameUrl) {
      // Explore further (Search) already painted the opening frame the user tapped.
      coreSwipe.imageUrl = options.coreFrameUrl;
      coreSwipe.status = 'image_ready';
    } else if (options.isEnhanceRequested?.(coreSwipe)) {
      // User already queued the premium Enhance for this swipe — don't spend the default render.
      logger.info('[MovieService] Core frame skipped: Enhance queued', { swipeId: coreSwipe.id });
    } else {
      await paintFrame(coreSwipe);
    }
    options.onSwipeReady?.(coreSwipe);
    if (!renderCoreVideo || !coreSwipe.imageUrl || coreSwipe.status === 'error' || options.isEnhanceRequested?.(coreSwipe)) return;
    emit?.({ stage: 'rendering', message: 'Rendering your core swipe...', progress: 64, swipes });
    coreSwipe.status = 'rendering';
    options.onSwipeReady?.(coreSwipe);
    try {
      const { videoUrl } = await ltx.generate({
        imageUrl: coreSwipe.imageUrl,
        prompt: buildLtxPrompt(coreSwipe, enhanced.realismScore, mode),
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
  })();

  // Secondary frames, alongside the core one, each surfacing as soon as it's ready. Their
  // video stays lazy/on-demand (renderSwipeVideo).
  const secondaryImagesPromise = Promise.all(
    secondarySwipes.map(async (swipe) => {
      if (options.isEnhanceRequested?.(swipe)) {
        options.onSwipeReady?.(swipe);
        return;
      }
      await paintFrame(swipe);
      options.onSwipeReady?.(swipe);
    }),
  );

  // "Continue Exploring": 4 related themes, each with a small generated image (same
  // NanoBanana logic as the swipe frames — no reference grounding, style-neutral teaser).
  // Each one shows up on the page as soon as its image is ready.
  // On a mode regeneration the caller passes the existing topics through untouched.
  const relatedTopicsPromise: Promise<MovieRelatedTopic[]> = options.relatedTopics?.length
    ? Promise.resolve(options.relatedTopics)
    : (() => {
        const topics: MovieRelatedTopic[] = relatedTopicTitles.map((t) => ({ title: t }));
        return Promise.all(
          relatedTopicTitles.map(async (topic, index): Promise<void> => {
            await nextSlot();
            try {
              const imageUrl = await imageProvider.generate(
                `A striking, curiosity-sparking 16:9 teaser image for the topic: ${topic}. One clear subject, bold composition, no text.`,
                { userId },
              );
              topics[index] = { title: topic, imageUrl };
              options.onPartial?.({ relatedTopics: [...topics] });
            } catch (error) {
              logger.warn('[MovieService] Related topic image failed (non-fatal)', {
                topic,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }),
        ).then(() => topics);
      })();

  const [, , relatedTopics, viral] = await Promise.all([corePromise, secondaryImagesPromise, relatedTopicsPromise, viralPromise]);

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
      const results = await narrationService.generateSegmentedNarration(segments, { gender: narratorGender });
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
    mode,
    swipes,
    sources,
    relatedTopics,
    totalDurationSeconds,
    styleSeed,
    narratorGender,
    coreVideoUrl: coreSwipe?.videoUrl,
    fullVideoUrl: coreSwipe?.videoUrl,
  };

  // Viral packaging ran alongside the frames.
  experience.viral = viral;

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
      prompt: buildLtxPrompt(swipe, undefined, options.mode),
      duration: swipe.durationSeconds,
      seed: options.styleSeed,
      userId: options.userId,
      projectId: options.projectId,
      sceneId: swipe.id,
    });
    swipe.videoUrl = videoUrl;
    swipe.status = 'ready';

    if (options.projectId) {
      // The core video is lazy now (renders on the user's Play), so its URL must also
      // become the project's primary video (share page / Discover feed).
      new MoviePersistenceService()
        .updateSwipeVideo(options.projectId, swipe.order, videoUrl, { isCore: swipe.isCore })
        .catch(() => undefined);
    }
  } catch (error) {
    swipe.status = 'error';
    swipe.error = error instanceof Error ? error.message : String(error);
  }
  return swipe;
}
