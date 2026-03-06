# 🏗️ Nueva Arquitectura - Client-side Chapter Rendering

**Fecha:** Febrero 7, 2026  
**Estrategia:** Cliente-side Rendering por Chapters  
**Basado en:** RefactorVideo documento

---

## 🎯 Principio Rector

> **Un chapter = un video completo, independiente y reproducible**

El usuario percibe un solo video largo.  
El sistema maneja una secuencia de videos cortos.

**No hay concatenación. No hay streaming. No hay hacks.**

---

## 🧠 Conceptos Clave

### Chapter
- **Duración:** 5-10 segundos (definido por LLM)
- **Contiene:**
  - Imágenes (1-3 por chapter)
  - Texto/subtítulos
  - Audio TTS narración
  - Música de fondo (opcional)
- **Output:** Video completo MP4/WebM

### Video Lógico (lo que ve el usuario)
- Conjunto ordenado de chapters
- Progreso global (no por chapter)
- Transcripción completa
- Experiencia de "un solo video"

---

## 📦 Tech Stack Confirmado

| Capa | Tecnología | Razón |
|------|-----------|-------|
| **Frontend** | React + TypeScript | Ya implementado |
| **Render Engine** | Canvas API + Web Audio | Nativo del navegador |
| **Video Capture** | MediaRecorder API | Graba canvas → MP4 |
| **Player** | HTML5 `<video>` secuencial | Simple y robusto |
| **Storage** | Supabase Storage | Ya implementado |
| **Metadata** | Supabase DB | Ya implementado |
| **IA** | LLM (chapters) + OpenAI TTS | Ya implementado |

### ❌ Lo que NO usamos:
- ❌ Netlify Functions
- ❌ Server-side rendering
- ❌ FFmpeg (por ahora)
- ❌ Puppeteer/Chromium

---

## 🔄 Flujo End-to-End

```
User Query
    ↓
🔹 1. LLM → Chapters          (✅ Ya existe)
    ↓
🔹 2. Input Manager           (🆕 Nuevo)
    ↓
🔹 3. Chapter Renderer         (🆕 Nuevo - corazón del refactor)
    ↓
🔹 4. Chapter Player           (🔄 Refactor VideoPlayer)
    ↓
🔹 5. Background Renderer      (🆕 Nuevo - killer feature)
    ↓
🔹 6. Supabase Storage         (✅ Ya existe)
```

---

## 🔹 Módulo 1: LLM → Chapters (✅ Ya existe)

**Archivo:** `src/services/studio/agents/plannerAgent.ts`

### Output Esperado:
```typescript
interface ChapterPlan {
  chapters: Array<{
    id: string;              // "chapter_001"
    order: number;           // 1, 2, 3...
    duration: number;        // 5-10 segundos
    narration: string;       // Texto para TTS
    visualCues: string[];    // Qué mostrar visualmente
    keywords: string[];      // Para búsqueda de imágenes
  }>;
  totalDuration: number;
  title: string;
  description: string;
}
```

**Acción:** ✅ Solo verificar que genera esto (probablemente ya lo hace)

---

## 🔹 Módulo 2: Input Manager (🆕 Nuevo)

**Archivo:** `src/services/studio/managers/InputManager.ts` (crear)

### Responsabilidad:
Tomar salida del LLM y preparar cada chapter para rendering.

### Input:
```typescript
ChapterPlan (del LLM)
```

### Procesamiento por Chapter:
```typescript
class InputManager {
  async prepareChapter(
    chapterPlan: ChapterPlan,
    chapterIndex: number
  ): Promise<ChapterDescriptor> {
    
    // 1. Buscar imágenes (usando assetManager)
    const images = await this.assetManager.searchImages(
      chapterPlan.keywords, 
      3 // max 3 imágenes por chapter
    );
    
    // 2. Generar audio TTS
    const audioBlob = await this.ttsService.synthesize(
      chapterPlan.narration
    );
    
    // 3. Calcular timeline interno del chapter
    const timeline = this.calculateTimeline(
      chapterPlan.duration,
      images.length,
      chapterPlan.narration
    );
    
    // 4. Retornar descriptor completo
    return {
      id: chapterPlan.id,
      order: chapterIndex,
      duration: chapterPlan.duration,
      assets: {
        images: images,
        audio: audioBlob,
        music: null // opcional
      },
      timeline: timeline,
      text: chapterPlan.narration
    };
  }
}
```

