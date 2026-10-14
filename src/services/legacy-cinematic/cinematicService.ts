import { searchWithTavily } from '../../commonService/searchTools/tavilyService.ts';
import { braveSearchTool } from '../../commonService/searchTools/braveSearchTool.ts';
import { logger } from '../../utils/logger.ts';
import { VeoProvider } from './providers/VeoProvider.ts';
import { LTXProvider } from './providers/LTXProvider.ts';
import { WANProvider } from './providers/WANProvider.ts';
import { createStockVideoProvider } from './subservices/stockVideoProvider.ts';
import { buildCloudinaryConcatUrl, remixSceneWithCloudinary } from './subservices/cloudinaryFlow.ts';
import { generateScenesInParallel } from './core/sceneGenerationFlow.ts';
import {
  createDirectorPlan,
  enrichRelatedTopics,
  normalizeScenes,
  rewriteQueryForSearch,
  streamDraftNarrative,
  streamNarrative,
} from './core/narrativeFlow.ts';
import { NarrationService } from './audio/NarrationService.ts';

export { finalizeTemporaryScene } from './subservices/cloudinaryFlow.ts';

export type CinematicAspectRatio = '16:9' | '1:1';

export interface CinematicSource {
  title: string;
  url: string;
  snippet: string;
  image?: string;
}

export interface CinematicScene {
  id: string;
  title: string;
  narration: string;
  visualPrompt: string;
  durationSeconds?: number;
  preferredEngine?: 'STOCK' | 'LTX' | 'WAN' | 'VEO';

  sceneStage: 'draft' | 'preview' | 'final';

  provider?: 'veo' | 'pexels';
  operationName?: string;
  rawVideoUrl?: string;
  videoUrl?: string;
  narrationAudioUrl?: string;
  error?: string;

  status?: 'ready' | 'processing' | 'error';
  enhancedVideoUrl?: string;
  mixedVideoUrl?: string;
  mixStatus?: 'ready' | 'processing' | 'error';
  mixError?: string;
}

export interface CinematicRelatedTopic {
  title: string;
  imageUrl?: string;
}

export interface CinematicExperience {
  id?: string;
  title: string;
  description: string;
  narrative: string;
  rewrittenQuery: string;
  scenes: CinematicScene[];
  sources: CinematicSource[];
  relatedTopics: CinematicRelatedTopic[];
  totalDurationSeconds: number;
  fullVideoUrl?: string;
  fullVideoPath?: string;
}

export interface CinematicProgress {
  stage: 'planning' | 'research' | 'directing' | 'generating' | 'composing' | 'complete';
  message: string;
  progress: number;
  scenes?: CinematicScene[];
}

export interface GenerateCinematicOptions {
  aspectRatio?: CinematicAspectRatio;
  userId?: string;
  enableNarration?: boolean;
  enableTextOverlay?: boolean;
  onProgress?: (progress: CinematicProgress) => void;
  onNarrativeChunk?: (chunk: string, fullText: string, isComplete: boolean, phase: 'draft' | 'final') => void;
}

const DEFAULT_USER_ID = 'curios-guest';
const DEFAULT_SCENE_DURATION_SECONDS = 7;
const stockVideoProvider = createStockVideoProvider();

function generateSceneId(index: number): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `scene_${Date.now()}_${index}`;
}

