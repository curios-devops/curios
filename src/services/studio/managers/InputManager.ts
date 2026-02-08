/**
 * Input Manager
 * Prepara chapters con assets (videos Pexels, imágenes Brave, audio, timeline)
 */

import { ChapterPlan, ChapterInfo, ChapterDescriptor, TimelineEntry } from '../types';
import { BraveImageService } from '../assets/braveImageService';
import { PexelsService } from '../assets/pexelsService';
import { ElevenLabsService } from '../assets/elevenLabsService';
import { logger } from '../../../utils/logger';

export class InputManager {
  private imageService: BraveImageService;
  private videoService: PexelsService;
  private ttsService: ElevenLabsService;
  
  constructor() {
    this.imageService = new BraveImageService();
    this.videoService = new PexelsService();
    this.ttsService = new ElevenLabsService();
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
    // 1. Buscar video de fondo (Pexels)
    const backgroundVideo = await this.searchBackgroundVideo(info.keywords, info.narration);
    
    // 2. Buscar imágenes de overlay (Brave)
    const images = await this.searchImages(info.keywords, info.narration);
    
    // 3. Generar audio TTS (por ahora mock, implementar después)
    const audioBlob = await this.generateTTS(info.narration);
    
    // 4. Calcular timeline
    const timeline = this.calculateTimeline(info, images.length, backgroundVideo);
    
    // 5. Retornar descriptor completo
    return {
      id: info.id,
      order: info.order || 0,
      duration: info.duration,
      assets: {
        images: images.map((url, index) => ({
          url,
          alt: (info.visualCues && info.visualCues[index]) || '',
          position: this.getImagePosition(index, images.length)
        })),
        audio: audioBlob,
        music: undefined, // Por ahora sin música
        backgroundVideo // NUEVO: video de fondo de Pexels
      },
      timeline,
      text: info.narration,
      free: true
    };
  }

  /**
   * Buscar video de fondo usando Pexels
   */
  private async searchBackgroundVideo(keywords: string[], narration: string): Promise<string | undefined> {
    // Verificar si Pexels está habilitado
    const pexelsEnabled = !!import.meta.env.VITE_PEXELS_API_KEY;
    
    if (!pexelsEnabled) {
      logger.info('[InputManager] Pexels API no configurada, sin video de fondo');
      return undefined;
    }
    
    try {
      // Buscar video vertical (portrait) para shorts/reels
      const searchQuery = keywords.slice(0, 2).join(' ');
      const videoUrl = await this.videoService.searchForScene(searchQuery, 'vertical');
      
      if (videoUrl) {
        logger.info('[InputManager] Video de fondo encontrado', { 
          keywords: searchQuery,
          url: videoUrl.substring(0, 50) 
        });
        return videoUrl;
      }
      
      // Fallback: buscar con narración
      const fallbackUrl = await this.videoService.searchForScene(narration.slice(0, 30), 'vertical');
      
      if (fallbackUrl) {
        logger.info('[InputManager] Video de fondo encontrado (fallback)', { 
          url: fallbackUrl.substring(0, 50) 
        });
        return fallbackUrl;
      }
      
      logger.warn('[InputManager] No se encontró video de fondo', { keywords });
      return undefined;
      
    } catch (error) {
      logger.warn('[InputManager] Error buscando video de fondo', { keywords, error });
      return undefined;
    }
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
   * Generar audio TTS con ElevenLabs (primario) y OpenAI (fallback)
   */
  private async generateTTS(text: string): Promise<Blob> {
    logger.info('[InputManager] Generando TTS', { 
      textLength: text.length,
      words: text.split(' ').length 
    });
    
    // 1. Intentar con ElevenLabs (primario)
    if (this.ttsService.isConfigured()) {
      logger.debug('[InputManager] Usando ElevenLabs TTS');
      const audioBlob = await this.ttsService.generateTTS(text);
      
      if (audioBlob) {
        logger.info('[InputManager] ElevenLabs TTS exitoso');
        return audioBlob;
      } else {
        logger.warn('[InputManager] ElevenLabs TTS falló, intentando fallback');
      }
    } else {
      logger.debug('[InputManager] ElevenLabs no configurado, usando fallback');
    }
    
    // 2. Fallback: OpenAI TTS
    try {
      logger.debug('[InputManager] Intentando OpenAI TTS fallback');
      const audioBlob = await this.generateOpenAITTS(text);
      if (audioBlob) {
        logger.info('[InputManager] OpenAI TTS fallback exitoso');
        return audioBlob;
      }
    } catch (error) {
      logger.warn('[InputManager] OpenAI TTS fallback falló', { error });
    }
    
    // 3. Último recurso: Audio silencioso
    logger.warn('[InputManager] Usando audio silencioso como último recurso');
    return this.generateSilentAudio(text);
  }

  /**
   * OpenAI TTS fallback (via Netlify Function)
   */
  private async generateOpenAITTS(text: string): Promise<Blob | null> {
    try {
      logger.debug('[InputManager] Calling OpenAI TTS via Netlify Function', { 
        textLength: text.length 
      });

      const response = await fetch('/.netlify/functions/openai-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          voice: 'alloy'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Netlify function error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      if (!data.audio) {
        throw new Error('No audio data received from Netlify function');
      }

      // Convertir base64 a Blob
      const audioBlob = this.base64ToBlob(data.audio, 'audio/mpeg');
      
      logger.info('[InputManager] OpenAI TTS generated via Netlify', {
        size: audioBlob.size,
        sizeKB: (audioBlob.size / 1024).toFixed(2)
      });

      return audioBlob;
    } catch (error) {
      logger.error('[InputManager] OpenAI TTS error', { error });
      return null;
    }
  }

  /**
   * Convertir base64 a Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Generar audio silencioso (último recurso)
   */
  private generateSilentAudio(text: string): Blob {
    const audioContext = new AudioContext();
    const duration = Math.max(3, text.split(' ').length * 0.3); // ~0.3s por palabra
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
    
    // Crear blob silencioso
    return new Blob([buffer.getChannelData(0)], { type: 'audio/wav' });
  }

  /**
   * Calcular timeline de animaciones
   */
  private calculateTimeline(
    info: ChapterInfo, 
    imageCount: number, 
    backgroundVideo?: string
  ): TimelineEntry[] {
    const timeline: TimelineEntry[] = [];
    const duration = info.duration;
    
    // Si hay video de fondo, agregarlo al timeline
    if (backgroundVideo) {
      timeline.push({
        timestamp: 0,
        action: 'show-video',
        data: { url: backgroundVideo, loop: true },
        duration
      });
    }
    
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
