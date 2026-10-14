/**
 * Video Orchestrator
 * Main orchestrator implementando arquitectura v3
 *
 * Flow:
 * 1. Preview inmediato (STOCK en paralelo)
 * 2. Generación real (SceneProcessor con decisión upfront)
 * 3. VEO async upgrades (único upgrade permitido)
 */

import { GenerationResult, VideoGenerationRequest, VideoGenerationResult } from '../types';

// Use simplified CinematicScene from service (not types.ts)
interface CinematicScene {
  id: string;
  visualPrompt: string;
  durationSeconds?: number;
  preferredEngine?: 'STOCK' | 'LTX' | 'WAN' | 'VEO';
  title?: string;
  narration?: string;
  sceneStage?: 'draft' | 'preview' | 'final';
}
import { CinematicConfig, VideoState, Engine, getVideoState } from '../config/CinematicConfig';
import { EngineSelector } from './EngineSelector';
import { SceneProcessor } from './SceneProcessor';
import { VeoAsyncUpgrader } from './VeoAsyncUpgrader';
import { ConcurrencyLimiter } from './ConcurrencyLimiter';
import { promiseWithTimeout } from './TimeoutHelper';
import { safeGenerate } from './SafeGenerationWrapper';
import { logger } from '../../../utils/logger';

interface GeneratedVideoClip {
  videoUrl: string;
  duration: number;
  width: number;
  height: number;
  generationId: string;
}

interface VideoGenerator {
  generate(request: {
    prompt?: string;
    duration?: number;
    aspectRatio?: '9:16' | '16:9' | '1:1';
  }): Promise<GeneratedVideoClip>;
}

interface Providers {
  veo: VideoGenerator;
  stock: VideoGenerator;
  ltx?: VideoGenerator;
  wan?: VideoGenerator;
}

export class VideoOrchestrator {
  private sceneProcessor: SceneProcessor;
  private veoUpgrader: VeoAsyncUpgrader;
  private engineSelector: EngineSelector;
  private ltxLimiter: ConcurrencyLimiter;
  private wanLimiter: ConcurrencyLimiter;
  private veoLimiter: ConcurrencyLimiter;
  private providers: Providers;
  private config: CinematicConfig;

  constructor(config: CinematicConfig, providers: Providers) {
    this.config = config;
    this.providers = providers;
    this.sceneProcessor = new SceneProcessor({ stock: providers.stock });
    this.veoUpgrader = new VeoAsyncUpgrader(config, providers.veo);
    this.engineSelector = new EngineSelector(config);
    this.ltxLimiter = new ConcurrencyLimiter(config.maxConcurrentLtx);
    this.wanLimiter = new ConcurrencyLimiter(config.maxConcurrentWan);
    this.veoLimiter = new ConcurrencyLimiter(config.maxConcurrentVeo);
  }

  /**
   * Genera video completo con arquitectura v3
   *
   * @param scenes - Escenas a generar
   * @param onProgress - Callback para reportar progreso
   * @returns Resultados de generación + estado del video
   */
  async generateVideo(
    scenes: CinematicScene[],
    onProgress?: (results: GenerationResult[], state: VideoState) => void
  ): Promise<{ results: GenerationResult[]; state: VideoState }> {
    logger.info('[Orchestrator] Starting video generation', {
      sceneCount: scenes.length,
    });

    logger.info('[Orchestrator] Processing all scenes in parallel');

    const results: Array<GenerationResult | undefined> = new Array(scenes.length).fill(undefined);

    const emitProgress = () => {
      if (!onProgress) return;

      const readyResults = results.filter((result): result is GenerationResult => Boolean(result));
      const currentState = getVideoState(readyResults.map((r) => r.engine));
      onProgress(results as unknown as GenerationResult[], currentState);
    };

    const safeProcess = async (scene: CinematicScene, index: number) => {
      try {
        const result = await this.sceneProcessor.processScene(scene);
        results[index] = result;
        emitProgress();

        const selectedEngine = this.selectAutoEngine(scene, result);

        if (selectedEngine === 'LTX') {
          void this.tryUpgradeEngine('LTX', scene, result, index, results, emitProgress);
          return;
        }

        if (selectedEngine === 'WAN') {
          void this.tryUpgradeEngine('WAN', scene, result, index, results, emitProgress);
          return;
        }

        if (selectedEngine === 'VEO') {
          void this.tryUpgradeVeo(scene, result, index, results, emitProgress);
          return;
        }

        if (selectedEngine === 'STOCK') {
          void this.tryUpgradeVeo(scene, result, index, results, emitProgress, true);
        }
      } catch (error) {
        logger.error('[Orchestrator] Scene processing failed but will continue', {
          sceneId: scene.id,
          error: error instanceof Error ? error.message : String(error),
        });
        results[index] = {
          clip: {
            videoUrl: '',
            duration: scene.durationSeconds || 8,
            width: 1280,
            height: 720,
            generationId: `error_${Date.now()}`,
          },
          engine: 'STOCK',
          state: 'Preview',
          score: 0,
        } as unknown as GenerationResult;
        emitProgress();
      }
    };

    await Promise.all(scenes.map((scene, index) => safeProcess(scene, index)));

    const finalResults = results.map(
      (result, index) =>
        result || {
          clip: {
            videoUrl: '',
            duration: scenes[index].durationSeconds || 8,
            width: 1280,
            height: 720,
            generationId: `pending_${index}`,
          },
          engine: 'STOCK',
          state: 'Preview',
          score: 0,
        }
    ) as GenerationResult[];

    logger.info('[Orchestrator] All scenes processed', {
      engines: finalResults.map((r) => r.engine),
      states: finalResults.map((r) => r.state),
    });

    const finalState = getVideoState(finalResults.map((r) => r.engine));
    onProgress?.(finalResults, finalState);

    return { results: finalResults, state: finalState };
  }

