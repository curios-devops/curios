# 🚀 Implementación Client-side Chapter Rendering

**Fecha:** Febrero 7, 2026  
**Estado:** 🔥 ALL NIGHTER MODE - ¡Vamos con todo!  
**Arquitectura:** Cliente-side Rendering por Chapters

---

## 🎯 Overview Rápido

Vamos a implementar 5 módulos nuevos en este orden:

1. **Types & Interfaces** → Base del sistema
2. **InputManager** → Prepara chapters con assets
3. **ChapterRenderer** → Renderiza UN chapter (Canvas + MediaRecorder)
4. **BackgroundRenderer** → Renderiza chapters en background
5. **ChapterPlayer** → Reproduce chapters secuencialmente

---

## 📦 Fase 1: Types & Interfaces (15 min)

### Archivo: `src/services/studio/types.ts`

Agregar estos tipos al archivo existente:

```typescript
// ============================================
// CLIENT-SIDE RENDERING TYPES
// ============================================

/**
 * Chapter Plan - Output del LLM
 */
export interface ChapterPlan {
  chapters: ChapterInfo[];
  totalDuration: number;
  title: string;
  description: string;
  videoId?: string;
}

export interface ChapterInfo {
  id: string;              // "chapter_001"
  order: number;           // 1, 2, 3...
  duration: number;        // 5-10 segundos
  narration: string;       // Texto para TTS
  visualCues: string[];    // Qué mostrar visualmente
  keywords: string[];      // Para búsqueda de imágenes
}

/**
 * Chapter Descriptor - Listo para renderizar
 */
export interface ChapterDescriptor {
  id: string;
  order: number;
  duration: number;
  assets: ChapterAssets;
  timeline: TimelineEntry[];
  text: string;
  free: boolean;           // true por ahora (monetización futura)
}

export interface ChapterAssets {
  images: ImageAsset[];
  audio: Blob;             // Audio TTS
  music?: Blob;            // Música de fondo (opcional)
}

export interface ImageAsset {
  url: string;
  alt?: string;
  position?: 'full' | 'top' | 'center' | 'bottom';
}

/**
 * Timeline - Define qué mostrar y cuándo
 */
export interface TimelineEntry {
  timestamp: number;       // Segundos desde inicio del chapter
  action: TimelineAction;
  data: any;              // Depende del action
  duration?: number;      // Duración de la acción (opcional)
}

export type TimelineAction = 
  | 'show-image' 
  | 'show-text' 
  | 'fade-in' 
  | 'fade-out'
  | 'pan'
  | 'zoom';

/**
 * Rendering Progress
 */
export interface RenderProgress {
  chapterId: string;
  progress: number;        // 0-100
  status: 'pending' | 'rendering' | 'complete' | 'error';
  error?: string;
}

/**
 * Chapter Metadata (para Supabase)
 */
export interface ChapterMetadata {
  id: string;
  videoId: string;
  chapterId: string;
  order: number;
  duration: number;
  storageUrl: string;
  free: boolean;
  renderTime?: number;     // ms
  fileSize?: number;       // bytes
  userId?: string;         // null = 'curios' guest user
  createdAt: Date;
}
```

**Acción:**
```bash
# Abrir archivo y agregar estos tipos al final
code src/services/studio/types.ts
```

---

## 📦 Fase 2: InputManager (30 min)

### Archivo: `src/services/studio/managers/InputManager.ts` (NUEVO)

```typescript
/**
 * Input Manager
 * Prepara chapters con assets (imágenes, audio, timeline)
 */

import { ChapterPlan, ChapterInfo, ChapterDescriptor, TimelineEntry } from '../types';
import { ImageAssetAgent } from '../assets/imageAssetAgent';
import { logger } from '../../../utils/logger';

export class InputManager {
  private imageAgent: ImageAssetAgent;
  
  constructor() {
    this.imageAgent = new ImageAssetAgent();
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
    const images = await this.searchImages(info.keywords);
    
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
   * Buscar imágenes usando ImageAssetAgent
   */
  private async searchImages(keywords: string[]): Promise<string[]> {
    try {
      // Buscar hasta 3 imágenes
      const searchQuery = keywords.slice(0, 3).join(' ');
      const results = await this.imageAgent.searchImages(searchQuery, 3);
      
      return results.map(img => img.url);
    } catch (error) {
      logger.warn('[InputManager] Error buscando imágenes', { keywords, error });
      // Fallback: imágenes por defecto
      return [
        'https://via.placeholder.com/720x1280/0095FF/FFFFFF?text=Chapter',
        'https://via.placeholder.com/720x1280/3b82f6/FFFFFF?text=Image',
        'https://via.placeholder.com/720x1280/60a5fa/FFFFFF?text=Content'
      ];
    }
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
    
    return new Blob([buffer], { type: 'audio/wav' });
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
  private getImagePosition(index: number, total: number): 'full' | 'top' | 'center' | 'bottom' {
    // Primera imagen siempre full screen
    if (index === 0) return 'full';
    
    // Alternar posiciones para variedad
    const positions: Array<'top' | 'center' | 'bottom'> = ['center', 'top', 'bottom'];
    return positions[index % positions.length];
  }
}
```