### Output:
```typescript
interface ChapterDescriptor {
  id: string;                    // "chapter_001"
  order: number;                 // 1, 2, 3...
  duration: number;              // 5-10 segundos
  assets: {
    images: Image[];             // URLs o blobs
    audio: Blob;                 // Audio TTS
    music?: Blob;                // Música de fondo (opcional)
  };
  timeline: TimelineEntry[];     // Cuándo mostrar qué
  text: string;                  // Narración
  free: boolean;                 // true por ahora (monetización futura)
}

interface TimelineEntry {
  timestamp: number;             // Segundos desde inicio
  action: 'show-image' | 'fade-in' | 'fade-out' | 'show-text';
  data: any;                     // Depende del action
}
```

---

## 🔹 Módulo 3: Chapter Renderer (🆕 Nuevo - CORE)

**Archivo:** `src/services/studio/rendering/ChapterRenderer.ts` (crear)

### Responsabilidad:
Renderizar **UN chapter → UN video MP4**

### Pipeline Detallado:

```typescript
class ChapterRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext;
  private mediaRecorder: MediaRecorder;
  
  constructor() {
    // Canvas portrait (9:16) baja resolución para mobile
    this.canvas = document.createElement('canvas');
    this.canvas.width = 720;   // HD portrait
    this.canvas.height = 1280;
    this.ctx = this.canvas.getContext('2d')!;
    this.audioContext = new AudioContext();
  }
  
  async renderChapter(
    descriptor: ChapterDescriptor,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    
    // 1. Preparar audio (TTS + música)
    const audioTrack = await this.prepareAudio(descriptor);
    
    // 2. Configurar MediaRecorder
    const stream = this.canvas.captureStream(30); // 30 FPS
    stream.addTrack(audioTrack);
    
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000 // 2.5 Mbps
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    
    // 3. Iniciar grabación
    recorder.start();
    
    // 4. Renderizar frames según timeline
    await this.renderTimeline(descriptor, onProgress);
    
    // 5. Detener grabación
    recorder.stop();
    
    // 6. Esperar a que termine
    await new Promise((resolve) => {
      recorder.onstop = resolve;
    });
    
    // 7. Retornar video blob
    return new Blob(chunks, { type: 'video/webm' });
  }
  
  private async renderTimeline(
    descriptor: ChapterDescriptor,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const startTime = performance.now();
    const durationMs = descriptor.duration * 1000;
    const frameInterval = 1000 / 30; // 30 FPS
    
    let currentFrame = 0;
    const totalFrames = Math.ceil(durationMs / frameInterval);
    
    while (performance.now() - startTime < durationMs) {
      const elapsed = performance.now() - startTime;
      const progress = (elapsed / durationMs) * 100;
      
      // Limpiar canvas
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Ejecutar acciones del timeline para este timestamp
      const currentTime = elapsed / 1000;
      this.executeTimelineActions(descriptor, currentTime);
      
      // Reportar progreso
      onProgress?.(progress);
      
      // Esperar al siguiente frame
      await this.waitForNextFrame(frameInterval);
      currentFrame++;
    }
  }
  
  private executeTimelineActions(
    descriptor: ChapterDescriptor,
    currentTime: number
  ): void {
    // Encontrar acciones activas en este timestamp
    const activeEntries = descriptor.timeline.filter(entry => 
      entry.timestamp <= currentTime && 
      entry.timestamp + 0.5 > currentTime // Ventana de 0.5s
    );
    
    activeEntries.forEach(entry => {
      switch (entry.action) {
        case 'show-image':
          this.drawImage(entry.data);
          break;
        case 'show-text':
          this.drawText(entry.data);
          break;
        case 'fade-in':
          this.applyFade('in', entry.data);
          break;
        // ...más acciones
      }
    });
  }
  
  private drawImage(imageData: { url: string; position: 'full' | 'top' | 'bottom' }): void {
    const img = new Image();
    img.src = imageData.url;
    // Dibujar imagen según posición
    if (imageData.position === 'full') {
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    }
    // ...más lógica
  }
  
  private drawText(textData: { text: string; position: 'center' | 'bottom' }): void {
    this.ctx.font = '32px Arial';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'center';
    // Dibujar texto con sombra, etc.
    this.ctx.fillText(textData.text, this.canvas.width / 2, this.canvas.height - 100);
  }
  
  private async prepareAudio(descriptor: ChapterDescriptor): Promise<MediaStreamTrack> {
    // Mezclar TTS + música de fondo
    const source = this.audioContext.createMediaStreamSource(
      await this.blobToMediaStream(descriptor.assets.audio)
    );
    
    const destination = this.audioContext.createMediaStreamDestination();
    source.connect(destination);
    
    return destination.stream.getAudioTracks()[0];
  }
}
```

