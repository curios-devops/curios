# Dual Workflow Implementation - CinematicAI

## 📋 Overview

Implementación completa del sistema de generación progresiva de videos con dos flujos paralelos:

- **FLOW A (Fast Render)**: Videos draft rápidos para playback inmediato
- **FLOW B (Quality Upgrade)**: Videos finales de alta calidad generados en paralelo

**Objetivo**: Primera escena lista en < 3 segundos, mejora progresiva sin interrumpir playback.

---

## 🏗️ Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────────┐
│                    CinematicResults.tsx                      │
│  - Estado dual flow                                          │
│  - Callback onSceneReady                                     │
│  - Actualización progresiva UI                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 cinematicService.ts                          │
│  - generateScenesDualFlow()                                  │
│  - Conversión CinematicScene ↔ DualSceneState                │
│  - Wrapper de callbacks                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              DualFlowProvider.ts (NEW)                       │
│                                                              │
│  ┌──────────────────┐        ┌──────────────────┐           │
│  │   FLOW A (Fast)  │        │  FLOW B (Quality) │           │
│  ├──────────────────┤        ├──────────────────┤           │
│  │ • Pexels videos  │        │ • VEO videos      │           │
│  │ • 1 seg delay    │        │ • 6 seg delay     │           │
│  │ • Sequential 1→4 │        │ • Reverse 4→1     │           │
│  │ • Max 2 jobs     │        │ • Max 2 jobs      │           │
│  └──────────────────┘        └──────────────────┘           │
│           │                           │                      │
│           └───────────┬───────────────┘                      │
│                       ▼                                      │
│              onSceneReady callback                           │
│          (notify UI de scene ready)                          │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           SequentialVideoPlayer.tsx (UPDATED)                │
│  - Progressive swap: draft → final                           │
│  - Quality badges (Draft/Final)                              │
│  - Auto-reload cuando final está listo                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Archivos Creados/Modificados

### ✅ Nuevos Archivos

1. **`src/services/cinematic/providers/DualFlowProvider.ts`**
   - Core del dual workflow
   - Gestiona FLOW A (Fast) y FLOW B (Quality) en paralelo
   - Rate limiting y concurrencia
   - Callbacks para notificar UI

2. **`src/services/cinematic/providers/LTXProvider.ts`**
   - Placeholder para modelo LTX (no implementado)
   - Preparado para agregar cuando esté disponible

### ✅ Archivos Modificados

1. **`src/services/cinematic/types.ts`**
   ```typescript
   // Nuevos tipos agregados:
   - VideoQuality = 'draft' | 'final'
   - VideoProvider = 'ltx' | 'pexels' | 'veo'
   - DualSceneStatus
   - DualSceneState (track draft + final por escena)
   - OnSceneReadyCallback
   ```

2. **`src/services/cinematic/cinematicService.ts`**
   ```typescript
   // Nuevas funciones:
   - generateScenesDualFlow() // Core dual workflow

   // Modificado:
   - generateCinematicExperience()
     - Nuevo param: useDualFlow?: boolean
     - Nuevo param: onSceneReady?: OnSceneReadyCallback
     - Branch logic: dual flow vs legacy
   ```

3. **`src/components/cinematic/SequentialVideoPlayer.tsx`**
   ```typescript
   // Nuevos campos en VideoClip:
   - draftUrl?: string
   - finalUrl?: string
   - currentQuality?: 'draft' | 'final'
   - isUpgrading?: boolean

   // Nuevas features:
   - Progressive swap (draft → final)
   - Quality badges UI
   - Auto-upgrade when final ready
   ```

4. **`src/services/cinematic/pages/CinematicResults.tsx`**
   ```typescript
   // Nuevo estado:
   - dualSceneStates: Map<number, DualSceneState>

   // Modificado:
   - load() ahora usa useDualFlow: true
   - onSceneReady callback para actualizar UI
   - SequentialVideoPlayer recibe dual flow data
   ```