**Acción:**
```bash
# Crear carpeta managers si no existe
mkdir -p src/services/studio/managers

# Crear archivo
touch src/services/studio/managers/InputManager.ts
```

---

## 📦 Fase 3: ChapterRenderer (45 min) - EL CORAZÓN

### Archivo: `src/services/studio/rendering/ChapterRenderer.ts` (NUEVO)

```typescript
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
  private async loadImages(imageAssets: any[]): Promise<HTMLImageElement[]> {
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
```

**Acción:**
```bash
# El archivo rendering/ ya existe, solo crear el nuevo
touch src/services/studio/rendering/ChapterRenderer.ts
```

---

## 📦 Fase 4: BackgroundRenderer (30 min)

### Archivo: `src/services/studio/rendering/BackgroundRenderer.ts` (NUEVO)

```typescript
/**
 * Background Renderer
 * Renderiza chapters en background mientras usuario ve el anterior
 * Killer feature del sistema
 */

import { ChapterDescriptor, RenderProgress } from '../types';
import { ChapterRenderer } from './ChapterRenderer';
import { logger } from '../../../utils/logger';
import { supabase } from '../../../lib/supabase-client';

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
    }
  }

  /**
   * Renderizar y subir a Supabase
   */
  private async renderAndUpload(
    chapter: ChapterDescriptor,
    videoId: string,
    userId: string | null,
    onProgress?: (overall: number) => void
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
    const fileName = `videos/${videoId}/${chapter.id}.webm`;
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBlob, {
        contentType: 'video/webm',
        upsert: true
      });

    if (error) {
      throw new Error(`Error subiendo chapter: ${error.message}`);
    }

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
    const { error } = await supabase
      .from('chapters')
      .upsert({
        video_id: videoId,
        chapter_id: chapter.id,
        order_index: chapter.order,
        duration: chapter.duration,
        storage_url: storageUrl,
        free: chapter.free,
        render_time: renderTime,
        file_size: fileSize,
        user_id: userId || 'curios', // Usuario guest
        created_at: new Date().toISOString()
      });

    if (error) {
      logger.error('[BackgroundRenderer] Error guardando metadata', {
        chapterId: chapter.id,
        error
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
```

---

## 📦 Fase 5: ChapterPlayer Component (30 min)

### Archivo: `src/services/studio/components/ChapterPlayer.tsx` (NUEVO)

