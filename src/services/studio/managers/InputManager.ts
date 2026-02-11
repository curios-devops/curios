/**
 * Input Manager
 * Prepara chapters con assets (videos Pexels, imágenes Brave, audio, timeline)
 */

import { ChapterPlan, ChapterInfo, ChapterDescriptor, TimelineEntry } from '../types';
import { BraveImageService } from '../assets/braveImageService';
import { GoogleImageService } from '../assets/googleImageService';
import { PexelsService } from '../assets/pexelsService';
import { ElevenLabsService } from '../assets/elevenLabsService';
import { logger } from '../../../utils/logger';

export class InputManager {
  private imageService: BraveImageService;
  private googleImageService: GoogleImageService;
  private videoService: PexelsService;
  private ttsService: ElevenLabsService;
  
  constructor() {
    this.imageService = new BraveImageService();
    this.googleImageService = new GoogleImageService();
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
    
    // 2. Buscar imágenes de overlay - MIX de Brave (específicas) + Pexels (stock profesional)
    const images = await this.searchMixedImages(info.keywords);
    
    // 3. Generar audio TTS
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
        backgroundVideo // Video de fondo de Pexels
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
   * Buscar MIX de imágenes: Brave (específicas) + Pexels (stock profesional)
   * Estrategia: 60% Brave + 40% Pexels para balance entre relevancia y calidad
   */
  private async searchMixedImages(keywords: string[]): Promise<string[]> {
    const searchQuery = keywords.slice(0, 3).join(' ');
    const mixedImages: string[] = [];
    
    logger.info('[InputManager] 🎬 Buscando MIX de imágenes (Brave + Pexels)', { 
      query: searchQuery,
      target: '~2 Brave + ~1 Pexels' 
    });
    
    try {
      // PASO 1: Buscar con Brave (imágenes específicas al tema)
      logger.info('[InputManager] 📸 Paso 1: Brave (imágenes específicas)');
      const braveResults = await this.imageService.searchForScene(
        searchQuery,
        'neutral',
        { count: 4 } // Buscamos 4, esperamos ~2 válidas
      );
      
      if (braveResults.length > 0) {
        const braveUrls = braveResults.map(img => img.url);
        const validatedBrave = await this.validateAndSanitizeImages(braveUrls);
        
        logger.info('[InputManager] Brave resultado', { 
          found: braveUrls.length,
          valid: validatedBrave.length 
        });
        
        // Agregar hasta 2 imágenes de Brave
        mixedImages.push(...validatedBrave.slice(0, 2));
      }
      
      // PASO 2: Buscar con Pexels (stock profesional, siempre CORS-safe)
      logger.info('[InputManager] 🎨 Paso 2: Pexels (stock profesional)');
      const pexelsUrls = await this.getPexelsPhotos(searchQuery, 2);
      
      if (pexelsUrls.length > 0) {
        logger.info('[InputManager] Pexels resultado', { 
          found: pexelsUrls.length 
        });
        
        // Agregar hasta 1 imagen de Pexels
        mixedImages.push(...pexelsUrls.slice(0, 1));
      }
      
      // PASO 3: Verificar si tenemos suficientes imágenes (mínimo 3)
      if (mixedImages.length >= 3) {
        logger.info('[InputManager] ✅ Mix exitoso', { 
          total: mixedImages.length,
          sources: 'Brave + Pexels' 
        });
        return mixedImages.slice(0, 3);
      }
      
      // PASO 4: Si no tenemos suficientes, completar con Google Images
      logger.warn('[InputManager] ⚠️ Mix insuficiente, completando con Google', { 
        current: mixedImages.length,
        needed: 3 
      });
      
      const googleUrls = await this.getGoogleImages(searchQuery);
      mixedImages.push(...googleUrls);
      
      if (mixedImages.length >= 3) {
        logger.info('[InputManager] ✅ Mix completado con Google', { 
          total: mixedImages.length 
        });
        return mixedImages.slice(0, 3);
      }
      
      // PASO 5: Último recurso - placeholders
      logger.warn('[InputManager] ⚠️ Todas las fuentes insuficientes, usando placeholders');
      const placeholders = this.getPlaceholderImages();
      mixedImages.push(...placeholders);
      
      return mixedImages.slice(0, 3);
      
    } catch (error) {
      logger.error('[InputManager] Error crítico en búsqueda mixta', { error });
      return this.getPlaceholderImages();
    }
  }

  /**
   * Buscar imágenes usando Brave Image Service con fallback inteligente
   * @deprecated - Usar searchMixedImages en su lugar
   */
  // @ts-expect-error - Deprecated method kept for reference
  private async searchImages(keywords: string[]): Promise<string[]> {
    // En producción: buscar imágenes reales con Brave API
    // Si falla la búsqueda, usa Google Images y luego Pexels como fallback
    const USE_PLACEHOLDERS = false; // true = testing con placeholders, false = producción con imágenes reales
    
    if (USE_PLACEHOLDERS) {
      logger.info('[InputManager] Usando placeholders (modo testing)', { keywords });
      return this.getPlaceholderImages();
    }
    
    const searchQuery = keywords.slice(0, 3).join(' ');
    
    try {
      // Paso 1: Intentar con Brave (primario)
      // Brave ahora excluye automáticamente sitios problemáticos (Freepik, iStock, etc.)
      logger.info('[InputManager] 🔍 Paso 1: Buscando con Brave (CORS-safe sources)...', { query: searchQuery });
      const braveResults = await this.imageService.searchForScene(
        searchQuery,
        'neutral',
        { count: 6 } // Reducimos a 6 ya que ahora filtramos en origen
      );
      
      if (braveResults.length > 0) {
        const urls = braveResults.map(img => img.url);
        logger.info('[InputManager] Imágenes Brave encontradas, validando...', { count: urls.length });
        
        // Validar y sanitizar imágenes (esto descarta las que causan CORS)
        const validatedUrls = await this.validateAndSanitizeImages(urls);
        const failureRate = urls.length > 0 
          ? ((urls.length - validatedUrls.length) / urls.length) * 100 
          : 0;
        
        logger.info('[InputManager] Resultado validación Brave', { 
          original: urls.length,
          valid: validatedUrls.length,
          failed: urls.length - validatedUrls.length,
          failureRate: `${failureRate.toFixed(1)}%`
        });
        
        // Con sitios problemáticos excluidos, deberíamos tener mejor tasa de éxito
        // Umbral más relajado: 40% (antes era 60%)
        if (validatedUrls.length >= 3 && failureRate < 40) {
          logger.info('[InputManager] ✅ Brave exitoso (baja tasa de fallo)', { 
            count: validatedUrls.length,
            failureRate: `${failureRate.toFixed(1)}%`
          });
          return validatedUrls.slice(0, 3);
        }
        
        // Si tasa moderada de fallo (40-70%), advertir pero continuar si tenemos suficientes
        if (validatedUrls.length >= 3 && failureRate < 70) {
          logger.warn('[InputManager] ⚠️ Tasa moderada de fallo CORS', { 
            failureRate: `${failureRate.toFixed(1)}%`,
            valid: validatedUrls.length,
            action: 'Usando imágenes válidas de Brave'
          });
          return validatedUrls.slice(0, 3);
        }
        
        // Si alta tasa de fallo (>70%), ir directo a Google
        if (failureRate >= 70) {
          logger.warn('[InputManager] ⚠️ Alta tasa de fallo CORS en Brave', { 
            failureRate: `${failureRate.toFixed(1)}%`,
            action: 'Saltando a Google Images'
          });
        } else {
          logger.warn('[InputManager] ⚠️ Pocas imágenes Brave válidas', { 
            valid: validatedUrls.length,
            needed: 3
          });
        }
      } else {
        logger.debug('[InputManager] Brave no retornó imágenes, usando fallback');
      }
      
      // Paso 2: Fallback a Google Images (SERPAPI)
      logger.debug('[InputManager] Intentando Google Images...', { query: searchQuery });
      const googleImages = await this.getGoogleImages(searchQuery);
      
      if (googleImages.length >= 3) {
        return googleImages.slice(0, 3);
      }
      
      // Paso 3: Fallback final a Pexels (stock photos, siempre tienen CORS)
      logger.debug('[InputManager] Intentando Pexels...', { query: searchQuery });
      const pexelsImages = await this.getPexelsPhotos(searchQuery, 3);
      
      if (pexelsImages.length >= 3) {
        return pexelsImages.slice(0, 3);
      }
      
      // Si llegamos aquí, retornar lo que tengamos (aunque sean menos de 3)
      if (pexelsImages.length === 0) {
        logger.warn('[InputManager] ⚠️ No se encontraron imágenes en ninguna fuente', { query: searchQuery });
      }
      return pexelsImages.length > 0 ? pexelsImages : this.getPlaceholderImages();
      
    } catch (error) {
      logger.error('[InputManager] Error crítico buscando imágenes', { keywords, error });
      
      // Último recurso: Pexels directo
      try {
        logger.info('[InputManager] 🆘 Último recurso: Pexels directo');
        return await this.getPexelsPhotos(searchQuery, 3);
      } catch (pexelsError) {
        logger.error('[InputManager] Pexels también falló', { error: pexelsError });
        return this.getPlaceholderImages(); // Placeholders como última opción
      }
    }
  }

  /**
   * Validar y sanitizar imágenes para evitar problemas de CORS/tainted canvas
   * Convierte imágenes válidas a Data URIs
   */
  private async validateAndSanitizeImages(urls: string[]): Promise<string[]> {
    const validatedUrls: string[] = [];
    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    
    if (!testCtx) {
      logger.error('[InputManager] No se pudo crear contexto de canvas para validación');
      return [];
    }

    testCanvas.width = 720;
    testCanvas.height = 1280;

    logger.debug('[InputManager] Validando imágenes', { total: urls.length });

    for (const url of urls) {
      try {
        // Intentar cargar imagen
        const img = await this.loadImage(url);
        
        // Validar dimensiones mínimas
        if (img.width < 400 || img.height < 400) {
          // Silencioso: imagen muy pequeña
          continue;
        }

        // Intentar dibujar en canvas para detectar taint
        testCtx.clearRect(0, 0, testCanvas.width, testCanvas.height);
        testCtx.drawImage(img, 0, 0, testCanvas.width, testCanvas.height);
        
        // Intentar leer datos - si falla, el canvas está tainted (CORS issue)
        try {
          const dataUrl = testCanvas.toDataURL('image/jpeg', 0.85);
          
          // Validar que el dataURL no esté vacío
          if (dataUrl && dataUrl.length > 1000) {
            validatedUrls.push(dataUrl);
          }
        } catch (securityError) {
          // Silencioso: CORS issue común, no es error crítico
        }
        
      } catch (loadError) {
        // Silencioso: error de carga común
      }
    }

    const successRate = urls.length > 0 ? (validatedUrls.length / urls.length * 100).toFixed(0) : 0;
    
    // Solo mostrar warning si la tasa de éxito es muy baja
    if (validatedUrls.length < urls.length * 0.3) {
      logger.warn('[InputManager] ⚠️ Muchas imágenes descartadas por CORS', { 
        original: urls.length,
        validated: validatedUrls.length,
        successRate: `${successRate}%`
      });
    } else {
      logger.debug('[InputManager] Validación completa', { 
        validated: validatedUrls.length,
        successRate: `${successRate}%`
      });
    }

    return validatedUrls;
  }

  /**
   * Cargar imagen como promesa
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Intentar CORS
      
      img.onload = () => resolve(img);
      img.onerror = (error) => reject(error);
      
      // Timeout de 10 segundos
      setTimeout(() => {
        if (!img.complete) {
          reject(new Error('Image load timeout'));
        }
      }, 10000);
      
      img.src = url;
    });
  }

  /**
   * Obtener imágenes de Google Images como fallback (usando SERPAPI)
   */
  private async getGoogleImages(query: string): Promise<string[]> {
    try {
      logger.info('[InputManager] Buscando imágenes en Google Images (SERPAPI)', { query });
      
      // Verificar si Google Images está habilitado
      if (!this.googleImageService.isEnabled()) {
        logger.warn('[InputManager] Google Images no configurado, usando Pexels');
        return this.getPexelsPhotos(query, 3);
      }
      
      // Buscar hasta 6 imágenes (intentamos más porque algunas pueden fallar validación)
      const results = await this.googleImageService.searchForScene(
        query,
        'neutral',
        { count: 6, hl: 'en', gl: 'us' }
      );
      
      if (results.length > 0) {
        const urls = results.map(img => img.url);
        logger.info('[InputManager] Imágenes Google encontradas, validando...', { count: urls.length });
        
        // Validar y sanitizar imágenes (esto descarta las que causan CORS)
        const validatedUrls = await this.validateAndSanitizeImages(urls);
        
        if (validatedUrls.length >= 3) {
          logger.info('[InputManager] ✅ Imágenes Google validadas exitosamente', { count: validatedUrls.length });
          return validatedUrls.slice(0, 3);
        }
        
        logger.warn('[InputManager] Pocas imágenes Google válidas', { 
          original: urls.length,
          valid: validatedUrls.length 
        });
      }
      
      // Si Google también falla, usar Pexels
      logger.warn('[InputManager] Google Images insuficientes, usando Pexels fallback');
      return this.getPexelsPhotos(query, 3);
      
    } catch (error) {
      logger.error('[InputManager] Error obteniendo imágenes Google', { error });
      return this.getPexelsPhotos(query, 3);
    }
  }

  /**
   * Obtener imágenes de Pexels como último fallback (siempre tienen CORS habilitado)
   * Usa fotos de stock profesionales, genéricas pero hermosas
   */
  /**
   * Obtener fotos de Pexels (stock profesional con CORS habilitado)
   */
  private async getPexelsPhotos(query: string, count: number = 3): Promise<string[]> {
    try {
      logger.info('[InputManager] Buscando en Pexels Stock Photos', { query, count });
      
      // Verificar si Pexels está habilitado
      const pexelsEnabled = !!import.meta.env.VITE_PEXELS_API_KEY;
      if (!pexelsEnabled) {
        logger.warn('[InputManager] Pexels no configurado');
        return [];
      }
      
      // Buscar fotos verticales (portrait) para shorts/reels
      const results = await this.videoService.searchPhotos(query, {
        perPage: count + 2, // Pedir más por si alguna falla validación
        orientation: 'portrait'
      });
      
      if (results.photos && results.photos.length > 0) {
        // Usar URLs large (alta calidad) que tienen CORS habilitado
        const urls = results.photos.map(photo => photo.src.large);
        
        logger.info('[InputManager] Fotos Pexels encontradas, validando...', { count: urls.length });
        
        // Pexels SIEMPRE tiene CORS, pero validamos por consistencia
        const validatedUrls = await this.validateAndSanitizeImages(urls);
        
        if (validatedUrls.length >= 3) {
          logger.info('[InputManager] ✅ Pexels Stock exitoso', { 
            count: validatedUrls.length,
            type: 'professional stock photos'
          });
          return validatedUrls.slice(0, 3);
        }
        
        // Si no tenemos suficientes, usar placeholders para completar
        logger.warn('[InputManager] Pocas fotos Pexels, completando con placeholders');
        const placeholders = this.getPlaceholderImages();
        return [...validatedUrls, ...placeholders].slice(0, 3);
      }
      
      logger.warn('[InputManager] Pexels no retornó fotos, usando placeholders');
      return this.getPlaceholderImages();
      
    } catch (error) {
      logger.error('[InputManager] Error obteniendo fotos Pexels', { error });
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
   * Generar audio TTS con OpenAI (primario) y ElevenLabs (fallback)
   * OpenAI es primario porque ElevenLabs free tier fue deshabilitado por actividad inusual
   */
  private async generateTTS(text: string): Promise<Blob> {
    logger.info('[InputManager] Generando TTS', { 
      textLength: text.length,
      words: text.split(' ').length 
    });
    
    // 1. Intentar con OpenAI TTS (primario - más confiable y sin límites free tier)
    try {
      logger.debug('[InputManager] Usando OpenAI TTS (primario)');
      const audioBlob = await this.generateOpenAITTS(text);
      if (audioBlob) {
        logger.info('[InputManager] OpenAI TTS exitoso');
        return audioBlob;
      }
    } catch (error) {
      logger.warn('[InputManager] OpenAI TTS falló, intentando fallback', { error });
    }
    
    // 2. Fallback: ElevenLabs TTS (requiere paid plan)
    if (this.ttsService.isConfigured()) {
      logger.debug('[InputManager] Intentando ElevenLabs TTS fallback');
      const audioBlob = await this.ttsService.generateTTS(text);
      
      if (audioBlob) {
        logger.info('[InputManager] ElevenLabs TTS fallback exitoso');
        return audioBlob;
      } else {
        logger.warn('[InputManager] ElevenLabs TTS fallback falló');
      }
    }
    
    // 3. Último recurso: Audio silencioso
    logger.warn('[InputManager] Usando audio silencioso como último recurso');
    return this.generateSilentAudio(text);
  }

  /**
   * OpenAI TTS fallback (via existing fetch-openai Supabase Edge Function)
   */
  private async generateOpenAITTS(text: string): Promise<Blob | null> {
    try {
      logger.debug('[InputManager] Calling OpenAI TTS via fetch-openai', { 
        textLength: text.length 
      });

      const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseEdgeUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      // Use fetch-openai edge function with TTS-specific payload
      const payload = {
        prompt: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'alloy',
          response_format: 'mp3'
        }),
        tts: true // Flag to indicate this is a TTS request
      };

      const response = await fetch(supabaseEdgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[InputManager] OpenAI TTS error response', { 
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Supabase function error: ${response.status} - ${errorText}`);
      }

      // Response is audio blob directly
      const audioBlob = await response.blob();
      
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('No audio data received from OpenAI');
      }

      logger.info('[InputManager] OpenAI TTS exitoso', { size: audioBlob.size });

      return audioBlob;
    } catch (error) {
      logger.error('[InputManager] OpenAI TTS error', { error });
      return null;
    }
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