### Características Clave:
- ✅ **Client-side puro** - Todo en navegador
- ✅ **Canvas + MediaRecorder** - APIs nativas
- ✅ **Portrait 720x1280** - Optimizado para mobile
- ✅ **30 FPS** - Balance calidad/performance
- ✅ **Progress callbacks** - UX fluida
- ✅ **~6-7 segundos** - Para renderizar chapter de 6s

---

## 🔹 Módulo 4: Chapter Player (🔄 Refactor)

**Archivo:** `src/services/studio/components/VideoPlayer.tsx` (refactor)

### Responsabilidad:
Reproducir chapters en secuencia como un solo video.

### Implementación:

```typescript
interface ChapterPlayerProps {
  chapters: ChapterDescriptor[];
  videoId: string;
}

const ChapterPlayer: React.FC<ChapterPlayerProps> = ({ chapters, videoId }) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [globalProgress, setGlobalProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [chapterUrls, setChapterUrls] = useState<Map<number, string>>(new Map());
  
  // Calcular progreso global
  const totalDuration = chapters.reduce((sum, ch) => sum + ch.duration, 0);
  const elapsedTime = chapters
    .slice(0, currentChapterIndex)
    .reduce((sum, ch) => sum + ch.duration, 0);
  
  useEffect(() => {
    const progress = (elapsedTime / totalDuration) * 100;
    setGlobalProgress(progress);
  }, [currentChapterIndex, elapsedTime, totalDuration]);
  
  // Preload del siguiente chapter
  useEffect(() => {
    const nextIndex = currentChapterIndex + 1;
    if (nextIndex < chapters.length && !chapterUrls.has(nextIndex)) {
      preloadNextChapter(nextIndex);
    }
  }, [currentChapterIndex]);
  
  // Autoplay del siguiente chapter
  const handleChapterEnd = () => {
    const nextIndex = currentChapterIndex + 1;
    if (nextIndex < chapters.length) {
      setCurrentChapterIndex(nextIndex);
      // Video ref se actualiza automáticamente con nuevo src
    }
  };
  
  const preloadNextChapter = async (index: number) => {
    // Cargar desde Supabase si ya está renderizado
    // O esperar a que Background Renderer lo complete
    const url = await fetchChapterUrl(videoId, chapters[index].id);
    setChapterUrls(prev => new Map(prev).set(index, url));
  };
  
  return (
    <div className="chapter-player">
      {/* Progreso GLOBAL (no por chapter) */}
      <div className="global-progress">
        <div 
          className="progress-bar"
          style={{ width: `${globalProgress}%` }}
        />
        <span>{formatTime(elapsedTime)} / {formatTime(totalDuration)}</span>
      </div>
      
      {/* Video player */}
      <video
        ref={videoRef}
        src={chapterUrls.get(currentChapterIndex)}
        autoPlay
        onEnded={handleChapterEnd}
        className="chapter-video"
      />
      
      {/* Indicador visual (opcional) */}
      <div className="chapter-indicator">
        Chapter {currentChapterIndex + 1} of {chapters.length}
      </div>
    </div>
  );
};
```