```typescript
/**
 * Chapter Player
 * Reproduce chapters secuencialmente como un solo video
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChapterDescriptor } from '../types';
import { logger } from '../../../utils/logger';

interface ChapterPlayerProps {
  chapters: ChapterDescriptor[];
  chapterUrls: Map<string, string>;
  videoId: string;
  onComplete?: () => void;
}

export const ChapterPlayer: React.FC<ChapterPlayerProps> = ({
  chapters,
  chapterUrls,
  videoId,
  onComplete
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentChapter = chapters[currentChapterIndex];
  const currentUrl = chapterUrls.get(currentChapter?.id);

  // Calcular duración total y progreso
  const totalDuration = chapters.reduce((sum, ch) => sum + ch.duration, 0);
  const elapsedTime = chapters
    .slice(0, currentChapterIndex)
    .reduce((sum, ch) => sum + ch.duration, 0);

  useEffect(() => {
    const progress = (elapsedTime / totalDuration) * 100;
    setGlobalProgress(progress);
  }, [currentChapterIndex, elapsedTime, totalDuration]);

  // Handler cuando termina un chapter
  const handleChapterEnd = () => {
    logger.info('[ChapterPlayer] Chapter terminado', {
      index: currentChapterIndex,
      chapterId: currentChapter.id
    });

    const nextIndex = currentChapterIndex + 1;

    if (nextIndex < chapters.length) {
      // Ir al siguiente chapter
      setCurrentChapterIndex(nextIndex);
    } else {
      // Video completo
      logger.info('[ChapterPlayer] Video completo', { videoId });
      setIsPlaying(false);
      onComplete?.();
    }
  };

  // Preload del siguiente chapter
  useEffect(() => {
    const nextIndex = currentChapterIndex + 1;
    if (nextIndex < chapters.length) {
      const nextChapter = chapters[nextIndex];
      const nextUrl = chapterUrls.get(nextChapter.id);

      if (nextUrl) {
        // Precargar en background
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = nextUrl;
        document.head.appendChild(link);

        logger.debug('[ChapterPlayer] Precargando siguiente chapter', {
          nextIndex,
          chapterId: nextChapter.id
        });
      }
    }
  }, [currentChapterIndex, chapters, chapterUrls]);

  // Autoplay cuando cambia el video source
  useEffect(() => {
    if (videoRef.current && currentUrl && isPlaying) {
      videoRef.current.play().catch(err => {
        logger.warn('[ChapterPlayer] Error en autoplay', { err });
      });
    }
  }, [currentUrl, isPlaying]);

  // Formatear tiempo
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentChapter || !currentUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Preparando chapter {currentChapterIndex + 1}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chapter-player relative w-full h-full bg-black">
      {/* Progreso global */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4">
        <div className="flex items-center justify-between text-white text-sm mb-2">
          <span>{formatTime(elapsedTime)}</span>
          <span className="text-gray-400">
            Chapter {currentChapterIndex + 1} of {chapters.length}
          </span>
          <span>{formatTime(totalDuration)}</span>
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${globalProgress}%` }}
          />
        </div>
      </div>

      {/* Video player */}
      <video
        ref={videoRef}
        src={currentUrl}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        onEnded={handleChapterEnd}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Indicador de chapter (opcional) */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
        {currentChapter.free ? '🆓 Free' : '🔒 Pro'}
      </div>
    </div>
  );
};
```

---

## 📦 Fase 6: Integración con Orchestrator (15 min)

### Actualizar: `src/services/studio/agents/videoRenderer.ts`

Reemplazar TODO el contenido con:

```typescript
/**
 * Video Renderer Agent
 * Coordinates chapter rendering client-side
 */

