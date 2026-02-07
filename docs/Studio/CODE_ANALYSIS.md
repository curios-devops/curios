# 📊 Análisis de Código Actual - Studio

**Fecha:** Febrero 7, 2026  
**Objetivo:** Identificar código acoplado a Netlify Functions vs código reutilizable  
**Decisión:** Cliente-side Rendering (Opción 2)

---

## 🗂️ Estructura Actual

```
src/services/studio/
├── agents/                      # ✅ MANTENER (generación de chapters/scenes)
│   ├── orchestrator.ts          # Coordinador principal
│   ├── plannerAgent.ts          # Planificación de chapters
│   ├── sceneGenerator.ts        # Generación de escenas
│   ├── studioWriterAgent.ts     # Escritura de scripts
│   ├── researcherAgent.ts       # Investigación de contenido
│   ├── formatterAgent.ts        # Formato de salida
│   ├── writerAgent.ts          # Escritura adicional
│   ├── controller.ts            # Control de flujo
│   ├── videoRenderer.ts         # ⚠️ REFACTOR (solo preview mode ahora)
│   ├── workers/                 # Workers para procesamiento
│   └── labworkers/             # Lab workers especializados
│
├── assets/                      # ✅ MANTENER (gestión de assets)
│   ├── assetManager.ts          # Manager principal de assets
│   ├── braveImageService.ts     # Búsqueda de imágenes
│   └── videoAssetAgent.ts       # Assets de video
│
├── audio/                       # ✅ MANTENER (TTS y audio)
│   ├── audioAssetAgent.ts       # Gestión de audio assets
│   ├── scriptNarrator.ts        # Narración de scripts
│   └── ttsService.ts            # Servicio TTS
│
├── components/                  # ✅ MANTENER + MEJORAR
│   ├── SceneVisualizer.tsx      # Visualización de escenas
│   ├── StudioTopBar.tsx         # Barra superior
│   ├── VideoPlayer.tsx          # ⚠️ REFACTOR COMPLETO (player secuencial)
│   └── TimestampedScript.tsx    # Script con timestamps
│
├── rendering/                   # ❌ ELIMINAR/REEMPLAZAR
│   ├── chunkedRenderer.ts       # ❌ Acoplado a Netlify
│   └── chunkPlanner.ts          # ❌ Estrategia obsoleta
│
├── pages/                       # ✅ MANTENER (UI principal)
├── tools/                       # ✅ REVISAR
├── functions/                   # ⚠️ REVISAR (pueden ser útiles)
├── types.ts                     # ✅ MANTENER + ACTUALIZAR
├── config.ts                    # ✅ MANTENER + ACTUALIZAR
└── index.ts                     # ✅ MANTENER

netlify/functions/
├── render-chunk.js              # ❌ ELIMINAR (10KB, obsoleto)
└── render-video.mjs             # ❌ ELIMINAR (4KB, obsoleto)
```

---

## 🔴 Código a ELIMINAR

### 1. Netlify Functions (2 archivos)

#### `netlify/functions/render-chunk.js` (10KB)
**Razón:** Renderiza chunks en servidor (no funciona, timeout)  
**Acción:** ❌ Eliminar completamente

#### `netlify/functions/render-video.mjs` (4KB)
**Razón:** Renderiza video completo en servidor (obsoleto)  
**Acción:** ❌ Eliminar completamente

### 2. Rendering Module Obsoleto

#### `src/services/studio/rendering/chunkedRenderer.ts` (474 líneas)
**Problemas:**
- Diseñado para llamar a Netlify Functions
- Lógica de paralelización innecesaria (cliente-side es secuencial)
- Gestiona estados de "renderingChunks" en servidor

**Código acoplado detectado:**
```typescript
// Líneas 42-46: Production mode check para Netlify
constructor(maxParallelChunks: number = 3, productionMode: boolean = false) {
  this.productionMode = productionMode || 
    import.meta.env.VITE_ENABLE_PRODUCTION_RENDERING === 'true';
  if (this.productionMode) {
    logger.info('[Chunked Renderer] Production mode ENABLED - will render real videos');
```

**Acción:** ❌ Eliminar y reemplazar con `ChapterRenderer` (client-side)

#### `src/services/studio/rendering/chunkPlanner.ts`
**Razón:** Planifica chunks para Netlify (estrategia obsoleta)  
**Acción:** ❌ Eliminar (reemplazado por chapters desde LLM)

---

## 🟡 Código a REFACTOR

### 1. Video Renderer Agent

#### `src/services/studio/agents/videoRenderer.ts` (100 líneas)
**Estado actual:**
- Solo modo preview (simulación)
- Comentario: "TODO: Implement actual server-side rendering"

