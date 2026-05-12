/**
 * VEO Async Upgrader
 * Único motor que puede hacer upgrade después de la generación inicial
 * Arquitectura v3: VEO es la ÚNICA excepción al "no replacement" rule
 */

import { VideoGenerationRequest, VideoGenerationResult } from '../types';

// Use simplified CinematicScene from service (not types.ts)
interface CinematicScene {
  id: string;
  visualPrompt: string;
  durationSeconds?: number;
}
import { CinematicConfig } from '../config/CinematicConfig';
import { promiseWithTimeout, TimeoutError } from './TimeoutHelper';
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
  generate(request: VideoGenerationRequest): Promise<GeneratedVideoClip>;
}

export class VeoAsyncUpgrader {
  constructor(
    private config: CinematicConfig,
    private veoProvider: VideoGenerator
  ) {}

  /**
   * Intenta upgrade a VEO (async)
   * Solo se ejecuta si:
   * - VEO habilitado
   * - Score > 0.85
   * - Usuario engaged (> 5s leyendo)
   *
   * @param scene - Escena a mejorar
   * @param sceneScore - Score de la escena
   * @param userEngaged - Si usuario está engaged
   * @param onUpgrade - Callback ejecutado si hay upgrade exitoso
   */
  async tryVeoUpgrade(
    scene: CinematicScene,
    sceneScore: number,
    userEngaged: boolean,
    onUpgrade: (clip: VideoGenerationResult) => void
  ): Promise<boolean> {
    // Validaciones previas
    if (!this.config.veoEnabled) {
      return false;
    }

    if (sceneScore < this.config.veoUpgradeThreshold) {
      return false;
    }

    if (!userEngaged) {
      return false;
    }

    logger.info('[VeoUpgrade] Attempting VEO upgrade', {
      sceneId: scene.id,
      sceneScore: sceneScore.toFixed(3),
    });

    const request: VideoGenerationRequest = {
      prompt: scene.visualPrompt,
      duration: scene.durationSeconds || 8,
      aspectRatio: '16:9',
    };

    try {
      // Intentar VEO con timeout configurado
      const veo = await safeGenerate(
        'VEO',
        () =>
          promiseWithTimeout(
            this.veoProvider.generate(request),
            this.config.veoTimeoutMs,
            `VEO generation timeout (${this.config.veoTimeoutMs}ms)`
          ),
        true
      );

      if (veo) {
        logger.info('[VeoUpgrade] VEO succeeded → upgrading scene', {
          sceneId: scene.id,
          videoUrl: veo.videoUrl?.slice(0, 50),
        });
        onUpgrade(veo);
        return true;
      }

      logger.warn('[VeoUpgrade] VEO returned null → keeping Pexels clip', {
        sceneId: scene.id,
      });
    } catch (error) {
      if (error instanceof TimeoutError) {
        logger.warn('[VeoUpgrade] VEO timeout → keeping Pexels clip', {
          sceneId: scene.id,
          timeout: this.config.veoTimeoutMs,
        });
      } else {
        logger.error('[VeoUpgrade] VEO error → keeping Pexels clip', {
          sceneId: scene.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return false;
  }
}
