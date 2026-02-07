/**
 * Chapter Renderer
 * Renderiza UN chapter usando Canvas + MediaRecorder
 * Client-side rendering puro
 */

import { ChapterDescriptor, TimelineEntry, RenderProgress } from '../types';
import { logger } from '../../../utils/logger';

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
      // 1. Preparar assets (cargar imágenes)
      const loadedImages = await this.loadImages(descriptor.assets.images);
      
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
      
      // 5. Renderizar frames según timeline
      await this.renderTimeline(descriptor, loadedImages, onProgress);
      
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
   * Cargar imágenes desde URLs
   */
  private async loadImages(imageAssets: Array<{ url: string; alt?: string; position?: string }>): Promise<HTMLImageElement[]> {
    const loadPromises = imageAssets.map(asset => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Para imágenes externas
        img.onload = () => resolve(img);
        img.onerror = () => {
          logger.warn('[ChapterRenderer] Error cargando imagen', { url: asset.url });
          // Usar imagen placeholder
          const placeholder = new Image();
          placeholder.src = 'https://via.placeholder.com/720x1280/0095FF/FFFFFF?text=Image';
          placeholder.onload = () => resolve(placeholder);
        };
        img.src = asset.url;
      });
    });
    
    return Promise.all(loadPromises);
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
    onProgress?: (progress: RenderProgress) => void
  ): Promise<void> {
    const startTime = performance.now();
    const durationMs = descriptor.duration * 1000;
    const frameInterval = 1000 / this.fps;
    
    let currentFrame = 0;
    const totalFrames = Math.ceil(durationMs / frameInterval);
    
    // Estado de animación
    let currentImageIndex = 0;
    let zoomLevel = 1.0;
    let opacity = 1.0;
    
    while (performance.now() - startTime < durationMs) {
      const elapsed = performance.now() - startTime;
      const currentTime = elapsed / 1000;
      const progress = (elapsed / durationMs) * 100;
      
      // Limpiar canvas
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.width, this.height);
      
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
