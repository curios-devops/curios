import { logger } from '../../../utils/logger.ts';
import { DEFAULT_CONFIG } from '../config/CinematicConfig';
import { VideoOrchestrator } from './VideoOrchestrator';

interface CinematicSceneLike {
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

interface SceneGenerationResult {
  clip: {
    videoUrl?: string;
    generationId?: string;
  };
  engine: 'STOCK' | 'LTX' | 'WAN' | 'VEO';
  state: 'Preview' | 'Draft' | 'Enhanced' | 'Quality';
  score?: number;
}

interface SceneGenerationProvider {
  veo: {
    generate(request: {
      prompt?: string;
      duration?: number;
      aspectRatio?: '9:16' | '16:9' | '1:1';
    }): Promise<{ videoUrl: string; duration: number; width: number; height: number; generationId: string }>;
  };
  ltx?: {
    generate(request: {
      prompt?: string;
      duration?: number;
      aspectRatio?: '9:16' | '16:9' | '1:1';
    }): Promise<{ videoUrl: string; duration: number; width: number; height: number; generationId: string }>;
  };
  wan?: {
    generate(request: {
      prompt?: string;
      duration?: number;
      aspectRatio?: '9:16' | '16:9' | '1:1';
    }): Promise<{ videoUrl: string; duration: number; width: number; height: number; generationId: string }>;
  };
  stock: {
    generate(request: {
      prompt?: string;
      duration?: number;
      aspectRatio?: '9:16' | '16:9' | '1:1';
    }): Promise<{ videoUrl: string; duration: number; width: number; height: number; generationId: string }>;
  };
}

export async function generateScenesInParallel(params: {
  scenes: CinematicSceneLike[];
  onProgress?: (progress: {
    stage: 'planning' | 'research' | 'directing' | 'generating' | 'composing' | 'complete';
    message: string;
    progress: number;
    scenes?: CinematicSceneLike[];
  }) => void;
  providers: SceneGenerationProvider;
}): Promise<CinematicSceneLike[]> {
  const { scenes, onProgress, providers } = params;

  logger.info('[CinematicService] Starting video generation with Director v3', {
    sceneCount: scenes.length,
  });

  const orchestrator = new VideoOrchestrator(DEFAULT_CONFIG, {
    veo: providers.veo,
    stock: providers.stock,
    ltx: providers.ltx,
    wan: providers.wan,
  });

  const handleProgress = (
    results: SceneGenerationResult[],
    state: 'Preview' | 'Draft' | 'Enhanced' | 'Quality'
  ) => {
    const completedCount = results.filter((result) => result?.clip?.videoUrl).length;
    const progress = 35 + (completedCount / scenes.length) * 60;

    logger.info('[CinematicService] Generation progress update', {
      completedCount,
      totalScenes: scenes.length,
      state,
      engines: results.map((result) => result?.engine),
    });

    onProgress?.({
      stage: 'generating',
      message: `Generated ${completedCount}/${scenes.length} scenes (${state})`,
      progress,
      scenes: scenes.map((scene, index) => {
        const result = results[index];

        if (!result) {
          return {
            ...scene,
            sceneStage: 'draft',
            status: 'processing' as const,
          };
        }

        return {
          ...scene,
          rawVideoUrl: result.clip?.videoUrl,
          videoUrl: result.clip?.videoUrl,
          sceneStage: result.state === 'Preview' ? 'draft' : 'final',
          provider: result.engine === 'VEO' ? 'veo' : 'pexels',
          operationName: result.clip?.generationId,
          status: 'ready' as const,
        };
      }),
    });
  };

  const { results } = await orchestrator.generateVideo(scenes, handleProgress);

  return results.map((result, index) => ({
    ...scenes[index],
    rawVideoUrl: result.clip.videoUrl,
    videoUrl: result.clip.videoUrl,
    sceneStage: result.state === 'Preview' ? 'draft' : 'final',
    provider: result.engine === 'VEO' ? 'veo' : 'pexels',
    operationName: result.clip.generationId,
    status: 'ready' as const,
  }));
}
