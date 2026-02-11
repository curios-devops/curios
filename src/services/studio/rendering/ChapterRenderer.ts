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
    // Crear canvas Y AGREGARLO AL DOM (hidden)
    // CRÍTICO: captureStream() necesita que el canvas esté en el DOM para generar frames
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    // Ocultar canvas pero mantenerlo en el DOM
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '-9999px';
    this.canvas.style.left = '-9999px';
    this.canvas.style.pointerEvents = 'none';
    document.body.appendChild(this.canvas);
    
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('No se pudo crear contexto 2D');
    }
    this.ctx = context;
    
    this.audioContext = new AudioContext();
    
    logger.info('[ChapterRenderer] Inicializado', { 
      resolution: `${this.width}x${this.height}`,
      fps: this.fps,
      canvasInDOM: true
    });
  }

  /**
   * 🎯 VERSIÓN SIMPLE - Happy Path
   * Renderiza chapter con lógica mínima y directa
   * Sin: timeline compleja, video de fondo, audio, efectos complejos
   * Solo: imágenes + texto + loop básico
   */
  async renderChapterSimple(
    descriptor: ChapterDescriptor,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<Blob> {
    logger.info('[ChapterRenderer] 🎯 Renderizando SIMPLE', { 
      chapterId: descriptor.id,
      duration: descriptor.duration 
    });

    try {
      // 1. Cargar solo imágenes (sin video de fondo)
      const images = await this.loadImages(descriptor.assets.images);
      logger.debug('[ChapterRenderer] Imágenes cargadas', { count: images.length });
      
      // 2. Preparar audio si está disponible
      let audioTrack: MediaStreamTrack | null = null;
      if (descriptor.assets.audio) {
        logger.debug('[ChapterRenderer] Preparando audio track');
        audioTrack = await this.prepareAudio(descriptor.assets.audio);
        if (audioTrack) {
          logger.info('[ChapterRenderer] ✅ Audio track preparado exitosamente', {
            duration: audioTrack.getSettings().sampleRate,
            label: audioTrack.label
          });
        } else {
          logger.warn('[ChapterRenderer] ⚠️ No se pudo preparar el audio track');
        }
      }
      
      // 3. Crear stream del canvas
      const stream = this.canvas.captureStream(this.fps);
      
      // Agregar audio track si está disponible
      if (audioTrack) {
        stream.addTrack(audioTrack);
        logger.info('[ChapterRenderer] ✅ Audio track agregado al stream');
      }
      
      // Verificar estado del track
      const videoTrack = stream.getVideoTracks()[0];
      const audioTracks = stream.getAudioTracks();
      logger.debug('[ChapterRenderer] Canvas stream creado', { 
        fps: this.fps,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: audioTracks.length,
        trackReadyState: videoTrack?.readyState,
        trackEnabled: videoTrack?.enabled,
        trackMuted: videoTrack?.muted,
        hasAudio: audioTracks.length > 0
      });
      
      // 4. Verificar soporte de MediaRecorder
      const mimeTypes = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      
      if (!supportedMimeType) {
        logger.error('[ChapterRenderer] Ningún mimeType soportado', { 
          tried: mimeTypes,
          isTypeSupported: mimeTypes.map(t => ({ type: t, supported: MediaRecorder.isTypeSupported(t) }))
        });
        throw new Error('MediaRecorder no soporta video/webm ni video/mp4');
      }
      
      logger.info('[ChapterRenderer] MimeType seleccionado', { 
        mimeType: supportedMimeType,
        allSupported: mimeTypes.filter(t => MediaRecorder.isTypeSupported(t))
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond: 2500000
      });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          logger.debug('[ChapterRenderer] Chunk recibido', { size: e.data.size });
        }
      };
      
      const recordingComplete = new Promise<void>((resolve) => {
        recorder.onstop = () => {
          logger.info('[ChapterRenderer] Grabación completa', { 
            chunks: chunks.length,
            totalSize: chunks.reduce((sum, c) => sum + c.size, 0)
          });
          resolve();
        };
      });
      
      // 4. Iniciar grabación
      recorder.start(1000); // 1 chunk por segundo
      logger.debug('[ChapterRenderer] Grabación iniciada');
      
      // 5. Renderizar frames con loop simple
      // CRÍTICO: Usar requestAnimationFrame para sincronizar con el browser
      const totalFrames = Math.floor(descriptor.duration * this.fps);
      const frameDuration = 1000 / this.fps; // ms por frame
      
      logger.debug('[ChapterRenderer] Iniciando loop de rendering', { totalFrames });
      
      let frame = 0;
      const startTime = performance.now();
      
      const renderFrame = () => {
        if (frame >= totalFrames) {
          // Loop completado
          if (onProgress) {
            onProgress({
              chapterId: descriptor.id,
              progress: 100,
              currentFrame: totalFrames,
              totalFrames: totalFrames
            });
          }
          return;
        }
        
        const progress = (frame / totalFrames) * 100;
        
        // Progress callback
        if (onProgress && frame % 10 === 0) {
          onProgress({
            chapterId: descriptor.id,
            progress: progress,
            currentFrame: frame,
            totalFrames: totalFrames
          });
        }
        
        // Seleccionar imagen (ciclar entre las disponibles)
        const imageIndex = Math.floor((frame / totalFrames) * images.length);
        const image = images[Math.min(imageIndex, images.length - 1)];
        
        // Limpiar canvas (fondo negro)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Dibujar imagen centrada y escalada
        this.ctx.drawImage(image, 0, 0, this.width, this.height);
        
        // Dibujar texto de narración (simple, en la parte inferior)
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 10;
        
        // Word wrap simple para el texto
        const words = descriptor.text.split(' ');
        const maxWidth = this.width - 100;
        let line = '';
        let y = this.height - 150;
        
        for (const word of words) {
          const testLine = line + word + ' ';
          const metrics = this.ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && line.length > 0) {
            this.ctx.fillText(line, this.width / 2, y);
            line = word + ' ';
            y += 40;
          } else {
            line = testLine;
          }
        }
        this.ctx.fillText(line, this.width / 2, y);
        
        // Resetear shadow para no afectar próximo frame
        this.ctx.shadowBlur = 0;
        
        frame++;
        
        // Calcular tiempo para siguiente frame
        const elapsed = performance.now() - startTime;
        const targetTime = frame * frameDuration;
        const delay = Math.max(0, targetTime - elapsed);
        
        // Programar siguiente frame
        setTimeout(() => requestAnimationFrame(renderFrame), delay);
      };
      
      // Iniciar rendering
      await new Promise<void>((resolve) => {
        const checkComplete = () => {
          if (frame >= totalFrames) {
            resolve();
          } else {
            requestAnimationFrame(checkComplete);
          }
        };
        
        requestAnimationFrame(renderFrame);
        requestAnimationFrame(checkComplete);
      });
      
      logger.debug('[ChapterRenderer] Loop completado, deteniendo grabación');
      
      // 6. Esperar un poco y detener
      await new Promise(resolve => setTimeout(resolve, 150));
      recorder.stop();
      await recordingComplete;
      
      // 7. Crear blob final
      if (chunks.length === 0) {
        throw new Error('No se generaron chunks de video');
      }
      
      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      
      logger.info('[ChapterRenderer] ✅ Video generado exitosamente', { 
        size: videoBlob.size,
        sizeKB: (videoBlob.size / 1024).toFixed(2)
      });
      
      return videoBlob;
      
    } catch (error) {
      logger.error('[ChapterRenderer] Error en renderizado simple', { error });
      throw error;
    }
  }

  /**
   * Renderizar un chapter completo (VERSIÓN COMPLEJA - DEPRECADA POR AHORA)
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
      
      // Verificar tracks del stream
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      logger.debug('[ChapterRenderer] Stream configuration', {
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        videoEnabled: videoTracks[0]?.enabled,
        videoReadyState: videoTracks[0]?.readyState,
        audioEnabled: audioTracks[0]?.enabled,
        audioReadyState: audioTracks[0]?.readyState
      });
      
      // Detectar mimeType soportado
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      
      if (!supportedMimeType) {
        logger.error('[ChapterRenderer] No hay mimeType soportado para video/webm');
        throw new Error('MediaRecorder no soporta video/webm en este navegador');
      }
      
      logger.debug('[ChapterRenderer] Using mimeType', { mimeType: supportedMimeType });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      
      const mediaChunks: Blob[] = []; // Datos del MediaRecorder (no confundir con chapters)
      recorder.ondataavailable = (e) => {
        logger.debug('[ChapterRenderer] ondataavailable fired', {
          dataSize: e.data.size,
          hasData: e.data.size > 0
        });
        if (e.data.size > 0) {
          mediaChunks.push(e.data);
          logger.debug('[ChapterRenderer] Media chunk received', { 
            chunkSize: e.data.size,
            totalMediaChunks: mediaChunks.length 
          });
        } else {
          logger.warn('[ChapterRenderer] ondataavailable fired but data.size is 0');
        }
      };
      
      // Esperar a que termine la grabación
      const recordingComplete = new Promise<void>((resolve) => {
        recorder.onstop = () => {
          logger.debug('[ChapterRenderer] MediaRecorder stopped', { 
            totalMediaChunks: mediaChunks.length,
            totalSize: mediaChunks.reduce((sum, c) => sum + c.size, 0)
          });
          resolve();
        };
      });
      
      // 4. Iniciar grabación (emit chunks every 1 second - más tiempo = chunks más estables)
      recorder.start(1000); // Cambiar de 100ms a 1000ms
      
      logger.debug('[ChapterRenderer] MediaRecorder started', { 
        state: recorder.state,
        mimeType: recorder.mimeType 
      });
      
      // 5. Renderizar frames según timeline (con video de fondo)
      logger.debug('[ChapterRenderer] Starting timeline render', { 
        chapterId: descriptor.id,
        duration: descriptor.duration 
      });
      
      await this.renderTimeline(descriptor, loadedImages, backgroundVideoElement, onProgress);
      
      logger.debug('[ChapterRenderer] Timeline render complete, stopping recorder', { 
        chapterId: descriptor.id,
        recorderState: recorder.state 
      });
      
      // 6. Esperar un frame extra para asegurar que MediaRecorder tenga tiempo de generar chunks
      await new Promise(resolve => setTimeout(resolve, 150)); // Wait 150ms for last chunk
      
      // 7. Detener grabación y esperar
      recorder.stop();
      await recordingComplete;
      
      // 8. Crear video blob
      if (mediaChunks.length === 0) {
        logger.error('[ChapterRenderer] No media chunks received from MediaRecorder!', {
          chapterId: descriptor.id,
          recorderState: recorder.state
        });
        throw new Error('No video data recorded');
      }
      
      const videoBlob = new Blob(mediaChunks, { type: 'video/webm' });
      
      logger.info('[ChapterRenderer] Render completo', { 
        chapterId: descriptor.id,
        mediaChunks: mediaChunks.length,
        size: videoBlob.size,
        sizeKB: (videoBlob.size / 1024).toFixed(2)
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
      // Si es data URI (SVG placeholder), cargar directamente
      if (asset.url.startsWith('data:')) {
        return new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => {
            logger.debug('[ChapterRenderer] SVG placeholder cargado', { index });
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
      
      // Para URLs externas: cargar directamente SIN crossOrigin (evita CORS)
      // NO usar cache para imágenes externas por problemas de CORS
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        // NO usar crossOrigin - causa problemas CORS con muchos sitios
        // img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          logger.debug('[ChapterRenderer] Imagen externa cargada', { 
            url: asset.url.substring(0, 50),
            size: `${img.width}x${img.height}`
          });
          resolve(img);
        };
        
        img.onerror = () => {
          logger.warn('[ChapterRenderer] Error cargando imagen, usando placeholder SVG', { 
            url: asset.url.substring(0, 50) 
          });
          
          // Fallback: Placeholder SVG coloreado
          const colors = ['0095FF', '3b82f6', '60a5fa', '2563eb', '1e40af'];
          const color = colors[index % colors.length];
          const placeholder = new Image();
          placeholder.src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"%3E%3Crect fill="%23${color}" width="720" height="1280"/%3E%3Ctext x="360" y="640" font-size="48" fill="white" text-anchor="middle" font-family="Arial"%3EImage ${index + 1}%3C/text%3E%3C/svg%3E`;
          
          placeholder.onload = () => {
            logger.debug('[ChapterRenderer] Placeholder SVG usado como fallback', { index });
            resolve(placeholder);
          };
          
          placeholder.onerror = () => {
            logger.error('[ChapterRenderer] Error cargando placeholder, usando imagen vacía', { index });
            // Último recurso: imagen sólida
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
   * 🧪 TEST: Renderizar sin audio para diagnóstico
   */
  async testRenderNoAudio(
    descriptor: ChapterDescriptor,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<Blob> {
    logger.info('[ChapterRenderer] 🧪 TEST: Renderizando SIN audio', { 
      chapterId: descriptor.id,
      duration: descriptor.duration 
    });

    try {
      // 1. Preparar assets (solo imágenes, sin video de fondo)
      const loadedImages = await this.loadImages(descriptor.assets.images);
      
      // 2. Configurar MediaRecorder SIN audio track
      const stream = this.canvas.captureStream(this.fps);
      
      logger.debug('[ChapterRenderer] 🧪 Stream configuration (NO AUDIO)', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      
      // Detectar mimeType soportado
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      
      if (!supportedMimeType) {
        logger.error('[ChapterRenderer] 🧪 TEST: No hay mimeType soportado');
        throw new Error('MediaRecorder no soporta video/webm');
      }
      
      logger.debug('[ChapterRenderer] 🧪 Using mimeType', { mimeType: supportedMimeType });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond: 2500000
      });
      
      const mediaChunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        logger.debug('[ChapterRenderer] 🧪 ondataavailable fired', {
          dataSize: e.data.size,
          hasData: e.data.size > 0
        });
        if (e.data.size > 0) {
          mediaChunks.push(e.data);
        }
      };
      
      const recordingComplete = new Promise<void>((resolve) => {
        recorder.onstop = () => {
          logger.info('[ChapterRenderer] 🧪 MediaRecorder stopped', { 
            totalMediaChunks: mediaChunks.length,
            totalSize: mediaChunks.reduce((sum, c) => sum + c.size, 0)
          });
          resolve();
        };
      });
      
      // 3. Iniciar grabación (1 segundo de timeslice)
      recorder.start(1000); // Cambiar de 100ms a 1000ms
      logger.debug('[ChapterRenderer] 🧪 MediaRecorder started', { 
        state: recorder.state,
        mimeType: recorder.mimeType
      });
      
      // 4. Renderizar frames (sin video de fondo, sin audio)
      await this.renderTimeline(descriptor, loadedImages, undefined, onProgress);
      
      logger.debug('[ChapterRenderer] 🧪 Timeline complete, stopping recorder');
      
      // 5. Esperar y detener
      await new Promise(resolve => setTimeout(resolve, 150));
      recorder.stop();
      await recordingComplete;
      
      // 6. Crear video blob
      if (mediaChunks.length === 0) {
        logger.error('[ChapterRenderer] 🧪 TEST FAILED: No chunks received!');
        throw new Error('Test failed: No video data recorded');
      }
      
      const videoBlob = new Blob(mediaChunks, { type: 'video/webm' });
      
      logger.info('[ChapterRenderer] 🧪 TEST SUCCESS!', { 
        mediaChunks: mediaChunks.length,
        size: videoBlob.size,
        sizeKB: (videoBlob.size / 1024).toFixed(2)
      });
      
      return videoBlob;
      
    } catch (error) {
      logger.error('[ChapterRenderer] 🧪 TEST ERROR', { error });
      throw error;
    }
  }

  /**
   * Preparar audio track
   */
  private async prepareAudio(audioBlob: Blob): Promise<MediaStreamTrack | null> {
    try {
      logger.debug('[ChapterRenderer] Preparing audio track', { 
        size: audioBlob.size,
        type: audioBlob.type 
      });

      // Convertir blob a ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Intentar decodificar audio
      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      } catch (decodeError) {
        logger.error('[ChapterRenderer] Failed to decode audio data', { 
          error: decodeError,
          blobType: audioBlob.type,
          blobSize: audioBlob.size
        });
        return null;
      }
      
      logger.debug('[ChapterRenderer] Audio decoded successfully', {
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate
      });
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const destination = this.audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.start();
      
      logger.info('[ChapterRenderer] Audio track prepared successfully');
      return destination.stream.getAudioTracks()[0];
    } catch (error) {
      logger.warn('[ChapterRenderer] Could not prepare audio track', { error });
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
    // Remover canvas del DOM
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.audioContext.close();
    logger.info('[ChapterRenderer] Recursos liberados');
  }
}
