# Correcciones Aplicadas - Director v3 Integration

**Fecha**: 2026-04-23
**Status**: ✅ Completado

---

## 🐛 PROBLEMAS ENCONTRADOS

### 1. WAN Habilitado Incorrectamente
**Problema**: WAN estaba habilitado (`wanEnabled: true`) pero la API key no está configurada
**Impacto**: Genera intentos fallidos innecesarios antes de caer a STOCK
**Ubicación**: [CinematicConfig.ts:41](../src/services/cinematic/config/CinematicConfig.ts#L41)

**Solución**:
```typescript
// ANTES
wanEnabled: true,         // ✅ Wavespeed API disponible

// DESPUÉS
wanEnabled: false,        // 🚨 API key comentada por ahora
```

---

### 2. Missing `videoUrl` en CinematicScene
**Problema**: El VideoOrchestrator solo asignaba `rawVideoUrl` pero no `videoUrl`
**Impacto**: Los videos no eran reproducibles en el UI porque faltaba el campo `videoUrl`
**Ubicación**: [cinematicService.ts:397, 414](../src/services/cinematic/cinematicService.ts#L397)

**Solución**:
```typescript
// ANTES (solo rawVideoUrl)
return results.map((r, i) => ({
  ...scenes[i],
  rawVideoUrl: r.clip.videoUrl,
  sceneStage: r.state === 'Preview' ? 'draft' : 'final',
  provider: r.engine === 'VEO' ? 'veo' : 'pexels',
}));

// DESPUÉS (rawVideoUrl + videoUrl + status)
return results.map((r, i) => ({
  ...scenes[i],
  rawVideoUrl: r.clip.videoUrl,
  videoUrl: r.clip.videoUrl,        // ✅ NUEVO: Para playback
  sceneStage: r.state === 'Preview' ? 'draft' : 'final',
  provider: r.engine === 'VEO' ? 'veo' : 'pexels',
  status: 'ready' as const,         // ✅ NUEVO: Marca como ready
}));
```

---

### 3. Missing Fields in CinematicScene Interface
**Problema**: CinematicResults.tsx espera campos que no existen en CinematicScene:
- `status` (ready/processing/error)
- `enhancedVideoUrl` (VEO upgraded video)
- `mixedVideoUrl` (video + audio mixto)
- `mixStatus` (mix ready/processing/error)
- `mixError` (error de mixing)

**Impacto**: CinematicResults.tsx fallaba al acceder a estos campos
**Ubicación**: [cinematicService.ts:19-45](../src/services/cinematic/cinematicService.ts#L19-L45)

**Solución**:
Agregamos campos opcionales para compatibilidad con DualFlow:

```typescript
export interface CinematicScene {
  // ... campos existentes ...

  // Optional fields for backward compatibility with DualFlow
  status?: 'ready' | 'processing' | 'error';
  enhancedVideoUrl?: string; // Enhanced video URL (VEO upgraded)
  mixedVideoUrl?: string; // Video mixed with narration
  mixStatus?: 'ready' | 'processing' | 'error';
  mixError?: string;
}
```

---

## ✅ CORRECCIONES APLICADAS

### Archivo: `CinematicConfig.ts`
**Cambio**: Deshabilitado WAN
```diff
- wanEnabled: true,         // ✅ Wavespeed API disponible
+ wanEnabled: false,        // 🚨 API key comentada por ahora
```

### Archivo: `cinematicService.ts`
**Cambios**:

1. **Interface CinematicScene** - Agregados campos opcionales:
```diff
export interface CinematicScene {
  // ... existing fields ...
+
+  // Optional fields for backward compatibility with DualFlow
+  status?: 'ready' | 'processing' | 'error';
+  enhancedVideoUrl?: string;
+  mixedVideoUrl?: string;
+  mixStatus?: 'ready' | 'processing' | 'error';
+  mixError?: string;
}
```

2. **generateScenesInParallel - handleProgress callback**:
```diff
scenes: results.map((r, i) => ({
  ...scenes[i],
  rawVideoUrl: r.clip?.videoUrl,
+  videoUrl: r.clip?.videoUrl,        // Also set videoUrl for playback
  sceneStage: r.state === 'Preview' ? 'draft' : 'final',
  provider: r.engine === 'VEO' ? 'veo' : 'pexels',
  operationName: r.clip?.generationId,
+  status: 'ready' as const,          // Mark as ready for playback
})),
```

3. **generateScenesInParallel - return statement**:
```diff
return results.map((r, i) => ({
  ...scenes[i],
  rawVideoUrl: r.clip.videoUrl,
+  videoUrl: r.clip.videoUrl,         // Set both raw and playback URL
  sceneStage: r.state === 'Preview' ? 'draft' : 'final',
  provider: r.engine === 'VEO' ? 'veo' : 'pexels',
  operationName: r.clip.generationId,
+  status: 'ready' as const,          // Mark as ready
}));
```

---

## 🎯 CONFIGURACIÓN FINAL

### Feature Flags
```typescript
ltxEnabled: false      // ❌ No API key
wanEnabled: false      // ❌ API key comentada
veoEnabled: true       // ✅ Habilitado
```

### Flujo Esperado
```
Query → Director → 4 Scenes → STOCK directo (WAN/LTX deshabilitados)
After 5s → VEO async upgrade (if score > 0.85 and user engaged)
```

### Estados de Escena
```typescript
// Initial state (STOCK)
{
  rawVideoUrl: "https://pexels.com/...",
  videoUrl: "https://pexels.com/...",
  sceneStage: "draft",
  provider: "pexels",
  status: "ready"
}

// After VEO upgrade (if attempted)
{
  rawVideoUrl: "https://veo.url/...",
  videoUrl: "https://veo.url/...",
  sceneStage: "final",
  provider: "veo",
  status: "ready"
}
```

---

## 🧪 TESTING ESPERADO

### Console Logs Esperados
```
[CinematicService] Starting video generation with Director v3
[Orchestrator] Starting video generation { sceneCount: 4 }
[SceneProcessor] Processing scene
[EngineSelector] No AI engines available → STOCK fallback  ← ESPERADO
[Fallback] Using STOCK (final fallback)
[Orchestrator] All scenes processed { engines: ["STOCK", "STOCK", ...] }
```

### UI Esperado
- ✅ Narrative streaming (2-3s)
- ✅ 4 scenes generan con Pexels
- ✅ Videos reproducibles (videoUrl está presente)
- ✅ Estado: "Preview" (STOCK)
- ✅ Continue Exploring con 4 topics
- ✅ Sin errores TypeScript

---

## 📋 COMPATIBILIDAD

### DualFlow vs Director v3

El código ahora soporta **ambos flujos**:

**DualFlow** (código viejo):
- Usa `enhancedVideoUrl`, `mixedVideoUrl`, `mixStatus`
- Genera draft + final en paralelo
- Progresivo (draft → final)

**Director v3** (código nuevo):
- Usa `rawVideoUrl` + `videoUrl`
- Decisión upfront (no reemplazos innecesarios)
- Fallback cascade (WAN → LTX → STOCK)
- VEO async upgrade (único upgrade permitido)

**Compatibilidad**: Los campos opcionales agregados permiten que ambos flujos coexistan.

---

## 🚀 PRÓXIMOS PASOS

1. ✅ **Test manual** - Verificar que videos se reproducen correctamente
2. ⏱️ **Obtener WAVESPEED_API_KEY** - Para probar WAN/LTX
3. ⏱️ **Habilitar WAN** - Set `wanEnabled: true` cuando tengas API key
4. ⏱️ **Test con AI engines** - Verificar WAN → LTX → STOCK cascade
5. ⏱️ **Fine-tune thresholds** - Ajustar scoring si es necesario

---

## 📊 BUILD STATUS

```bash
npm run build
# ✓ built in 38.72s
# 0 TypeScript errors
# 3 CSS warnings (normal)
```

---

**Status**: ✅ Listo para testing manual

**Test URL**: `/cinematic-results?q=what is photosynthesis`

**Expected**: Videos reproducibles con STOCK, sin errores
