/**
 * Chapter Renderer
 * Renderiza UN chapter usando Canvas + MediaRecorder
 * Client-side rendering puro
 */

import { ChapterDescriptor, TimelineEntry, RenderProgress } from '../types';
import { logger } from '../../../utils/logger';
import { assetCache } from '../cache/AssetCache';

export class ChapterRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext;
  private width: number = 720;   // Portrait HD
  private height: number = 1280;
  private fps: number = 30;
  
  constructor() {
    // Crear canvas offscreen
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('No se pudo crear contexto 2D');
    }
    this.ctx = context;
    
    this.audioContext = new AudioContext();
    
    logger.info('[ChapterRenderer] Inicializado', { 
      resolution: `${this.width}x${this.height}`,
      fps: this.fps 
    });
  }

  /**
   * Renderizar un chapter completo
   */
  async renderChapter(
    descriptor: ChapterDescriptor,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<Blob> {
    logger.info('[ChapterRenderer] Iniciando render', { 
      chapterId: descriptor.id,
      duration: descriptor.duration 
    });

    try {
      // 1. Preparar assets (cargar imágenes y video de fondo)
      const loadedImages = await this.loadImages(descriptor.assets.images);
      const backgroundVideoElement = descriptor.assets.backgroundVideo 
        ? await this.loadVideo(descriptor.assets.backgroundVideo)
        : undefined;
      
      // 2. Preparar audio
      const audioTrack = await this.prepareAudio(descriptor.assets.audio);
      
      // 3. Configurar MediaRecorder
      const stream = this.canvas.captureStream(this.fps);
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      // 4. Iniciar grabación
      recorder.start();
      
      // 5. Renderizar frames según timeline (con video de fondo)
      await this.renderTimeline(descriptor, loadedImages, backgroundVideoElement, onProgress);
      
      // 6. Detener grabación
      recorder.stop();
      
      // 7. Esperar a que termine
      await new Promise((resolve) => {
        recorder.onstop = resolve;
      });
      
      // 8. Retornar video blob
      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      
      logger.info('[ChapterRenderer] Render completo', { 
        chapterId: descriptor.id,
        size: videoBlob.size 
      });
      
      return videoBlob;
      
    } catch (error) {
      logger.error('[ChapterRenderer] Error en render', { 
        chapterId: descriptor.id, 
        error 
      });
      throw error;
    }
  }

  /**
   * Cargar imágenes desde URLs (con cache)
   */
  private async loadImages(imageAssets: Array<{ url: string; alt?: string; position?: string }>): Promise<HTMLImageElement[]> {
    const loadPromises = imageAssets.map(async (asset, index) => {
      // Si es data URI (SVG), no usar cache
      if (asset.url.startsWith('data:')) {
        return new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => {
            logger.debug('[ChapterRenderer] Imagen SVG placeholder cargada', { index });
            resolve(img);
          };
          img.onerror = () => {
            logger.error('[ChapterRenderer] Error cargando SVG placeholder', { index });
            const emptyImg = new Image();
            emptyImg.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"%3E%3Crect fill="%23333333" width="720" height="1280"/%3E%3C/svg%3E';
            emptyImg.onload = () => resolve(emptyImg);
          };
          img.src = asset.url;
        });
      }
      
      // Para URLs externas, usar cache
      try {
        const blob = await assetCache.get(asset.url, 'image');
        
        if (blob) {
          return await this.createImageFromBlob(blob);
        }
      } catch (error) {
        logger.warn('[ChapterRenderer] Error con cache, usando fallback', { error });
      }
      
      // Fallback: cargar directamente (sin cache)
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          logger.debug('[ChapterRenderer] Imagen cargada exitosamente', { url: asset.url.substring(0, 50) });
          resolve(img);
        };
        
        img.onerror = () => {
          logger.warn('[ChapterRenderer] Error CORS con imagen externa, usando placeholder', { 
            url: asset.url.substring(0, 50) 
          });
          
          // Fallback: Crear placeholder SVG directamente
          const colors = ['0095FF', '3b82f6', '60a5fa', '2563eb', '1e40af'];
          const color = colors[index % colors.length];
          const placeholder = new Image();
          placeholder.src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"%3E%3Crect fill="%23${color}" width="720" height="1280"/%3E%3Ctext x="360" y="640" font-size="48" fill="white" text-anchor="middle" font-family="Arial"%3EImage ${index + 1}%3C/text%3E%3C/svg%3E`;
          
          placeholder.onload = () => {
            logger.debug('[ChapterRenderer] Placeholder SVG cargado', { index });
            resolve(placeholder);
          };
          
          placeholder.onerror = () => {
            logger.error('[ChapterRenderer] Error cargando placeholder, usando imagen vacía', { index });
            // Último recurso: imagen sólida sin texto
            const emptyImg = new Image();
            emptyImg.src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"%3E%3Crect fill="%23${color}" width="720" height="1280"/%3E%3C/svg%3E`;
            emptyImg.onload = () => resolve(emptyImg);
          };
        };
        
        img.src = asset.url;
      });
    });
    
    return Promise.all(loadPromises);
  }

  /**
   * Crear imagen desde blob (helper para cache)
   */
  private async createImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl); // Liberar memoria
        logger.debug('[ChapterRenderer] Imagen creada desde blob cache');
        resolve(img);
      };
      
      img.onerror = (error) => {
        URL.revokeObjectURL(objectUrl);
        logger.error('[ChapterRenderer] Error creando imagen desde blob', { error });
        reject(error);
      };
      
      img.src = objectUrl;
    });
  }

  /**
   * Cargar video de fondo
   */
  private async loadVideo(videoUrl: string): Promise<HTMLVideoElement | undefined> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true; // Mute to avoid audio conflicts
      video.loop = true;
      
      video.onloadeddata = () => {
        logger.debug('[ChapterRenderer] Video de fondo cargado', { url: videoUrl.substring(0, 50) });
        video.play().catch(err => {
          logger.warn('[ChapterRenderer] No se pudo reproducir video', { err });
        });
        resolve(video);
      };
      
      video.onerror = () => {
        logger.warn('[ChapterRenderer] Error cargando video de fondo, continuando sin él', { 
          url: videoUrl.substring(0, 50) 
        });
        resolve(undefined);
      };
      
      video.src = videoUrl;
      video.load();
    });
  }

  /**
   * Preparar audio track
   */
  private async prepareAudio(audioBlob: Blob): Promise<MediaStreamTrack | null> {
    try {
      // Convertir blob a MediaStream
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const destination = this.audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.start();
      
      return destination.stream.getAudioTracks()[0];
    } catch (error) {
      logger.warn('[ChapterRenderer] No se pudo preparar audio', { error });
      return null;
    }
  }

  /**
   * Renderizar frames según timeline
   */
  private async renderTimeline(
    descriptor: ChapterDescriptor,
    images: HTMLImageElement[],
    backgroundVideo?: HTMLVideoElement,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<void> {
    const startTime = performance.now();
    const durationMs = descriptor.duration * 1000;
    const frameInterval = 1000 / this.fps;
    
    let currentFrame = 0;
    
    // Estado de animación
    let currentImageIndex = 0;
    let zoomLevel = 1.0;
    let opacity = 1.0;
    
    while (performance.now() - startTime < durationMs) {
      const elapsed = performance.now() - startTime;
      const currentTime = elapsed / 1000;
      
      // Limpiar canvas
      this.ctx.clearRect(0, 0, this.width, this.height);
      
      // 1. Dibujar video de fondo si existe
      if (backgroundVideo && backgroundVideo.readyState >= 2) {
        this.ctx.drawImage(backgroundVideo, 0, 0, this.width, this.height);
      } else {
        // Fallback: fondo de color sólido
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
      }
      
      // Ejecutar acciones del timeline
      const activeActions = this.getActiveActions(descriptor.timeline, currentTime);
      
      for (const action of activeActions) {
        switch (action.action) {
          case 'show-image':
            currentImageIndex = action.data.imageIndex;
            break;
          case 'zoom':
            zoomLevel = this.interpolate(
              action.data.from,
              action.data.to,
              (currentTime - action.timestamp) / action.data.duration
            );
            break;
          case 'fade-in':
            opacity = Math.min(1, (currentTime - action.timestamp) / action.data.duration);
            break;
          case 'fade-out':
            opacity = Math.max(0, 1 - ((currentTime - action.timestamp) / action.data.duration));
            break;
        }
      }
      
      // Dibujar imagen actual con transformaciones
      if (images[currentImageIndex]) {
        this.drawImageWithEffects(
          images[currentImageIndex],
          zoomLevel,
          opacity
        );
      }
      
      // Dibujar texto (si hay acción show-text activa)
      const textAction = activeActions.find(a => a.action === 'show-text');
      if (textAction) {
        this.drawText(textAction.data.text, textAction.data.position);
      }
      
      // Reportar progreso
      if (onProgress && currentFrame % 10 === 0) {
        const progress = (elapsed / durationMs) * 100;
        onProgress({
          chapterId: descriptor.id,
          progress,
          status: 'rendering'
        });
      }
      
      // Esperar al siguiente frame
      await this.waitForNextFrame(frameInterval);
      currentFrame++;
    }
    
    // Progreso final
    if (onProgress) {
      onProgress({
        chapterId: descriptor.id,
        progress: 100,
        status: 'complete'
      });
    }
  }

  /**
   * Obtener acciones activas en un timestamp
   */
  private getActiveActions(timeline: TimelineEntry[], currentTime: number): TimelineEntry[] {
    return timeline.filter(entry => {
      const entryEnd = entry.timestamp + (entry.duration || 0.1);
      return currentTime >= entry.timestamp && currentTime <= entryEnd;
    });
  }

  /**
   * Dibujar imagen con efectos
   */
  private drawImageWithEffects(
    img: HTMLImageElement,
    zoom: number,
    opacity: number
  ): void {
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    
    // Calcular dimensiones con zoom
    const scaledWidth = this.width * zoom;
    const scaledHeight = this.height * zoom;
    const offsetX = (this.width - scaledWidth) / 2;
    const offsetY = (this.height - scaledHeight) / 2;
    
    // Dibujar imagen escalada
    this.ctx.drawImage(
      img,
      offsetX,
      offsetY,
      scaledWidth,
      scaledHeight
    );
    
    this.ctx.restore();
  }

  /**
   * Dibujar texto con sombra
   */
  private drawText(text: string, position: 'top' | 'center' | 'bottom'): void {
    this.ctx.save();
    
    // Configurar texto
    this.ctx.font = 'bold 32px Arial';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    this.ctx.shadowBlur = 10;
    
    // Calcular posición Y
    let y: number;
    switch (position) {
      case 'top':
        y = 100;
        break;
      case 'center':
        y = this.height / 2;
        break;
      case 'bottom':
      default:
        y = this.height - 100;
        break;
    }
    
    // Dividir texto en líneas si es muy largo
    const maxWidth = this.width - 100;
    const words = text.split(' ');
    let line = '';
    let lineY = y;
    
    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line !== '') {
        this.ctx.fillText(line, this.width / 2, lineY);
        line = word + ' ';
        lineY += 40;
      } else {
        line = testLine;
      }
    }
    this.ctx.fillText(line, this.width / 2, lineY);
    
    this.ctx.restore();
  }

  /**
   * Interpolación lineal
   */
  private interpolate(start: number, end: number, progress: number): number {
    return start + (end - start) * Math.min(1, Math.max(0, progress));
  }

  /**
   * Esperar al siguiente frame
   */
  private waitForNextFrame(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpiar recursos
   */
  dispose(): void {
    this.audioContext.close();
    logger.info('[ChapterRenderer] Recursos liberados');
  }
}
