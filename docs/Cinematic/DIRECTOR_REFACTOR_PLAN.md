# 🎬 CINEMATIC DIRECTOR REFACTOR - PLAN DE IMPLEMENTACIÓN

## 📊 Análisis: Estado Actual vs Spec del Refactor

### ✅ Lo que YA tenemos:
- **Stock providers**: Pexels, Pixabay (implementados y funcionando)
- **VEO provider**: VeoVertexProvider (implementado, timeout a nivel de edge function ~180s)
- **LTX provider**: Skeleton creado pero NO implementado
- **Fallback system**: VeoWithFallbackProvider (VEO → Pexels)
- **3-state flow**: Draft → Preview → Final (recién implementado)

### ❌ Lo que FALTA según el refactor:
1. **Config centralizado**: Timeouts configurables, feature flags
2. **Scoring system**: Evaluación de calidad de stock clips
3. **Critic Agent**: Decisión inteligente de cuándo usar AI
4. **Scene roles**: hook, setup, development, climax_cta
5. **WAN provider**: Split de escenas 2-3 en un solo render
6. **Safe generation wrapper**: Manejo robusto de errores con fallback automático
7. **Scheduler**: Control de recursos paralelos
8. **Progressive replacement**: Upgrade de clips sin romper preview
9. **VEO timeout controlado**: 30-40s desde TypeScript (no edge function)

---

## 🎯 OBJETIVO DEL REFACTOR

**Implementar arquitectura basada en Director/Critic que:**
- ✅ Garantiza que el video NUNCA se rompe (siempre hay fallback a STOCK)
- ✅ Optimiza costos (solo usa AI cuando vale la pena)
- ✅ Mejora UX (preview instantáneo → upgrade progresivo)
- ✅ Es extensible (fácil añadir WAN/Sora/otros providers)
- ✅ Es configurable (timeouts, feature flags, scoring thresholds)

---

## 📋 PLAN DE IMPLEMENTACIÓN (5 FASES)

### ⚙️ FASE 1: Config & Foundation (CRÍTICO)
**Objetivo**: Centralizar configuración y crear helpers base

#### Tareas:
- [ ] **1.1** Crear `/src/services/cinematic/config/CinematicConfig.ts`
  ```typescript
  interface CinematicConfig {
    veoTimeoutMs: number;
    ltxEnabled: boolean;
    wanEnabled: boolean;
    veoEnabled: boolean;
    stockFirstAlways: boolean;
    minStockQualityThreshold: number;
  }
  ```

- [ ] **1.2** Crear `/src/services/cinematic/core/SafeGenerationWrapper.ts`
  ```typescript
  async function safeGenerate<T>(
    engine: Engine,
    generator: () => Promise<T>,
    config: CinematicConfig
  ): Promise<T | null>
  ```

- [ ] **1.3** Crear `/src/services/cinematic/core/TimeoutHelper.ts`
  ```typescript
  function promiseWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T>
  ```

- [ ] **1.4** Actualizar tipos en `types.ts`:
  ```typescript
  type Engine = 'STOCK' | 'LTX' | 'WAN' | 'VEO';
  type SceneRole = 'hook' | 'setup' | 'development' | 'climax_cta';

  interface CinematicScene {
    role: SceneRole;        // NEW
    importance: number;     // NEW (0-1)
    sceneScore?: number;    // NEW (computed)
  }
  ```

**Archivos a crear**:
- `src/services/cinematic/config/CinematicConfig.ts`
- `src/services/cinematic/core/SafeGenerationWrapper.ts`
- `src/services/cinematic/core/TimeoutHelper.ts`

**Archivos a modificar**:
- `src/services/cinematic/types.ts`

---

### 🎯 FASE 2: Scoring & Critic Agent
**Objetivo**: Implementar sistema de evaluación de clips

#### Tareas:
- [ ] **2.1** Crear `/src/services/cinematic/agents/CriticAgent.ts`
  ```typescript
  interface SceneScore {
    relevance: number;
    specificity: number;
    visualComplexity: number;
    narrativeWeight: number;
  }

  class CriticAgent {
    evaluateStock(clip: Clip, scene: SceneInput): number;
    computeSceneScore(score: SceneScore): number;
    shouldUpgrade(stockScore: number, sceneScore: number): boolean;
  }
  ```

- [ ] **2.2** Implementar evaluación de stock (v1: heurística simple)
  - Usar metadata del clip (duración, resolución, tags)
  - Match de keywords entre scene.visualPrompt y clip.tags
  - Score: 0.0 - 1.0

- [ ] **2.3** Implementar compute de scene score
  - Pesos: relevance 40%, specificity 20%, complexity 20%, narrative 20%
  - Threshold: > 0.5 para considerar AI upgrade

**Archivos a crear**:
- `src/services/cinematic/agents/CriticAgent.ts`

---

