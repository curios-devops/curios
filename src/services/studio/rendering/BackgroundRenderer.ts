/**
 * Background Renderer
 * Renderiza chapters en background mientras usuario ve el anterior
 * Killer feature del sistema
 */

import { ChapterDescriptor } from '../types';
import { ChapterRenderer } from './ChapterRenderer';
import { logger } from '../../../utils/logger';
import { supabase } from '../../../lib/supabase';

export class BackgroundRenderer {
  private renderer: ChapterRenderer;
  private renderQueue: ChapterDescriptor[];
  private isRendering: boolean;
  private renderedUrls: Map<string, string>; // chapterId -> URL

  constructor() {
    this.renderer = new ChapterRenderer();
    this.renderQueue = [];
    this.isRendering = false;
    this.renderedUrls = new Map();
  }

  /**
   * Iniciar rendering de todos los chapters
   */
  async startBackgroundRendering(
    chapters: ChapterDescriptor[],
    videoId: string,
    userId: string | null,
    onChapterComplete?: (chapterIndex: number, url: string) => void,
    onProgress?: (overall: number) => void
  ): Promise<Map<string, string>> {
    logger.info('[BackgroundRenderer] Iniciando rendering', {
      chapterCount: chapters.length,
      videoId
    });

    // Create video record in database
    await this.createVideoRecord(videoId, chapters, userId);

    this.renderQueue = [...chapters];
    this.renderedUrls.clear();

    // Renderizar primer chapter inmediatamente
    const firstChapter = this.renderQueue.shift();
    if (firstChapter) {
      const url = await this.renderAndUpload(
        firstChapter,
        videoId,
        userId,
        onProgress
      );
      this.renderedUrls.set(firstChapter.id, url);
      onChapterComplete?.(0, url);
    }

    // Continuar con el resto en background
    this.renderNextInBackground(videoId, userId, onChapterComplete, onProgress);

    return this.renderedUrls;
  }

  /**
   * Renderizar siguiente chapter en background
   */
  private async renderNextInBackground(
    videoId: string,
    userId: string | null,
    onChapterComplete?: (chapterIndex: number, url: string) => void,
    onProgress?: (overall: number) => void
  ): Promise<void> {
    if (this.renderQueue.length === 0 || this.isRendering) {
      return;
    }

    this.isRendering = true;
    const chapter = this.renderQueue.shift()!;

    try {
      const url = await this.renderAndUpload(
        chapter,
        videoId,
        userId,
        onProgress
      );

      this.renderedUrls.set(chapter.id, url);
      onChapterComplete?.(chapter.order, url);

      logger.info('[BackgroundRenderer] Chapter completado', {
        chapterId: chapter.id,
        order: chapter.order
      });
    } catch (error) {
      logger.error('[BackgroundRenderer] Error en chapter', {
        chapterId: chapter.id,
        error
      });
    }

    this.isRendering = false;

    // Continuar con el siguiente
    if (this.renderQueue.length > 0) {
      // Pequeño delay para no saturar CPU
      setTimeout(() => {
        this.renderNextInBackground(videoId, userId, onChapterComplete, onProgress);
      }, 500);
    } else {
      // All chapters rendered, update video status to ready
      await this.updateVideoStatus(videoId, 'ready');
      logger.info('[BackgroundRenderer] Todos los chapters completados', { videoId });
    }
  }

  /**
   * Renderizar y subir a Supabase
   */
  private async renderAndUpload(
    chapter: ChapterDescriptor,
    videoId: string,
    userId: string | null,
    _onProgress?: (overall: number) => void
  ): Promise<string> {
    const startTime = Date.now();

    // 1. Renderizar chapter
    const videoBlob = await this.renderer.renderChapter(chapter, (progress) => {
      // Reportar progreso individual del chapter
      logger.debug('[BackgroundRenderer] Progreso chapter', {
        chapterId: chapter.id,
        progress: progress.progress
      });
    });

    const renderTime = Date.now() - startTime;

    // 2. Subir a Supabase Storage
    // Path: {videoId}/{chapterId}.webm (bucket 'videos' already in .from())
    const fileName = `${videoId}/${chapter.id}.webm`;
    
    logger.debug('[BackgroundRenderer] Intentando upload', {
      bucket: 'videos',
      fileName,
      size: videoBlob.size,
      type: videoBlob.type
    });

    const { data, error } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBlob, {
        contentType: 'video/webm',
        upsert: true
      });

    if (error) {
      logger.error('[BackgroundRenderer] Error en upload', {
        message: error.message,
        statusCode: (error as any).statusCode,
        error: JSON.stringify(error),
        fileName,
        blobSize: videoBlob.size
      });
      throw new Error(`Error subiendo chapter: ${error.message}`);
    }