---

## 🔄 Flujo de Ejecución

### 1. **Usuario hace query**
```
CinematicResults.tsx → load()
  ├─ useDualFlow: true
  └─ onSceneReady callback
```

### 2. **FLOW A (Fast) inicia**
```
DualFlowProvider.runFastFlow()
  ├─ Scene 1: Pexels (0 seg delay)
  │  └─ onSceneReady(0, 'draft', url) → UI actualiza ⚡
  ├─ Wait 1 seg
  ├─ Scene 2: Pexels
  │  └─ onSceneReady(1, 'draft', url) → UI actualiza
  ├─ Wait 1 seg
  ├─ Scene 3: Pexels
  └─ Scene 4: Pexels
```

**Resultado**: Primera escena lista en ~2-3 segundos → **Playback inmediato** ⚡

### 3. **FLOW B (Quality) en paralelo**
```
DualFlowProvider.runQualityFlow() (REVERSE ORDER)
  ├─ Scene 4: VEO (0 seg delay)
  │  └─ onSceneReady(3, 'final', url) → Swap escena 4
  ├─ Wait 6 seg
  ├─ Scene 3: VEO
  │  └─ onSceneReady(2, 'final', url) → Swap escena 3
  ├─ Wait 6 seg
  ├─ Scene 2: VEO
  │  └─ onSceneReady(1, 'final', url) → Swap escena 2
  ├─ Wait 6 seg
  └─ Scene 1: VEO
     └─ onSceneReady(0, 'final', url) → Swap escena 1
```

**Resultado**: Videos se mejoran progresivamente mientras usuario ve draft

### 4. **SequentialVideoPlayer hace progressive swap**
```typescript
useEffect(() => {
  // Detecta cuando finalUrl está disponible
  if (currentClip.finalUrl && activeVideoUrl !== currentClip.finalUrl) {
    // Guarda posición actual
    const currentTime = video.currentTime;

    // Swap a final video
    setActiveVideoUrl(currentClip.finalUrl);

    // Resume desde misma posición
    video.currentTime = currentTime;
    video.play();
  }
}, [currentClip?.finalUrl]);
```

---

## 🎯 Reglas de Oro Implementadas

✅ **1. Nunca bloquear esperando calidad**
   - FLOW A y FLOW B corren en paralelo
   - Playback inicia con draft inmediatamente

✅ **2. Siempre mostrar algo rápido**
   - Primera escena lista en < 3 seg (Pexels)
   - Fallback a Pexels si VEO falla

✅ **3. El primer segundo importa más que el último**
   - FLOW A: Sequential 1→2→3→4
   - FLOW B: Reverse 4→3→2→1 (escena 1 mejora al final)

✅ **4. Solo mejorar lo que aporta valor visual**
   - Swap draft → final sin interrumpir playback
   - Badge visual indica upgrade

✅ **5. El sistema debe degradar bien**
   - Si VEO falla, queda Pexels draft
   - No rompe experiencia de usuario

---

## 🚀 Cómo Usar

### Activar Dual Flow

En `CinematicResults.tsx`:

```typescript
const result = await generateCompleteCinematicVideo(query, {
  aspectRatio,
  userId: session?.user?.id,
  useDualFlow: true, // ← ACTIVAR DUAL FLOW
  onSceneReady: (sceneIndex, quality, videoUrl, sceneState) => {
    // Callback cuando escena está lista
    console.log(`Scene ${sceneIndex} ready (${quality})`);
  },
});
```

### Desactivar Dual Flow (usar legacy)

```typescript
const result = await generateCompleteCinematicVideo(query, {
  aspectRatio,
  userId: session?.user?.id,
  useDualFlow: false, // ← LEGACY MODE
});
```

---

## 📊 Métricas Esperadas