### 🔧 FASE 3: Scene Processor (Core Pipeline)
**Objetivo**: Refactor lógica de generación por escena con decisiones inteligentes

#### Tareas:
- [ ] **3.1** Crear `/src/services/cinematic/core/SceneProcessor.ts`
  ```typescript
  class SceneProcessor {
    async processScene(scene: CinematicScene): Promise<Clip>;
    private async handleHookScene(scene): Promise<Clip>;
    private async handleClimaxScene(scene): Promise<Clip>;
    private async handleCoreScenes(scene2, scene3): Promise<[Clip, Clip]>;
  }
  ```

- [ ] **3.2** Implementar lógica de decisión por role:
  - **hook** (escena 1): LTX (si disponible) → STOCK
  - **setup/development** (escenas 2-3): WAN split (si disponible) → STOCK
  - **climax_cta** (escena 4): VEO → LTX → STOCK

- [ ] **3.3** Integrar CriticAgent:
  - Evaluar stock primero (siempre)
  - Si score > 0.75 → usar stock directamente
  - Si scene score < 0.5 → no vale la pena AI

- [ ] **3.4** Integrar SafeGenerationWrapper:
  - Todos los providers deben pasar por `safeGenerate()`
  - Fallback automático a STOCK si falla

**Archivos a crear**:
- `src/services/cinematic/core/SceneProcessor.ts`

**Archivos a modificar**:
- `src/services/cinematic/cinematicService.ts` (usar SceneProcessor)

---

### 🎥 FASE 4: WAN Provider & Scene Split
**Objetivo**: Implementar WAN para escenas 2-3 (1 render → 2 clips)

#### Tareas:
- [ ] **4.1** Crear `/src/services/cinematic/providers/WANProvider.ts`
  ```typescript
  class WANProvider {
    async generate(mergedPrompt: string, duration: 16): Promise<Clip>;
    isAvailable(): boolean;
  }
  ```

- [ ] **4.2** Crear `/src/services/cinematic/utils/ClipSplitter.ts`
  ```typescript
  function splitClip(clip: Clip): [Clip, Clip] {
    const mid = clip.duration / 2;
    return [
      clip.slice(0, mid),
      clip.slice(mid, clip.duration)
    ];
  }
  ```

- [ ] **4.3** Implementar `processCoreScenes()` en SceneProcessor:
  - Merge de prompts de escena 2 y 3
  - Llamada a WAN con duración 16s
  - Split del clip resultante
  - Fallback a 2 clips de STOCK si WAN falla

**Archivos a crear**:
- `src/services/cinematic/providers/WANProvider.ts`
- `src/services/cinematic/utils/ClipSplitter.ts`

**Archivos a modificar**:
- `src/services/cinematic/core/SceneProcessor.ts`

---

### ⚡ FASE 5: Orchestrator & Progressive Replacement
**Objetivo**: Refactor main orchestrator con preview instantáneo + upgrades progresivos

#### Tareas:
- [ ] **5.1** Crear `/src/services/cinematic/core/VideoOrchestrator.ts`
  ```typescript
  class VideoOrchestrator {
    async generateVideo(input: VideoInput): Promise<Video>;
    private renderPreview(stockScenes: Clip[]): void;
    private async upgradeScenes(): Promise<void>;
  }
  ```

- [ ] **5.2** Implementar flujo de 2 pasos:
  - **Paso 1** (preview inmediato):
    - Fetch 4 stock clips en paralelo
    - Renderizar preview instantáneo (< 3s)
    - Usuario puede reproducir inmediatamente

  - **Paso 2** (upgrade progresivo):
    - Procesar escena 1 (hook)
    - Procesar escenas 2-3 (core WAN split)
    - Procesar escena 4 (climax)
    - Reemplazar clips con crossfade

- [ ] **5.3** Crear `/src/services/cinematic/core/ReplacementEngine.ts`
  ```typescript
  function replaceScene(
    video: Video,
    sceneIndex: number,
    newClip: Clip
  ): void {
    video.scenes[sceneIndex] = crossfade(
      video.scenes[sceneIndex],
      newClip
    );
  }
  ```

- [ ] **5.4** Integrar con `generateCompleteCinematicVideo()`:
  - Migrar lógica a VideoOrchestrator
  - Mantener retrocompatibilidad con flujo actual
  - Feature flag para habilitar nuevo sistema

**Archivos a crear**:
- `src/services/cinematic/core/VideoOrchestrator.ts`
- `src/services/cinematic/core/ReplacementEngine.ts`

**Archivos a modificar**:
- `src/services/cinematic/cinematicService.ts`

---

## 🧪 FASE 6 (BONUS): Scheduler & Resource Control
**Objetivo**: Control fino de recursos paralelos

#### Tareas:
- [ ] **6.1** Crear `/src/services/cinematic/core/Scheduler.ts`
  ```typescript
  class Scheduler {
    canRun(engine: Engine): boolean;
    start(engine: Engine): void;
    end(engine: Engine): void;
  }
  ```