    logger.debug('[BackgroundRenderer] Upload exitoso', {
      fileName,
      data
    });

    // 3. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // 4. Guardar metadata en DB
    await this.saveChapterMetadata(
      videoId,
      chapter,
      publicUrl,
      renderTime,
      videoBlob.size,
      userId
    );

    logger.info('[BackgroundRenderer] Chapter subido', {
      chapterId: chapter.id,
      url: publicUrl,
      renderTime: `${renderTime}ms`,
      size: `${(videoBlob.size / 1024).toFixed(2)}KB`
    });

    return publicUrl;
  }

  /**
   * Guardar metadata del chapter en Supabase
   */
  private async saveChapterMetadata(
    videoId: string,
    chapter: ChapterDescriptor,
    storageUrl: string,
    renderTime: number,
    fileSize: number,
    userId: string | null
  ): Promise<void> {
    const payload = {
      video_id: videoId,
      chapter_id: chapter.id,
      order_index: chapter.order,
      duration: chapter.duration,
      storage_url: storageUrl,
      free: chapter.free,
      render_time: renderTime,
      file_size: fileSize,
      user_id: userId || null // UUID or null, no guest string
    };

    logger.debug('[BackgroundRenderer] Guardando metadata en DB', {
      table: 'chapters',
      payload
    });

    const { data, error } = await supabase
      .from('chapters')
      .upsert(payload, {
        onConflict: 'video_id,chapter_id' // Specify conflict columns for upsert
      })
      .select();

    if (error) {
      logger.error('[BackgroundRenderer] Error guardando metadata', {
        chapterId: chapter.id,
        error: error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        payload
      });
      // No lanzar error, solo loggearlo para no detener el proceso
    } else {
      logger.info('[BackgroundRenderer] Metadata guardada exitosamente', {
        chapterId: chapter.id,
        data
      });
    }
  }

  /**
   * Crear registro del video en la tabla videos
   */
  private async createVideoRecord(
    videoId: string,
    chapters: ChapterDescriptor[],
    userId: string | null
  ): Promise<void> {
    const totalDuration = chapters.reduce((sum, ch) => sum + ch.duration, 0);
    
    // Generate title from first chapter text (first 50 chars)
    const firstText = chapters[0]?.text || 'Untitled Video';
    const title = firstText.length > 50 
      ? firstText.substring(0, 50) + '...' 
      : firstText;
    
    const payload = {
      id: videoId,
      title: title,
      query: null, // Can be added later if needed
      chapter_count: chapters.length, // NOT NULL column
      total_chapters: chapters.length, // Nullable column with default
      total_duration: totalDuration,
      status: 'processing' as const,
      user_id: userId || null
    };

    logger.debug('[BackgroundRenderer] Creando video en DB', { payload });

    const { data, error } = await supabase
      .from('videos')
      .insert(payload)
      .select();

    if (error) {
      logger.error('[BackgroundRenderer] ❌ Error creando video', {
        videoId,
        error: error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload
      });
      
      // Show error in console for debugging
      console.error('❌ VIDEO INSERT ERROR:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload
      });
      
      // Throw error to stop rendering if video creation fails
      throw new Error(`Failed to create video record: ${error.message}`);
    } else {
      logger.info('[BackgroundRenderer] ✅ Video creado exitosamente', {
        videoId,
        data
      });
    }
  }

  /**
   * Actualizar estado del video
   */
  private async updateVideoStatus(
    videoId: string,
    status: 'processing' | 'ready' | 'failed'
  ): Promise<void> {
    const payload: any = { status };
    
    if (status === 'ready') {
      payload.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('videos')
      .update(payload)
      .eq('id', videoId);

    if (error) {
      logger.error('[BackgroundRenderer] Error actualizando status del video', {
        videoId,
        status,
        error
      });
    } else {
      logger.info('[BackgroundRenderer] Status del video actualizado', {
        videoId,
        status
      });
    }
  }

  /**
   * Obtener URL de un chapter ya renderizado
   */
  getChapterUrl(chapterId: string): string | undefined {
    return this.renderedUrls.get(chapterId);
  }

  /**
   * Verificar si un chapter está listo
   */
  isChapterReady(chapterId: string): boolean {
    return this.renderedUrls.has(chapterId);
  }

  /**
   * Limpiar recursos
   */
  dispose(): void {
    this.renderer.dispose();
    this.renderQueue = [];
    this.renderedUrls.clear();
    logger.info('[BackgroundRenderer] Recursos liberados');
  }
}