### FLOW A (Fast Render)
- ⏱️ **Primera escena**: < 3 segundos
- ⏱️ **4 escenas completas**: ~6-8 segundos
- 📦 **Provider**: Pexels (stock videos)
- 🎨 **Calidad**: Draft (suficiente para preview)

### FLOW B (Quality Upgrade)
- ⏱️ **Primera escena (4ta)**: ~30-60 segundos
- ⏱️ **4 escenas completas**: ~3-4 minutos
- 📦 **Provider**: VEO (Google Vertex AI)
- 🎨 **Calidad**: Final (alta calidad)

### User Experience
- ⚡ **Time to first frame**: < 3 segundos
- 🎬 **Playback start**: Inmediato (apenas scene 1 draft ready)
- ✨ **Progressive upgrade**: Sin interrupciones
- 💚 **Fallback graceful**: Draft queda si VEO falla

---

## 🐛 Debugging

### Logs Importantes

```javascript
// DualFlowProvider
[DualFlow] Starting dual workflow generation
[DualFlow] FLOW A (Fast) started
[DualFlow] FLOW A - Draft ready (sceneIndex: 0, provider: pexels)
[DualFlow] FLOW B (Quality) started
[DualFlow] FLOW B - Final quality ready (sceneIndex: 3)

// SequentialVideoPlayer
[SequentialVideoPlayer] Upgrading to final quality (sceneIndex: 2, from: draft, to: final)

// CinematicResults
[CinematicResults] Scene ready for playback (sceneIndex: 0, quality: draft)
[CinematicResults] Scene ready for playback (sceneIndex: 3, quality: final)
```

### Chrome DevTools

1. **Network tab**: Ver requests a Pexels y VEO
2. **Console**: Ver logs de progressive swap
3. **React DevTools**: Ver estado `dualSceneStates`

---

## 🔧 Configuración

### Rate Limits

En `DualFlowProvider.ts`:

```typescript
private readonly FAST_DELAY_MS = 1000;     // Pexels: 1 seg
private readonly QUALITY_DELAY_MS = 6000;  // VEO: 6 seg
```

### Concurrencia

```typescript
private readonly MAX_FAST_CONCURRENT = 2;     // FLOW A
private readonly MAX_QUALITY_CONCURRENT = 2;  // FLOW B
```

### Timeouts

```typescript
private readonly FAST_TIMEOUT_MS = 10000;      // 10 seg (Pexels)
private readonly QUALITY_TIMEOUT_MS = 120000;  // 2 min (VEO)
```

---

## 🎨 UI Features

### Quality Badges

**Draft Badge** (amarillo, pulsante):
```tsx
<div className="bg-yellow-500/90">
  <span>Draft (Upgrading...)</span>
</div>
```

**Final Badge** (verde, con check):
```tsx
<div className="bg-green-500/90">
  <svg>✓</svg>
  <span>Final Quality</span>
</div>
```

---

## 📝 Próximos Pasos

### Implementar LTX (cuando esté disponible)

1. Agregar API keys en env:
   ```bash
   VITE_LTX_API_KEY=xxx
   VITE_LTX_API_URL=xxx
   ```

2. Implementar `LTXProvider.ts`:
   ```typescript
   async generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
     // Llamar API de LTX
     // Target: < 2 segundos por escena
   }
   ```

3. DualFlowProvider automáticamente usará LTX si `isAvailable()` es true

### Optimizaciones Futuras

- [ ] Preload de escenas siguientes
- [ ] Cache de videos Pexels
- [ ] Compression de videos antes de swap
- [ ] Analytics de tiempo de swap
- [ ] A/B testing: dual flow vs legacy

---

## ✅ Status

**Estado**: ✅ **Implementado y Funcional**

**Modo actual**: Dual Flow activado por defecto en producción

**Testing**: Pendiente testing end-to-end en producción

---

**Fecha**: 2026-04-17
**Autor**: Claude Code
**Versión**: 1.0
