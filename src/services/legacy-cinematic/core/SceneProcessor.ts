/**
 * Scene Processor
 * Core pipeline por escena: stock first, score, return draft preview
 */

import { GenerationResult, VideoGenerationRequest, SceneScore } from '../types';

// Use simplified CinematicScene from service (not types.ts)
interface CinematicScene {
  id: string;
  title?: string;
  narration?: string;
  visualPrompt: string;
  durationSeconds?: number;
  sceneStage?: 'draft' | 'preview' | 'final';
  provider?: 'veo' | 'pexels';
  operationName?: string;
  rawVideoUrl?: string;
  videoUrl?: string;
  narrationAudioUrl?: string;
  error?: string;
}
import { CriticAgent } from '../agents/CriticAgent';
import { logger } from '../../../utils/logger';

interface GeneratedVideoClip {
  videoUrl: string;
  duration: number;
  width: number;
  height: number;
  generationId: string;
}

interface Providers {
  stock: {
    generate(request: VideoGenerationRequest): Promise<GeneratedVideoClip>;
  };
}

export class SceneProcessor {
  private critic: CriticAgent;

  constructor(private providers: Providers) {
    this.critic = new CriticAgent();
  }

  /**
   * Procesa una escena completa:
   * 1. Fetch STOCK (siempre primero)
   * 2. Evaluar calidad del stock
   * 3. Retornar preview inmediato
   */
  async processScene(scene: CinematicScene): Promise<GenerationResult> {
    // 1. Fetch STOCK primero (base obligatoria)
    const stockRequest: VideoGenerationRequest = {
      prompt: scene.visualPrompt,
      duration: scene.durationSeconds || 8,
      aspectRatio: '16:9',
    };

    // Fetch STOCK first; the provider already handles Pexels → Pixabay.
    let stockClip: GeneratedVideoClip;
    try {
      stockClip = await this.providers.stock.generate(stockRequest);
    } catch (stockErr) {
      logger.warn('[SceneProcessor] Stock provider failed', {
        sceneId: scene.id,
        error: stockErr instanceof Error ? stockErr.message : String(stockErr),
      });

      // Keep the batch moving with a minimal placeholder clip.
      return {
        clip: { videoUrl: '', duration: stockRequest.duration, width: 1280, height: 720, generationId: `error_${Date.now()}` },
        engine: 'STOCK',
        state: 'Preview',
        score: 0,
      } as any;
    }

    const stockScore = this.critic.evaluateStock(
      {
        url: stockClip.videoUrl || '',
        tags: [], // TODO: extraer de metadata del provider
        duration: stockClip.duration || 8,
        width: stockClip.width,
        height: stockClip.height,
      },
      scene.visualPrompt
    );

    const sceneScoreComponents: SceneScore = {
      relevance: stockScore,
      specificity: this.critic.calculateSpecificity(scene.visualPrompt),
      visualComplexity: this.critic.calculateVisualComplexity(scene.visualPrompt),
      narrativeWeight: 0.5,
    };

    const sceneScore = this.critic.computeSceneScore(sceneScoreComponents);

    return {
      clip: stockClip,
      engine: 'STOCK',
      state: 'Preview',
      score: sceneScore,
      stockScore,
    } as GenerationResult;
  }
}