### Características Clave:
- ✅ **Progreso global** - Usuario ve % del video completo
- ✅ **Autoplay secuencial** - Sin clicks entre chapters
- ✅ **Preload inteligente** - Siguiente chapter listo
- ✅ **Transiciones suaves** - Fade-in/out entre chapters
- ✅ **UX premium** - Parece un solo video

---

## 🔹 Módulo 5: Background Renderer (🆕 Killer Feature)

**Archivo:** `src/services/studio/rendering/BackgroundRenderer.ts` (crear)

### Responsabilidad:
Renderizar chapters en background mientras usuario ve el anterior.

### Estrategia:

```typescript
class BackgroundRenderer {
  private renderQueue: ChapterDescriptor[];
  private renderer: ChapterRenderer;
  private isRendering: boolean;
  
  constructor() {
    this.renderQueue = [];
    this.renderer = new ChapterRenderer();
    this.isRendering = false;
  }
  
  async startBackgroundRendering(
    chapters: ChapterDescriptor[],
    videoId: string,
    onChapterComplete?: (chapterIndex: number, url: string) => void
  ): Promise<void> {
    this.renderQueue = [...chapters];
    
    // Renderizar primer chapter inmediatamente
    const firstChapter = this.renderQueue.shift()!;
    await this.renderAndUpload(firstChapter, videoId, 0, onChapterComplete);
    
    // Continuar con el resto en background
    this.renderNextInBackground(videoId, onChapterComplete);
  }
  
  private async renderNextInBackground(
    videoId: string,
    onChapterComplete?: (chapterIndex: number, url: string) => void
  ): Promise<void> {
    if (this.renderQueue.length === 0 || this.isRendering) {
      return;
    }
    
    this.isRendering = true;
    const chapter = this.renderQueue.shift()!;
    const index = chapter.order;
    
    await this.renderAndUpload(chapter, videoId, index, onChapterComplete);
    
    this.isRendering = false;
    
    // Continuar con el siguiente
    if (this.renderQueue.length > 0) {
      this.renderNextInBackground(videoId, onChapterComplete);
    }
  }
  
  private async renderAndUpload(
    chapter: ChapterDescriptor,
    videoId: string,
    index: number,
    onChapterComplete?: (chapterIndex: number, url: string) => void
  ): Promise<void> {
    // 1. Renderizar chapter
    const videoBlob = await this.renderer.renderChapter(chapter);
    
    // 2. Subir a Supabase
    const fileName = `videos/${videoId}/${chapter.id}.webm`;
    const url = await this.uploadToSupabase(fileName, videoBlob);
    
    // 3. Guardar metadata en DB
    await this.saveChapterMetadata(videoId, chapter, url);
    
    // 4. Notificar completado
    onChapterComplete?.(index, url);
  }
  
  private async uploadToSupabase(path: string, blob: Blob): Promise<string> {
    // Upload usando supabase client
    // Retornar URL pública
  }
  
  private async saveChapterMetadata(
    videoId: string,
    chapter: ChapterDescriptor,
    url: string
  ): Promise<void> {
    // Guardar en tabla chapters:
    // - video_id
    // - chapter_id
    // - order
    // - duration
    // - storage_url
    // - free (true por ahora)
    // - user_id (si logged in, sino 'curios')
  }
}
```

### Flujo Real:
```
Usuario inicia generación
    ↓
Chapter 1 renderiza (~6s)
    ↓
Usuario empieza a VER chapter 1 (6s)
    ↓
Mientras ve → Chapter 2 renderiza en background (6s)
    ↓
Chapter 1 termina → Chapter 2 YA ESTÁ LISTO
    ↓
Autoplay inmediato → usuario no espera
    ↓
Mientras ve chapter 2 → Chapter 3 renderiza
    ↓
Continúa...
```

