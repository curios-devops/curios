/**
 * Input Manager
 * Prepara chapters con assets (imágenes, audio, timeline)
 */

import { ChapterPlan, ChapterInfo, ChapterDescriptor, TimelineEntry } from '../types';
import { BraveImageService } from '../assets/braveImageService';
import { logger } from '../../../utils/logger';

export class InputManager {
  private imageService: BraveImageService;
  
  constructor() {
    this.imageService = new BraveImageService();
  }

  /**
   * Preparar todos los chapters del plan
   */
  async prepareChapters(plan: ChapterPlan): Promise<ChapterDescriptor[]> {
    logger.info('[InputManager] Preparando chapters', { 
      count: plan.chapters.length,
      videoId: plan.videoId 
    });

    const descriptors: ChapterDescriptor[] = [];

    for (const chapterInfo of plan.chapters) {
      try {
        const descriptor = await this.prepareChapter(chapterInfo);
        descriptors.push(descriptor);
        
        logger.info('[InputManager] Chapter preparado', { 
          id: descriptor.id, 
          order: descriptor.order 
        });
      } catch (error) {
        logger.error('[InputManager] Error preparando chapter', { 
          chapterId: chapterInfo.id, 
          error 
        });
        throw error;
      }
    }

    return descriptors;
  }

  /**
   * Preparar un chapter individual
   */
  private async prepareChapter(info: ChapterInfo): Promise<ChapterDescriptor> {
    // 1. Buscar imágenes
    const images = await this.searchImages(info.keywords, info.narration);
    
    // 2. Generar audio TTS (por ahora mock, implementar después)
    const audioBlob = await this.generateTTS(info.narration);
    
    // 3. Calcular timeline
    const timeline = this.calculateTimeline(info, images.length);
    
    // 4. Retornar descriptor completo
    return {
      id: info.id,
      order: info.order,
      duration: info.duration,
      assets: {
        images: images.map((url, index) => ({
          url,
          alt: info.visualCues[index] || '',
          position: this.getImagePosition(index, images.length)
        })),
        audio: audioBlob,
        music: undefined // Por ahora sin música
      },
      timeline,
      text: info.narration,
      free: true // Todo gratis por ahora
    };
  }

  /**
   * Buscar imágenes usando Brave Image Service
   */
  private async searchImages(keywords: string[], narration: string): Promise<string[]> {
    // En producción: buscar imágenes reales con Brave API
    // Si falla la búsqueda, usa placeholders como fallback
    const USE_PLACEHOLDERS = false; // true = testing con placeholders, false = producción con imágenes reales
    
    if (USE_PLACEHOLDERS) {
      logger.info('[InputManager] Usando placeholders (modo testing)', { keywords });
      return this.getPlaceholderImages();
    }
    
    try {
      // Buscar hasta 3 imágenes usando Brave
      const searchQuery = keywords.slice(0, 3).join(' ');
      const results = await this.imageService.searchForScene(
        searchQuery,
        'neutral',
        { count: 3 }
      );
      
      if (results.length > 0) {
        return results.map(img => img.url);
      }
      
      // Fallback: intentar con narración
      const fallbackResults = await this.imageService.searchForScene(
        narration.slice(0, 50),
        'neutral',
        { count: 3 }
      );
      
      if (fallbackResults.length > 0) {
        return fallbackResults.map(img => img.url);
      }
      
      // Si no hay resultados, usar placeholders
      logger.warn('[InputManager] No se encontraron imágenes, usando placeholders', { keywords });
      return this.getPlaceholderImages();
      
    } catch (error) {
      logger.warn('[InputManager] Error buscando imágenes', { keywords, error });
      return this.getPlaceholderImages();
    }
  }

  /**
   * Obtener imágenes placeholder
   */
  private getPlaceholderImages(): string[] {
    // Usar data URIs en vez de URLs externas para evitar CORS
    return [
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"%3E%3Crect fill="%230095FF" width="720" height="1280"/%3E%3Ctext x="360" y="640" font-size="48" fill="white" text-anchor="middle" font-family="Arial"%3EChapter Image 1%3C/text%3E%3C/svg%3E',
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"%3E%3Crect fill="%233b82f6" width="720" height="1280"/%3E%3Ctext x="360" y="640" font-size="48" fill="white" text-anchor="middle" font-family="Arial"%3EChapter Image 2%3C/text%3E%3C/svg%3E',
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"%3E%3Crect fill="%2360a5fa" width="720" height="1280"/%3E%3Ctext x="360" y="640" font-size="48" fill="white" text-anchor="middle" font-family="Arial"%3EChapter Image 3%3C/text%3E%3C/svg%3E'
    ];
  }

  /**
   * Generar audio TTS (mock por ahora)
   */
  private async generateTTS(text: string): Promise<Blob> {
    // TODO: Implementar con OpenAI TTS o Web Speech API
    // Por ahora retornamos un blob vacío
    logger.info('[InputManager] Generando TTS (mock)', { textLength: text.length });
    
    // Crear audio context silencioso de la duración correcta
    const audioContext = new AudioContext();
    const duration = Math.max(3, text.split(' ').length * 0.3); // ~0.3s por palabra
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
    
    // TODO: Aquí iría la llamada real a TTS
    // const response = await openai.audio.speech.create({ ... });
    
    return new Blob([buffer.getChannelData(0)], { type: 'audio/wav' });
  }

  /**
   * Calcular timeline de animaciones
   */
  private calculateTimeline(info: ChapterInfo, imageCount: number): TimelineEntry[] {
    const timeline: TimelineEntry[] = [];
    const duration = info.duration;
    
    // Dividir duración entre imágenes
    const timePerImage = duration / Math.max(imageCount, 1);
    
    for (let i = 0; i < imageCount; i++) {
      const startTime = i * timePerImage;
      
      // Fade in al inicio
      if (i === 0) {
        timeline.push({
          timestamp: 0,
          action: 'fade-in',
          data: { duration: 0.5 },
          duration: 0.5
        });
      }
      
      // Mostrar imagen
      timeline.push({
        timestamp: startTime,
        action: 'show-image',
        data: { 
          imageIndex: i,
          position: this.getImagePosition(i, imageCount)
        },
        duration: timePerImage
      });
      
      // Zoom suave durante la imagen
      timeline.push({
        timestamp: startTime + 0.5,
        action: 'zoom',
        data: { 
          from: 1.0, 
          to: 1.1, 
          duration: timePerImage - 0.5 
        }
      });
      
      // Fade out al final
      if (i === imageCount - 1) {
        timeline.push({
          timestamp: duration - 0.5,
          action: 'fade-out',
          data: { duration: 0.5 },
          duration: 0.5
        });
      }
    }
    
    // Texto (mostrar durante todo el chapter)
    timeline.push({
      timestamp: 1,
      action: 'show-text',
      data: { 
        text: info.narration,
        position: 'bottom'
      },
      duration: duration - 2
    });
    
    return timeline;
  }

  /**
   * Determinar posición de imagen según índice
   */
  private getImagePosition(index: number, _total: number): 'full' | 'top' | 'center' | 'bottom' {
    // Primera imagen siempre full screen
    if (index === 0) return 'full';
    
    // Alternar posiciones para variedad
    const positions: Array<'top' | 'center' | 'bottom'> = ['center', 'top', 'bottom'];
    return positions[index % positions.length];
  }
}