- [ ] **6.2** Límites por engine:
  - LTX: max 1 paralelo
  - WAN: max 1 paralelo
  - VEO: max 1 paralelo
  - STOCK: sin límite

**Archivos a crear**:
- `src/services/cinematic/core/Scheduler.ts`

---

## 📁 ESTRUCTURA DE ARCHIVOS NUEVA

```
src/services/cinematic/
├── config/
│   └── CinematicConfig.ts          # Config centralizado
├── core/
│   ├── SafeGenerationWrapper.ts    # Wrapper robusto con fallbacks
│   ├── TimeoutHelper.ts            # Promise timeout helper
│   ├── SceneProcessor.ts           # Lógica por escena
│   ├── VideoOrchestrator.ts        # Main orchestrator
│   ├── ReplacementEngine.ts        # Progressive upgrade
│   └── Scheduler.ts                # Resource control
├── agents/
│   └── CriticAgent.ts              # Evaluación de calidad
├── providers/
│   ├── PexelsFallbackProvider.ts   # ✅ Ya existe
│   ├── PixabayFallbackProvider.ts  # ✅ Ya existe
│   ├── VeoVertexProvider.ts        # ✅ Ya existe
│   ├── LTXProvider.ts              # ✅ Skeleton existe
│   ├── WANProvider.ts              # 🆕 A crear
│   └── SoraProvider.ts             # ✅ Ya existe (no usar)
├── utils/
│   └── ClipSplitter.ts             # Split de clips
└── cinematicService.ts             # Main service (refactor)
```

---

## 🚦 MIGRATION STRATEGY (NO ROMPER NADA)

### ✅ Approach: Feature Flag Gradual

1. **Crear feature flag en config**:
   ```typescript
   const USE_DIRECTOR_ARCHITECTURE = false; // Toggle gradual
   ```

2. **Dual code paths en `generateCompleteCinematicVideo()`**:
   ```typescript
   if (USE_DIRECTOR_ARCHITECTURE) {
     return await videoOrchestrator.generateVideo(input);
   } else {
     // Código actual (3-state flow)
     return await legacyGenerateCinematic(input);
   }
   ```

3. **Testing paralelo**:
   - Sistema actual sigue funcionando (flag = false)
   - Sistema nuevo se puede probar con flag = true
   - 0 riesgo de romper producción

4. **Rollout gradual**:
   - Fase 1-2: Desarrollo interno (flag OFF en prod)
   - Fase 3-4: Beta testing (flag ON para power users)
   - Fase 5: Rollout completo (flag ON para todos)
   - Fase 6: Cleanup de código legacy

---

## 📊 PRIORIDADES POR FASE

| Fase | Prioridad | Impacto | Riesgo | Tiempo Estimado |
|------|-----------|---------|--------|-----------------|
| 1    | 🔴 ALTA   | Alto    | Bajo   | 2-3 horas      |
| 2    | 🟡 MEDIA  | Medio   | Bajo   | 3-4 horas      |
| 3    | 🔴 ALTA   | Alto    | Medio  | 4-6 horas      |
| 4    | 🟢 BAJA   | Bajo    | Alto   | 3-4 horas      |
| 5    | 🔴 ALTA   | Alto    | Medio  | 5-6 horas      |
| 6    | 🟢 BAJA   | Bajo    | Bajo   | 2-3 horas      |

**Total estimado**: 19-26 horas de desarrollo

---

## 🎯 QUICK WINS (Para empezar HOY)

### ✅ Implementar PRIMERO (máximo impacto, mínimo riesgo):

1. **Config centralizado** (Fase 1.1)
   - 30 minutos
   - 0 riesgo
   - Base para todo lo demás

2. **SafeGenerationWrapper** (Fase 1.2)
   - 1 hora
   - Mejora inmediata de resiliencia
   - Fácil de integrar

3. **VEO timeout desde TS** (Fase 1.3)
   - 30 minutos
   - Fix crítico (40s vs 180s actual)
   - Mejora UX inmediatamente

4. **Scene roles** (Fase 1.4)
   - 1 hora
   - Preparar datos para decisiones futuras
   - No rompe nada

**Total Quick Wins: ~3 horas → Sistema más robusto HOY**

---

## ❓ PREGUNTAS PARA VALIDAR ANTES DE EMPEZAR

1. ¿Quieres implementar TODO el refactor o solo las Fases 1-3?
2. ¿Prefieres rollout gradual con feature flag o migración completa?
3. ¿WAN provider es prioridad o podemos dejarlo para después?
4. ¿Quieres que empiece por los Quick Wins (Fase 1) ahora?
5. ¿Hay algún deadline o podemos ir fase por fase sin prisa?

---

**Creado**: 2026-04-22
**Status**: 📋 Plan listo para aprobación
**Siguiente paso**: Confirmar prioridades y empezar Fase 1