async function searchSourcesWithFallback(query: string): Promise<{
  results: Array<{ title: string; url: string; content: string }>;
  images: Array<{ url: string; alt: string; source_url?: string }>;
}> {
  const tavilyData = await searchWithTavily(query);
  if (tavilyData.results?.length) {
    logger.info('[CinematicService] Search provider selected', {
      provider: 'tavily',
      query,
      resultCount: tavilyData.results.length,
      imageCount: tavilyData.images?.length || 0,
    });
    return tavilyData;
  }

  try {
    const braveData = await braveSearchTool(query);
    return {
      results: braveData.web.map((item) => ({
        title: item.title,
        url: item.url,
        content: item.content,
      })),
      images: braveData.images.map((img) => ({
        url: img.url,
        alt: img.alt || query,
        source_url: img.source_url,
      })),
    };
  } catch (error) {
    logger.warn('[CinematicService] Brave search fallback failed', {
      query,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { results: [], images: [] };
}

export async function generateCompleteCinematicVideo(
  query: string,
  options: GenerateCinematicOptions = {}
): Promise<CinematicExperience> {
  const startTime = Date.now();
  const userId = options.userId || DEFAULT_USER_ID;
  const aspectRatio = options.aspectRatio || '16:9';
  const providerAspectRatio = aspectRatio === '1:1' ? '1:1' : '16:9';

  options.onProgress?.({
    stage: 'planning',
    message: 'Planning your cinematic answer...',
    progress: 5,
  });

  void streamDraftNarrative(query, options.onNarrativeChunk).catch(() => undefined);

  const rewrittenQuery = await rewriteQueryForSearch(query);

  options.onProgress?.({
    stage: 'research',
    message: 'Collecting trusted sources...',
    progress: 15,
  });

  const sourcesResponse = await searchSourcesWithFallback(rewrittenQuery);
  const sources: CinematicSource[] = sourcesResponse.results.map((result) => ({
    title: result.title,
    url: result.url,
    snippet: result.content,
  }));

  const narrative = await streamNarrative(query, sources, options.onNarrativeChunk);

  options.onProgress?.({
    stage: 'directing',
    message: 'Planning your scenes...',
    progress: 30,
  });

  const directorPlan = await createDirectorPlan(query, sources, narrative);
  const normalizedScenes = normalizeScenes(directorPlan.scenes);

  const scenes: CinematicScene[] = normalizedScenes.map((scene, index) => ({
    id: generateSceneId(index),
    title: scene.title,
    narration: scene.narration,
    visualPrompt: scene.visualPrompt,
    durationSeconds: scene.durationSeconds || DEFAULT_SCENE_DURATION_SECONDS,
    sceneStage: 'draft',
    status: 'processing',
  }));

  options.onProgress?.({
    stage: 'generating',
    message: `Creating ${scenes.length} video scenes...`,
    progress: 40,
    scenes,
  });

  const veoProvider = new VeoProvider();
  const ltxProvider = new LTXProvider();
  const wanProvider = new WANProvider();

  const generatedScenes = await generateScenesInParallel({
    scenes,
    onProgress: options.onProgress,
    providers: {
      veo: veoProvider,
      ltx: ltxProvider,
      wan: wanProvider,
      stock: {
        generate: async ({ prompt, duration }) => {
          const result = await stockVideoProvider.generate({
            prompt,
            aspectRatio: providerAspectRatio,
          });

          return {
            videoUrl: result.videoUrl,
            duration: duration || result.duration,
            width: result.width,
            height: result.height,
            generationId: result.generationId,
          };
        },
      },
    },
  });

  const narrationService = new NarrationService();
  const narrationMap = new Map<string, string>();

  if (options.enableNarration) {
    const narrationSegments = generatedScenes.map((scene) => ({
      text: scene.narration,
      startTime: 0,
      duration: scene.durationSeconds || DEFAULT_SCENE_DURATION_SECONDS,
      sceneId: scene.id,
    }));

    const narrationResults = await narrationService.generateSegmentedNarration(narrationSegments);
    narrationResults.forEach((result, sceneId) => {
      narrationMap.set(sceneId, result.audioUrl);
    });
  }

  options.onProgress?.({
    stage: 'composing',
    message: 'Preparing scene playback...',
    progress: 75,
  });

  const mixedScenes = await Promise.all(
    generatedScenes.map(async (scene) => {
      const narrationAudioUrl = narrationMap.get(scene.id);
      const shouldMix = options.enableNarration || options.enableTextOverlay;
      const sourceUrl = scene.videoUrl || scene.rawVideoUrl;

      if (!sourceUrl || !shouldMix) {
        return {
          ...scene,
          narrationAudioUrl: narrationAudioUrl || scene.narrationAudioUrl,
          sceneStage: scene.sceneStage === 'final' ? 'final' : 'preview',
          status: scene.status || 'ready',
        } as CinematicScene;
      }

      try {
        const remix = await remixSceneWithCloudinary({
          sourceUrl,
          userId,
          targetDurationSeconds: scene.durationSeconds || DEFAULT_SCENE_DURATION_SECONDS,
          narrationAudioUrl: options.enableNarration ? narrationAudioUrl : undefined,
          narrationText: options.enableTextOverlay ? scene.narration : undefined,
        });

        return {
          ...scene,
          narrationAudioUrl: narrationAudioUrl || scene.narrationAudioUrl,
          mixedVideoUrl: remix.playbackUrl,
          videoUrl: remix.playbackUrl,
          sceneStage: scene.sceneStage === 'final' ? 'final' : 'preview',
          status: 'ready',
          mixStatus: 'ready',
        } as CinematicScene;
      } catch (error) {
        return {
          ...scene,
          narrationAudioUrl: narrationAudioUrl || scene.narrationAudioUrl,
          error: error instanceof Error ? error.message : String(error),
          status: 'ready',
          sceneStage: scene.sceneStage === 'final' ? 'final' : 'preview',
        } as CinematicScene;
      }
    })
  );

  const relatedTopics = await enrichRelatedTopics(directorPlan.relatedTopics, sourcesResponse.images);

  const fullVideoUrl = buildCloudinaryConcatUrl(
    mixedScenes
      .map((scene) => scene.videoUrl)
      .filter((videoUrl): videoUrl is string => Boolean(videoUrl))
  );

  options.onProgress?.({
    stage: 'complete',
    message: fullVideoUrl ? 'Your cinematic video is ready' : 'Your cinematic scenes are ready',
    progress: 100,
    scenes: mixedScenes,
  });

  const totalDurationSeconds = mixedScenes.reduce(
    (total, scene) => total + (scene.durationSeconds || DEFAULT_SCENE_DURATION_SECONDS),
    0
  );

  logger.info('[CinematicService] Cinematic generation finished', {
    durationMs: Date.now() - startTime,
    sceneCount: mixedScenes.length,
  });

  return {
    id: `${Date.now()}`,
    title: directorPlan.title || query,
    description: directorPlan.description || '',
    narrative,
    rewrittenQuery,
    scenes: mixedScenes,
    sources,
    relatedTopics,
    totalDurationSeconds,
    fullVideoUrl,
    fullVideoPath: undefined,
  };
}