import { ChapterPlan, ChapterDescriptor } from '../types';
import { ChapterRenderer } from '../rendering/ChapterRenderer';
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
```

---

## 📦 Fase 7: Schemas de Supabase (10 min)

Crear/actualizar tablas en Supabase:

```sql
-- Tabla videos
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),  -- NULL si guest
  title TEXT NOT NULL,
  description TEXT,
  total_duration INTEGER NOT NULL,  -- segundos
  chapter_count INTEGER NOT NULL,
  status TEXT DEFAULT 'rendering',  -- 'rendering' | 'ready' | 'failed'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla chapters
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,  -- 'chapter_001'
  order_index INTEGER NOT NULL,
  duration INTEGER NOT NULL,  -- segundos
  storage_url TEXT NOT NULL,
  free BOOLEAN DEFAULT true,
  render_time INTEGER,  -- ms
  file_size INTEGER,  -- bytes
  user_id TEXT DEFAULT 'curios',  -- 'curios' para guests
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(video_id, chapter_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chapters_video_id ON chapters(video_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(video_id, order_index);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);

-- Storage bucket (ejecutar una sola vez)
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para videos bucket
CREATE POLICY "Videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'videos' AND auth.uid() = owner);
```

---

## 🧪 Fase 8: Testing Rápido (10 min)

Crear archivo de test simple:

```typescript
// src/services/studio/test/testChapterRendering.ts

import { InputManager } from '../managers/InputManager';
import { ChapterRenderer } from '../rendering/ChapterRenderer';
import { ChapterPlan } from '../types';

export async function testChapterRendering() {
  console.log('🧪 Iniciando test de chapter rendering...');

  // 1. Plan de prueba
  const testPlan: ChapterPlan = {
    videoId: 'test-video-001',
    title: 'Test Video',
    description: 'Testing chapter rendering',
    totalDuration: 15,
    chapters: [
      {
        id: 'chapter_001',
        order: 1,
        duration: 5,
        narration: 'Este es el primer chapter de prueba',
        visualCues: ['paisaje', 'tecnología'],
        keywords: ['nature', 'technology']
      },
      {
        id: 'chapter_002',
        order: 2,
        duration: 5,
        narration: 'Segundo chapter con más contenido',
        visualCues: ['ciencia', 'innovación'],
        keywords: ['science', 'innovation']
      },
      {
        id: 'chapter_003',
        order: 3,
        duration: 5,
        narration: 'Chapter final de la prueba',
        visualCues: ['futuro', 'éxito'],
        keywords: ['future', 'success']
      }
    ]
  };

  // 2. Preparar chapters
  const inputManager = new InputManager();
  console.log('📋 Preparando chapters...');
  const descriptors = await inputManager.prepareChapters(testPlan);
  console.log(`✅ ${descriptors.length} chapters preparados`);

  // 3. Renderizar primer chapter
  const renderer = new ChapterRenderer();
  console.log('🎬 Renderizando primer chapter...');

  const startTime = Date.now();
  const videoBlob = await renderer.renderChapter(descriptors[0], (progress) => {
    if (progress.progress % 20 === 0) {
      console.log(`⏳ Progreso: ${progress.progress.toFixed(0)}%`);
    }
  });
  const renderTime = Date.now() - startTime;

  console.log(`✅ Chapter renderizado en ${renderTime}ms`);
  console.log(`📦 Tamaño: ${(videoBlob.size / 1024).toFixed(2)}KB`);

  // 4. Descargar blob para verificar
  const url = URL.createObjectURL(videoBlob);
  console.log(`🎥 Video URL: ${url}`);
  console.log('💾 Puedes abrir esta URL en el navegador para ver el video');

  return { videoBlob, url, descriptors };
}
```

---

## ✅ Checklist de Implementación

```
Fase 1: Types & Interfaces (15 min)
[ ] Agregar tipos a src/services/studio/types.ts
[ ] Verificar que compila: npm run build

Fase 2: InputManager (30 min)
[ ] Crear carpeta src/services/studio/managers/
[ ] Crear InputManager.ts
[ ] Implementar prepareChapters()
[ ] Implementar prepareChapter()
[ ] Test manual

Fase 3: ChapterRenderer (45 min)
[ ] Crear ChapterRenderer.ts en rendering/
[ ] Implementar renderChapter()
[ ] Implementar renderTimeline()
[ ] Implementar efectos (zoom, fade, text)
[ ] Test con chapter de prueba

Fase 4: BackgroundRenderer (30 min)
[ ] Crear BackgroundRenderer.ts
[ ] Implementar startBackgroundRendering()
[ ] Implementar renderAndUpload()
[ ] Integración con Supabase Storage
[ ] Test de upload

Fase 5: ChapterPlayer Component (30 min)
[ ] Crear ChapterPlayer.tsx en components/
[ ] Implementar progreso global
[ ] Implementar autoplay secuencial
[ ] Implementar preload
[ ] Estilos y UI

Fase 6: Integración (15 min)
[ ] Actualizar VideoRendererAgent
[ ] Conectar todos los módulos
[ ] Test end-to-end

Fase 7: Supabase Schemas (10 min)
[ ] Crear tabla videos
[ ] Crear tabla chapters
[ ] Configurar bucket videos
[ ] Políticas RLS

Fase 8: Testing (10 min)
[ ] Crear test simple
[ ] Verificar renderizado
[ ] Verificar upload a Supabase
[ ] Verificar playback secuencial

TOTAL ESTIMADO: ~3 horas de código puro
```

---

## 🚀 Comandos para Ejecutar

```bash
# 1. Crear estructura de carpetas
mkdir -p src/services/studio/managers
mkdir -p src/services/studio/test

# 2. Verificar build continuamente
npm run dev

# 3. Test manual en consola del navegador
import { testChapterRendering } from './services/studio/test/testChapterRendering';
testChapterRendering();

# 4. Commit progresivo
git add src/services/studio/
git commit -m "🎬 Chapter rendering implementation - Phase X"
```

---

## 💪 ¡VAMOS CON TODO!

**Orden de ataque sugerido:**
1. Types (rápido, base para todo)
2. InputManager (prepara chapters)
3. ChapterRenderer (corazón del sistema)
4. Test básico (verificar que funciona)
5. BackgroundRenderer (la magia)
6. ChapterPlayer (UX)
7. Integración final

**Estás listo para empezar? 🔥**

¡Partamos con Fase 1: Types & Interfaces!