**Acoplamiento detectado:**
```typescript
// Líneas 1-9: Documentación obsoleta
/**
 * Video Renderer Service (Client-side)
 * PREVIEW MODE: Simulates rendering for development
 * TODO: Implement actual server-side rendering  // ← Obsoleto
 */

const PREVIEW_MODE = true; // ← Ya no aplica
```

**Acción:** 🔄 Refactor completo
- Eliminar concepto de "preview mode"
- Implementar rendering real client-side por chapter
- Usar Canvas + MediaRecorder API

### 2. Video Player Component

#### `src/services/studio/components/VideoPlayer.tsx`
**Estado actual:** Necesita análisis (probablemente reproduce un solo video)

**Necesita:**
- Reproducción secuencial de chapters
- Preload del siguiente chapter
- Progreso global (no por chapter)
- Transiciones suaves
- Autoplay del siguiente

**Acción:** 🔄 Refactor para player secuencial

### 3. Types & Interfaces

#### `src/services/studio/types.ts`
**Necesita actualización:**
- Agregar tipo `Chapter`
- Agregar tipo `ChapterDescriptor`
- Remover tipos relacionados con chunks
- Agregar metadata de free/paid

**Acción:** 🔄 Actualizar tipos

---

## 🟢 Código REUTILIZABLE (mantener)

### 1. Agents (Generación de Contenido)

Toda la carpeta `agents/` es **100% reutilizable**:

✅ **`orchestrator.ts`** - Coordinación del proceso  
✅ **`plannerAgent.ts`** - Ya genera chapters con LLM  
✅ **`sceneGenerator.ts`** - Generación de escenas  
✅ **`studioWriterAgent.ts`** - Escritura de scripts  
✅ **`researcherAgent.ts`** - Investigación  
✅ **`formatterAgent.ts`** - Formato de salida  
✅ **`writerAgent.ts`** - Escritura adicional  
✅ **`controller.ts`** - Control de flujo  

**Estos generan los chapters que necesitamos.** Solo output format puede necesitar ajustes menores.

### 2. Assets Management

✅ **`assetManager.ts`** - Gestión de imágenes, videos, audio  
✅ **`braveImageService.ts`** - Búsqueda de imágenes  
✅ **`videoAssetAgent.ts`** - Assets de video  

**Reutilizable al 100%.** Los assets se asignan a chapters en Input Manager.

### 3. Audio Services

✅ **`audioAssetAgent.ts`** - Gestión de audio  
✅ **`scriptNarrator.ts`** - Narración  
✅ **`ttsService.ts`** - OpenAI TTS  

**Reutilizable al 100%.** Cada chapter tiene su audio TTS independiente.

### 4. UI Components (parcialmente)

✅ **`SceneVisualizer.tsx`** - Puede adaptarse para visualizar chapters  
✅ **`StudioTopBar.tsx`** - Barra superior (sin cambios)  
✅ **`TimestampedScript.tsx`** - Script con timestamps (adaptable)  
🔄 **`VideoPlayer.tsx`** - Necesita refactor para secuencial

### 5. Configuration

✅ **`config.ts`** - Configuración general  
✅ **`index.ts`** - Export principal  

**Reutilizable con ajustes menores.**

---

## 📊 Métricas de Código

### Código a Eliminar:
- **2 archivos Netlify** (~14KB total)
- **2 archivos rendering/** (~700 líneas)
- **Total:** ~4 archivos, ~800 líneas

### Código a Refactor:
- **videoRenderer.ts** (100 líneas) → Reimplementar completo
- **VideoPlayer.tsx** (?) → Refactor para secuencial
- **types.ts** (?) → Actualizar tipos
- **Total:** ~3 archivos, estimado 300-500 líneas

### Código Reutilizable:
- **agents/** (13 archivos) ✅
- **assets/** (3 archivos) ✅
- **audio/** (3 archivos) ✅
- **components/** (3 archivos, 1 refactor) ✅
- **Total:** ~20 archivos, >90% reutilizable

---

## 🎯 Conclusión del Análisis

### ✅ Buenas Noticias:
1. **90% del código es reutilizable**
2. La generación de chapters por LLM ya existe
3. Assets, audio, y agents no cambian
4. Solo hay que reimplementar la capa de rendering

### ⚠️ Trabajo Requerido:
1. Eliminar 4 archivos (~800 líneas)
2. Crear nuevo `ChapterRenderer` (client-side)
3. Refactor `VideoPlayer` para secuencial
4. Actualizar tipos y configuración
5. **Estimado:** 2-3 días de desarrollo

### 🎬 Siguiente Paso:
Ver **Tarea 3: Diseño de Nueva Arquitectura**

---

**Siguiente documento:** `NEW_ARCHITECTURE.md`