  /**
   * Get current video state based on engines
   */
  getVideoState(engines: Engine[]): VideoState {
    return getVideoState(engines);
  }

  private selectAutoEngine(scene: CinematicScene, result: GenerationResult): Engine {
    if (scene.preferredEngine) {
      return scene.preferredEngine;
    }

    return this.engineSelector.selectBaseEngine(result.stockScore ?? 0, result.score ?? 0);
  }

  private async tryUpgradeEngine(
    engine: 'LTX' | 'WAN',
    scene: CinematicScene,
    baseResult: GenerationResult,
    index: number,
    results: Array<GenerationResult | undefined>,
    emitProgress: () => void
  ): Promise<void> {
    const provider = engine === 'LTX' ? this.providers.ltx : this.providers.wan;
    const limiter = engine === 'LTX' ? this.ltxLimiter : this.wanLimiter;
    const timeoutMs = engine === 'LTX' ? this.config.ltxTimeoutMs : this.config.wanTimeoutMs;
    const enabled = engine === 'LTX' ? this.config.ltxEnabled : this.config.wanEnabled;

    if (!provider) {
      logger.info('[Orchestrator] Engine provider missing, keeping stock preview', {
        engine,
        sceneId: scene.id,
      });
      return;
    }

    const request: VideoGenerationRequest = {
      prompt: scene.visualPrompt,
      duration: scene.durationSeconds || 8,
      aspectRatio: '16:9',
    };

    const upgraded = await limiter.run(() =>
      safeGenerate<VideoGenerationResult>(
        engine,
        () => promiseWithTimeout(provider.generate(request), timeoutMs, `${engine} generation timeout`),
        enabled
      )
    );

    if (!upgraded) {
      logger.info('[Orchestrator] Engine upgrade skipped or failed, keeping stock preview', {
        engine,
        sceneId: scene.id,
      });
      return;
    }

    results[index] = {
      ...baseResult,
      clip: upgraded,
      engine,
      state: engine === 'WAN' ? 'Enhanced' : 'Draft',
    };

    logger.info('[Orchestrator] Engine upgraded scene', {
      engine,
      sceneIndex: index,
      sceneId: scene.id,
    });

    emitProgress();
  }

  private async tryUpgradeVeo(
    scene: CinematicScene,
    baseResult: GenerationResult,
    index: number,
    results: Array<GenerationResult | undefined>,
    emitProgress: () => void,
    requireEligibility = false
  ): Promise<void> {
    if (requireEligibility && !this.engineSelector.shouldAttemptVeoUpgrade(baseResult.score || 0, true)) {
      results[index] = {
        ...baseResult,
        state: 'Quality',
      };
      emitProgress();
      return;
    }

    await this.veoLimiter.run(async () => {
      try {
        const upgraded = await this.veoUpgrader.tryVeoUpgrade(
          scene,
          baseResult.score || 0,
          true,
          (newClip) => {
            results[index] = {
              ...baseResult,
              clip: newClip,
              engine: 'VEO',
              state: 'Quality',
            };

            logger.info('[Orchestrator] VEO upgraded scene', {
              sceneIndex: index,
              sceneId: scene.id,
            });

            emitProgress();
          }
        );

        if (!upgraded) {
          results[index] = {
            ...baseResult,
            state: 'Quality',
          };
          emitProgress();
        }
      } catch (error) {
        logger.error('[Orchestrator] VEO upgrade promise failed', {
          sceneIndex: index,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
}