### Resultado:
- ⚡ **Tiempo hasta primer video:** ~6 segundos
- ⚡ **Tiempo entre chapters:** ~0 segundos (ya está listo)
- ⚡ **CPU distribuido:** No bloquea UI
- ⚡ **Mobile-friendly:** Un chapter a la vez

---

## 🔹 Módulo 6: Supabase Storage (✅ Ya existe)

### Schema de Base de Datos:

```sql
-- Tabla videos
CREATE TABLE videos (
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
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,  -- 'chapter_001'
  order_index INTEGER NOT NULL,
  duration INTEGER NOT NULL,  -- segundos
  storage_url TEXT NOT NULL,
  free BOOLEAN DEFAULT true,  -- Monetización futura
  render_time INTEGER,  -- ms para analytics
  file_size INTEGER,  -- bytes
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(video_id, chapter_id)
);

-- Índices
CREATE INDEX idx_chapters_video_id ON chapters(video_id);
CREATE INDEX idx_chapters_order ON chapters(video_id, order_index);
```

### Storage Structure:
```
supabase-storage/
└── videos/
    ├── {videoId}/
    │   ├── chapter_001.webm
    │   ├── chapter_002.webm
    │   ├── chapter_003.webm
    │   └── ...
    └── {anotherVideoId}/
        └── ...
```

### Usuario Guest:
```typescript
// Si no está logged in
const userId = user?.id || 'curios'; // Usuario comodín

await supabase
  .from('videos')
  .insert({
    user_id: userId,
    title: videoTitle,
    // ...
  });
```

---

## 📊 Performance Estimado

### Rendering Times:
| Chapter Duration | Render Time | Frames |
|-----------------|-------------|--------|
| 5 segundos | ~5-6 segundos | 150 |
| 7 segundos | ~7-8 segundos | 210 |
| 10 segundos | ~10-11 segundos | 300 |

### User Experience:
| Métrica | Valor |
|---------|-------|
| **Time to first video** | ~6 segundos |
| **Time between chapters** | ~0 segundos (preloaded) |
| **Total time (10 chapters)** | ~60 segundos |
| **Perceived wait** | Solo 6s (primer chapter) |

### Comparación con Netlify:
| | Netlify Chunks | Client-side Chapters |
|---|----------------|---------------------|
| **Primer frame** | 30+ segundos | 6 segundos |
| **Timeout issues** | ❌ Constantes | ✅ Ninguno |
| **User CPU** | 0% | 40-60% (temporal) |
| **Costo** | Gratis pero no funciona | Gratis y funciona |

---

## 🎯 Checklist de Implementación

### Fase 1: Setup (Day 1)
- [ ] Crear `InputManager.ts`
- [ ] Crear `ChapterRenderer.ts`
- [ ] Crear `BackgroundRenderer.ts`
- [ ] Actualizar types en `types.ts`

### Fase 2: Core Rendering (Day 2)
- [ ] Implementar Canvas rendering pipeline
- [ ] Implementar MediaRecorder capture
- [ ] Implementar timeline executor
- [ ] Tests unitarios

### Fase 3: Player (Day 2-3)
- [ ] Refactor `VideoPlayer.tsx` para secuencial
- [ ] Implementar progreso global
- [ ] Implementar preload
- [ ] Implementar autoplay

### Fase 4: Integration (Day 3)
- [ ] Conectar con Supabase
- [ ] Implementar background rendering
- [ ] Metadata en DB
- [ ] Usuario guest support

### Fase 5: Testing (Day 3-4)
- [ ] Test en Chrome/Firefox/Safari
- [ ] Test en mobile (iOS/Android)
- [ ] Test con diferentes duraciones
- [ ] Performance profiling

---

## 🚀 Próximo Paso

Ver **Tarea 4: Limpieza de Código** para eliminar código obsoleto.

---

**Siguiente documento:** `CODE_CLEANUP.md`
