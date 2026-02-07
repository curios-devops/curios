/**
 * Video Renderer Agent
 * Coordinates chapter rendering client-side
 * NEW: Client-side chapter-based rendering
 */

import { ChapterPlan } from '../types';
import { BackgroundRenderer } from '../rendering/BackgroundRenderer';
import { InputManager } from '../managers/InputManager';
import { logger } from '../../../utils/logger';

export class VideoRendererAgent {
  private inputManager: InputManager;
  private backgroundRenderer: BackgroundRenderer;

  constructor() {
    this.inputManager = new InputManager();
    this.backgroundRenderer = new BackgroundRenderer();
  }

  /**
   * Renderizar video (por chapters)
   */
  async renderVideo(
    chapterPlan: ChapterPlan,
    videoId: string,
    userId: string | null,
    onChapterComplete?: (chapterIndex: number, url: string) => void,
    onProgress?: (progress: number) => void
  ): Promise<Map<string, string>> {
    logger.info('[VideoRenderer] Iniciando rendering de video', {
      videoId,
      chapterCount: chapterPlan.chapters.length
    });

    try {
      // 1. Preparar chapters con Input Manager
      const descriptors = await this.inputManager.prepareChapters(chapterPlan);

      logger.info('[VideoRenderer] Chapters preparados', {
        count: descriptors.length
      });

      // 2. Iniciar background rendering
      const chapterUrls = await this.backgroundRenderer.startBackgroundRendering(
        descriptors,
        videoId,
        userId,
        onChapterComplete,
        onProgress
      );

      logger.info('[VideoRenderer] Rendering iniciado', {
        firstChapterUrl: chapterUrls.get(descriptors[0].id)
      });

      return chapterUrls;

    } catch (error) {
      logger.error('[VideoRenderer] Error en rendering', { error });
      throw error;
    }
  }

  /**
   * Verificar si un chapter está listo
   */
  isChapterReady(chapterId: string): boolean {
    return this.backgroundRenderer.isChapterReady(chapterId);
  }

  /**
   * Obtener URL de un chapter
   */
  getChapterUrl(chapterId: string): string | undefined {
    return this.backgroundRenderer.getChapterUrl(chapterId);
  }

  /**
   * Limpiar recursos
   */
  dispose(): void {
    this.backgroundRenderer.dispose();
  }
}
