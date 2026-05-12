# 🎬 CINEMATIC DIRECTOR REFACTOR v3 - PLAN ACTUALIZADO

**Basado en**: Cinematic_arquitecture_v3.md
**Scope**: SOLO generación de video (NO mezcla, narrativa, ni Supabase)
**Strategy**: Refactor directo (sin dual code path - no hay producción)

---

## 📐 PRINCIPIOS DE LA ARQUITECTURA v3

### ✅ Reglas Fundamentales:

1. **Duración fija**: STOCK = LTX = WAN = VEO (nunca cambia duración, solo motor)
2. **No reemplazo innecesario**: Decisión upfront → solo UN motor base
3. **Única excepción VEO**: Único upgrade async (si usuario engaged)
4. **Fallback en cascada**: VEO → WAN → LTX → STOCK (siempre hay resultado)

### 🎯 Estados UX (Perceptual Rendering):

```typescript
type VideoState = "Preview" | "Draft" | "Enhanced" | "Quality";

const ENGINE_TO_STATE = {
  STOCK: "Preview",   // t=0s   - Inmediato
  LTX: "Draft",       // t=1-5s - Rápido
  WAN: "Enhanced",    // t=1-5s - Upfront decision
  VEO: "Quality"      // t=20-40s - Async upgrade
};
```

---

## 🔄 CAMBIOS CLAVE vs Plan Anterior

| Anterior | v3 | Razón |
|----------|-----|-------|
| WAN split 2-3 escenas | WAN = 1 escena = 1 clip | Simplificación |
| Scene roles (hook/climax) | Decisión basada en score | Genérico |
| Reemplazo progresivo | Solo VEO upgrade | No sobre-generación |
| Dual code path | Refactor directo | No hay producción |
| 6 fases | 4 fases | Más directo |

---

## 📋 PLAN DE IMPLEMENTACIÓN (4 FASES)

### ⚙️ FASE 1: Config & Core Infrastructure
**Objetivo**: Base del sistema con decisiones upfront

#### 1.1 Crear Config Centralizado
**Archivo**: `src/services/cinematic/config/CinematicConfig.ts`

```typescript
export type Engine = 'STOCK' | 'LTX' | 'WAN' | 'VEO';
export type VideoState = 'Preview' | 'Draft' | 'Enhanced' | 'Quality';

export interface CinematicConfig {
  // Timeouts
  veoTimeoutMs: number;

  // Feature flags
  ltxEnabled: boolean;
  wanEnabled: boolean;
  veoEnabled: boolean;

  // VEO triggers
  engagementThresholdMs: number;

  // Scoring thresholds
  stockPassThreshold: number;      // > 0.8 → usar STOCK directo
  wanScoreThreshold: number;       // > 0.7 → usar WAN
  ltxScoreThreshold: number;       // > 0.4 → usar LTX
  veoUpgradeThreshold: number;     // > 0.85 → intentar VEO async
}

export const DEFAULT_CONFIG: CinematicConfig = {
  veoTimeoutMs: 35000,
  engagementThresholdMs: 5000,

  ltxEnabled: false,  // 🚨 API no conectada
  wanEnabled: false,  // 🚨 API no conectada
  veoEnabled: true,

  stockPassThreshold: 0.8,
  wanScoreThreshold: 0.7,
  ltxScoreThreshold: 0.4,
  veoUpgradeThreshold: 0.85,
};

export const ENGINE_TO_STATE: Record<Engine, VideoState> = {
  STOCK: 'Preview',
  LTX: 'Draft',
  WAN: 'Enhanced',
  VEO: 'Quality',
};
```

**Archivos a crear**:
- `src/services/cinematic/config/CinematicConfig.ts`

---

#### 1.2 Crear Safe Generation Wrapper
**Archivo**: `src/services/cinematic/core/SafeGenerationWrapper.ts`

```typescript
import { Engine } from '../config/CinematicConfig';
import { logger } from '../../../utils/logger';

export async function safeGenerate<T>(
  engine: Engine,
  generator: () => Promise<T>,
  enabled: boolean
): Promise<T | null> {
  if (!enabled) {
    logger.info(`[SafeGen] ${engine} disabled, skipping`);
    return null;
  }

  try {
    return await generator();
  } catch (error) {
    logger.warn(`[SafeGen] ${engine} failed → fallback`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
```

**Archivos a crear**:
- `src/services/cinematic/core/SafeGenerationWrapper.ts`

---

#### 1.3 Crear Timeout Helper
**Archivo**: `src/services/cinematic/core/TimeoutHelper.ts`

```typescript
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
```

**Archivos a crear**:
- `src/services/cinematic/core/TimeoutHelper.ts`

---

#### 1.4 Actualizar Types
**Archivo**: `src/services/cinematic/types.ts`

```typescript
// Añadir a types existentes:

export interface SceneScore {
  relevance: number;        // Match con stock clip
  specificity: number;      // Qué tan específico es el prompt
  visualComplexity: number; // Complejidad visual requerida
  narrativeWeight: number;  // Importancia en la historia
}

export interface GenerationResult {
  clip: VideoGenerationResult;
  engine: Engine;
  state: VideoState;
  score?: number;
}
```

**Archivos a modificar**:
- `src/services/cinematic/types.ts` (añadir interfaces, no tocar lo demás)

---

### 🎯 FASE 2: Scoring & Engine Selection
**Objetivo**: Decisión inteligente upfront (qué motor usar)

#### 2.1 Crear Critic Agent
**Archivo**: `src/services/cinematic/agents/CriticAgent.ts`

```typescript
import { SceneScore } from '../types';
import { logger } from '../../../utils/logger';

export class CriticAgent {
  /**
   * Evalúa calidad de un stock clip (v1: heurística simple)
   */
  evaluateStock(
    clip: { url: string; tags?: string[]; duration: number },
    prompt: string
  ): number {
    // v1: Heurística simple
    // TODO v2: Usar CLIP embeddings

    const promptLower = prompt.toLowerCase();
    const tags = clip.tags?.map(t => t.toLowerCase()) || [];

    // Count keyword matches
    const keywords = promptLower.split(/\s+/).filter(w => w.length > 3);
    const matches = keywords.filter(kw =>
      tags.some(tag => tag.includes(kw) || kw.includes(tag))
    );

    const matchRatio = keywords.length > 0
      ? matches.length / keywords.length
      : 0;

    // Bonus for good duration (6-10s ideal)
    const durationScore = clip.duration >= 6 && clip.duration <= 10 ? 0.2 : 0;

    return Math.min(matchRatio + durationScore, 1.0);
  }

  /**
   * Computa score compuesto de la escena
   */
  computeSceneScore(scores: SceneScore): number {
    return (
      scores.relevance * 0.4 +
      scores.specificity * 0.2 +
      scores.visualComplexity * 0.2 +
      scores.narrativeWeight * 0.2
    );
  }

  /**
   * Calcula specificity del prompt (qué tan detallado)
   */
  calculateSpecificity(prompt: string): number {
    const words = prompt.split(/\s+/);
    const detailWords = words.filter(w =>
      w.length > 5 || /ing$|ed$/.test(w)
    );

    return Math.min(detailWords.length / Math.max(words.length, 1), 1.0);
  }

  /**
   * Calcula complejidad visual del prompt
   */
  calculateVisualComplexity(prompt: string): number {
    const complexityKeywords = [
      'cinematic', 'dynamic', 'motion', 'moving', 'flying',
      'drone', 'aerial', 'tracking', 'zoom', 'pan'
    ];

    const promptLower = prompt.toLowerCase();
    const matches = complexityKeywords.filter(kw => promptLower.includes(kw));

    return Math.min(matches.length / 3, 1.0); // Máx 3 keywords = 1.0
  }
}
```

**Archivos a crear**:
- `src/services/cinematic/agents/CriticAgent.ts`

---

#### 2.2 Crear Engine Selector
**Archivo**: `src/services/cinematic/core/EngineSelector.ts`

```typescript
import { Engine, CinematicConfig } from '../config/CinematicConfig';
import { logger } from '../../../utils/logger';

export class EngineSelector {
  constructor(private config: CinematicConfig) {}

  /**
   * Selecciona el motor base upfront (decisión única)
   */
  selectBaseEngine(stockScore: number, sceneScore: number): Engine {
    logger.debug('[EngineSelector] Selecting base engine', {
      stockScore,
      sceneScore,
    });

    // ✅ CASO 1: STOCK suficiente → usar directo
    if (stockScore > this.config.stockPassThreshold) {
      logger.info('[EngineSelector] STOCK quality sufficient → final');
      return 'STOCK';
    }

    // 🚨 CASO 2: No hay APIs disponibles → STOCK fallback
    if (!this.config.ltxEnabled && !this.config.wanEnabled) {
      logger.info('[EngineSelector] No AI engines available → STOCK fallback');
      return 'STOCK';
    }

    // 🧠 CASO 3: Decisión por score
    if (sceneScore > this.config.wanScoreThreshold && this.config.wanEnabled) {
      logger.info('[EngineSelector] High score → WAN selected');
      return 'WAN';
    }

    if (sceneScore > this.config.ltxScoreThreshold && this.config.ltxEnabled) {
      logger.info('[EngineSelector] Medium score → LTX selected');
      return 'LTX';
    }

    // 🟢 CASO 4: Default → STOCK
    logger.info('[EngineSelector] Low score → STOCK fallback');
    return 'STOCK';
  }

  /**
   * Decide si debe intentar VEO async upgrade
   */
  shouldAttemptVeoUpgrade(sceneScore: number, userEngaged: boolean): boolean {
    if (!this.config.veoEnabled) return false;
    if (sceneScore < this.config.veoUpgradeThreshold) return false;
    if (!userEngaged) return false;

    return true;
  }
}
```

**Archivos a crear**:
- `src/services/cinematic/core/EngineSelector.ts`

---

### 🔧 FASE 3: Scene Processor (Core Pipeline)
**Objetivo**: Pipeline de generación con fallback en cascada

#### 3.1 Crear Fallback Chain
**Archivo**: `src/services/cinematic/core/FallbackChain.ts`

```typescript
import { Engine } from '../config/CinematicConfig';
import { VideoGenerationRequest, VideoGenerationResult } from '../types';
import { safeGenerate } from './SafeGenerationWrapper';
import { logger } from '../../../utils/logger';

export class FallbackChain {
  constructor(
    private providers: {
      wan: any;
      ltx: any;
      pexels: any;
    },
    private config: any
  ) {}

  /**
   * Genera con fallback en cascada: WAN → LTX → STOCK
   */
  async generateWithFallback(
    request: VideoGenerationRequest,
    baseEngine: Engine
  ): Promise<{ clip: VideoGenerationResult; engine: Engine }> {
    let engine = baseEngine;

    // 🔵 VEO nunca es base engine (solo async upgrade)
    if (engine === 'VEO') {
      engine = 'WAN';
      logger.info('[Fallback] VEO as base → downgrade to WAN');
    }

    // 🟡 Intentar WAN
    if (engine === 'WAN') {
      const wan = await safeGenerate(
        'WAN',
        () => this.providers.wan.generate(request),
        this.config.wanEnabled
      );

      if (wan) {
        logger.info('[Fallback] WAN succeeded');
        return { clip: wan, engine: 'WAN' };
      }

      logger.warn('[Fallback] WAN failed → trying LTX');
      engine = 'LTX';
    }

    // 🟡 Intentar LTX
    if (engine === 'LTX') {
      const ltx = await safeGenerate(
        'LTX',
        () => this.providers.ltx.generate(request),
        this.config.ltxEnabled
      );

      if (ltx) {
        logger.info('[Fallback] LTX succeeded');
        return { clip: ltx, engine: 'LTX' };
      }

      logger.warn('[Fallback] LTX failed → using STOCK');
      engine = 'STOCK';
    }

    // 🟢 STOCK (guaranteed fallback)
    logger.info('[Fallback] Using STOCK (final fallback)');
    const stock = await this.providers.pexels.generate(request);

    return { clip: stock, engine: 'STOCK' };
  }
}
```

**Archivos a crear**:
- `src/services/cinematic/core/FallbackChain.ts`

---

#### 3.2 Crear Scene Processor
**Archivo**: `src/services/cinematic/core/SceneProcessor.ts`

```typescript
import { CinematicScene, GenerationResult, VideoGenerationRequest } from '../types';
import { CinematicConfig, ENGINE_TO_STATE } from '../config/CinematicConfig';
import { CriticAgent } from '../agents/CriticAgent';
import { EngineSelector } from './EngineSelector';
import { FallbackChain } from './FallbackChain';
import { logger } from '../../../utils/logger';

export class SceneProcessor {
  private critic: CriticAgent;
  private selector: EngineSelector;
  private fallback: FallbackChain;

  constructor(
    private config: CinematicConfig,
    private providers: any
  ) {
    this.critic = new CriticAgent();
    this.selector = new EngineSelector(config);
    this.fallback = new FallbackChain(providers, config);
  }

  /**
   * Procesa una escena: evalúa, decide motor, genera con fallback
   */
  async processScene(scene: CinematicScene): Promise<GenerationResult> {
    logger.info('[SceneProcessor] Processing scene', { sceneId: scene.id });

    // 1. Fetch STOCK primero (siempre)
    const stockRequest: VideoGenerationRequest = {
      prompt: scene.visualPrompt,
      duration: scene.durationSeconds || 8,
      aspectRatio: '16:9',
    };

    const stockClip = await this.providers.pexels.generate(stockRequest);

    // 2. Evaluar calidad del stock
    const stockScore = this.critic.evaluateStock(
      {
        url: stockClip.videoUrl || '',
        tags: [], // TODO: extraer de Pexels metadata
        duration: stockClip.duration || 8,
      },
      scene.visualPrompt
    );

    logger.debug('[SceneProcessor] Stock evaluated', { stockScore });

    // 3. Computar scene score
    const sceneScore = this.critic.computeSceneScore({
      relevance: stockScore,
      specificity: this.critic.calculateSpecificity(scene.visualPrompt),
      visualComplexity: this.critic.calculateVisualComplexity(scene.visualPrompt),
      narrativeWeight: 0.5, // TODO: calcular de scene.importance
    });

    logger.debug('[SceneProcessor] Scene score computed', { sceneScore });

    // 4. Decidir motor base upfront
    const baseEngine = this.selector.selectBaseEngine(stockScore, sceneScore);

    // 5. Si STOCK pasa → usar directo (no gastar recursos)
    if (baseEngine === 'STOCK') {
      return {
        clip: stockClip,
        engine: 'STOCK',
        state: 'Preview',
        score: stockScore,
      };
    }

    // 6. Generar con fallback en cascada
    const result = await this.fallback.generateWithFallback(stockRequest, baseEngine);

    return {
      clip: result.clip,
      engine: result.engine,
      state: ENGINE_TO_STATE[result.engine],
      score: sceneScore,
    };
  }
}
```

**Archivos a crear**:
- `src/services/cinematic/core/SceneProcessor.ts`

---

### ⚡ FASE 4: VEO Async Upgrade & Orchestrator
**Objetivo**: VEO como único upgrade async + orquestador principal

#### 4.1 Crear VEO Async Upgrader
**Archivo**: `src/services/cinematic/core/VeoAsyncUpgrader.ts`

```typescript
import { CinematicScene, VideoGenerationRequest, VideoGenerationResult } from '../types';
import { CinematicConfig } from '../config/CinematicConfig';
import { promiseWithTimeout, TimeoutError } from './TimeoutHelper';
import { safeGenerate } from './SafeGenerationWrapper';
import { FallbackChain } from './FallbackChain';
import { logger } from '../../../utils/logger';

export class VeoAsyncUpgrader {
  constructor(
    private config: CinematicConfig,
    private veoProvider: any,
    private fallback: FallbackChain
  ) {}

  /**
   * Intenta upgrade a VEO (async)
   * Callback ejecutado si hay upgrade exitoso
   */
  async tryVeoUpgrade(
    scene: CinematicScene,
    sceneScore: number,
    userEngaged: boolean,
    onUpgrade: (clip: VideoGenerationResult) => void
  ): Promise<void> {
    // Validaciones
    if (!this.config.veoEnabled) {
      logger.debug('[VeoUpgrade] VEO disabled, skipping');
      return;
    }

    if (sceneScore < this.config.veoUpgradeThreshold) {
      logger.debug('[VeoUpgrade] Score too low for VEO', { sceneScore });
      return;
    }

    if (!userEngaged) {
      logger.debug('[VeoUpgrade] User not engaged, skipping VEO');
      return;
    }

    logger.info('[VeoUpgrade] Attempting VEO upgrade', { sceneId: scene.id });

    const request: VideoGenerationRequest = {
      prompt: scene.visualPrompt,
      duration: scene.durationSeconds || 8,
      aspectRatio: '16:9',
    };

    try {
      // Intentar VEO con timeout
      const veo = await safeGenerate(
        'VEO',
        () => promiseWithTimeout(
          this.veoProvider.generate(request),
          this.config.veoTimeoutMs,
          'VEO generation timeout'
        ),
        true
      );

      if (veo) {
        logger.info('[VeoUpgrade] VEO succeeded → replacing clip');
        onUpgrade(veo);
        return;
      }

      logger.warn('[VeoUpgrade] VEO failed → trying fallback chain');
    } catch (error) {
      if (error instanceof TimeoutError) {
        logger.warn('[VeoUpgrade] VEO timeout → trying fallback');
      } else {
        logger.error('[VeoUpgrade] VEO error → trying fallback', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Fallback en cascada si VEO falla
    try {
      const fallbackResult = await this.fallback.generateWithFallback(request, 'WAN');

      if (fallbackResult.engine !== 'STOCK') {
        logger.info('[VeoUpgrade] Fallback succeeded', { engine: fallbackResult.engine });
        onUpgrade(fallbackResult.clip);
      }
    } catch (error) {
      logger.error('[VeoUpgrade] Fallback failed, keeping original clip', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
```

**Archivos a crear**:
- `src/services/cinematic/core/VeoAsyncUpgrader.ts`

---

#### 4.2 Crear Video Orchestrator
**Archivo**: `src/services/cinematic/core/VideoOrchestrator.ts`

```typescript
import { CinematicScene, CinematicExperience, GenerationResult } from '../types';
import { CinematicConfig, VideoState, Engine } from '../config/CinematicConfig';
import { SceneProcessor } from './SceneProcessor';
import { VeoAsyncUpgrader } from './VeoAsyncUpgrader';
import { logger } from '../../../utils/logger';

export class VideoOrchestrator {
  private sceneProcessor: SceneProcessor;
  private veoUpgrader: VeoAsyncUpgrader;
  private engagementStartTime: number = 0;

  constructor(
    private config: CinematicConfig,
    private providers: any
  ) {
    this.sceneProcessor = new SceneProcessor(config, providers);
    this.veoUpgrader = new VeoAsyncUpgrader(
      config,
      providers.veo,
      this.sceneProcessor['fallback'] // Access fallback chain
    );
  }

  /**
   * Genera video completo con arquitectura v3
   */
  async generateVideo(
    scenes: CinematicScene[],
    onProgress?: (results: GenerationResult[]) => void
  ): Promise<{ results: GenerationResult[]; state: VideoState }> {
    logger.info('[Orchestrator] Starting video generation', {
      sceneCount: scenes.length,
    });

    this.engagementStartTime = Date.now();

    // PASO 1: Procesar todas las escenas (upfront decisions)
    const results = await Promise.all(
      scenes.map((scene) => this.sceneProcessor.processScene(scene))
    );

    logger.info('[Orchestrator] All scenes processed', {
      engines: results.map(r => r.engine),
    });

    // Callback con resultados iniciales
    onProgress?.(results);

    // Determinar estado del video
    const initialState = this.getVideoState(results.map(r => r.engine));

    // PASO 2: VEO async upgrades (solo si aplica)
    this.startVeoUpgrades(scenes, results, onProgress);

    return { results, state: initialState };
  }

  /**
   * Inicia VEO upgrades en background (no bloquea)
   */
  private startVeoUpgrades(
    scenes: CinematicScene[],
    results: GenerationResult[],
    onProgress?: (results: GenerationResult[]) => void
  ): void {
    const isEngaged = this.isUserEngaged();

    results.forEach((result, index) => {
      if (!result.score) return;

      // Callback para reemplazar clip
      const onUpgrade = (newClip: any) => {
        logger.info('[Orchestrator] VEO upgrade completed', {
          sceneIndex: index,
        });

        // Update result
        results[index] = {
          ...results[index],
          clip: newClip,
          engine: 'VEO',
          state: 'Quality',
        };

        // Notify progress
        onProgress?.(results);
      };

      // Fire VEO upgrade (non-blocking)
      this.veoUpgrader.tryVeoUpgrade(
        scenes[index],
        result.score,
        isEngaged,
        onUpgrade
      );
    });
  }

  /**
   * Determina estado del video basado en engines usados
   */
  private getVideoState(engines: Engine[]): VideoState {
    if (engines.includes('VEO')) return 'Quality';
    if (engines.includes('WAN')) return 'Enhanced';
    if (engines.includes('LTX')) return 'Draft';
    return 'Preview';
  }

  /**
   * Verifica si usuario está engaged (leyendo narrativa, viendo preview, etc.)
   */
  private isUserEngaged(): boolean {
    const elapsed = Date.now() - this.engagementStartTime;
    return elapsed >= this.config.engagementThresholdMs;
  }
}
```

**Archivos a crear**:
- `src/services/cinematic/core/VideoOrchestrator.ts`

---

#### 4.3 Refactor cinematicService.ts
**Archivo**: `src/services/cinematic/cinematicService.ts`

**Cambios**:
1. Importar `VideoOrchestrator`
2. Instanciar con providers existentes
3. Reemplazar lógica de `generateScenesInParallel()` con orchestrator
4. Mantener TODO lo demás (narrative, mixing, Supabase)

```typescript
// AÑADIR imports
import { VideoOrchestrator } from './core/VideoOrchestrator';
import { DEFAULT_CONFIG } from './config/CinematicConfig';

// MODIFICAR generateScenesInParallel
async function generateScenesInParallel(params: {
  scenes: CinematicScene[];
  aspectRatio: CinematicAspectRatio;
  userId: string;
  onProgress?: (progress: CinematicProgress) => void;
}): Promise<CinematicScene[]> {
  const { scenes, onProgress } = params;

  // Crear orchestrator
  const orchestrator = new VideoOrchestrator(DEFAULT_CONFIG, {
    veo: finalizationProvider,
    wan: null, // TODO: implementar cuando esté disponible
    ltx: null, // TODO: implementar cuando esté disponible
    pexels: videoProvider,
  });

  // Progress callback
  const handleProgress = (results: any[]) => {
    const completed = results.filter(r => r.clip).length;
    const progress = 35 + (completed / scenes.length) * 60;

    onProgress?.({
      stage: 'generating',
      message: `Generated ${completed}/${scenes.length} scenes`,
      progress,
      scenes: results.map((r, i) => ({
        ...scenes[i],
        rawVideoUrl: r.clip.videoUrl,
        sceneStage: r.state === 'Preview' ? 'draft' :
                    r.state === 'Quality' ? 'final' : 'preview',
        provider: r.engine === 'VEO' ? 'veo' : 'pexels',
      })),
    });
  };

  // Generar con orchestrator
  const { results } = await orchestrator.generateVideo(scenes, handleProgress);

  // Convertir results a CinematicScene[]
  return results.map((r, i) => ({
    ...scenes[i],
    rawVideoUrl: r.clip.videoUrl,
    sceneStage: r.state === 'Preview' ? 'draft' :
                r.state === 'Quality' ? 'final' : 'preview',
    provider: r.engine === 'VEO' ? 'veo' : 'pexels',
  }));
}
```

**Archivos a modificar**:
- `src/services/cinematic/cinematicService.ts` (solo función `generateScenesInParallel`)

---

## 📁 ESTRUCTURA FINAL

```
src/services/cinematic/
├── config/
│   └── CinematicConfig.ts              # ✅ Config centralizado
├── core/
│   ├── SafeGenerationWrapper.ts        # ✅ Wrapper robusto
│   ├── TimeoutHelper.ts                # ✅ Promise timeout
│   ├── EngineSelector.ts               # ✅ Decisión upfront
│   ├── FallbackChain.ts                # ✅ Cascada WAN→LTX→STOCK
│   ├── SceneProcessor.ts               # ✅ Pipeline por escena
│   ├── VeoAsyncUpgrader.ts             # ✅ VEO async upgrade
│   └── VideoOrchestrator.ts            # ✅ Main orchestrator
├── agents/
│   └── CriticAgent.ts                  # ✅ Scoring & evaluación
├── providers/                          # (NO TOCAR - ya existen)
│   ├── PexelsFallbackProvider.ts
│   ├── VeoVertexProvider.ts
│   ├── LTXProvider.ts (skeleton)
│   └── WANProvider.ts (a crear después)
└── cinematicService.ts                 # ⚠️  Solo refactor generateScenesInParallel
```

---

## ✅ ARCHIVOS A CREAR (8 nuevos)

1. `config/CinematicConfig.ts`
2. `core/SafeGenerationWrapper.ts`
3. `core/TimeoutHelper.ts`
4. `core/EngineSelector.ts`
5. `core/FallbackChain.ts`
6. `core/SceneProcessor.ts`
7. `core/VeoAsyncUpgrader.ts`
8. `core/VideoOrchestrator.ts`
9. `agents/CriticAgent.ts`

## ⚠️ ARCHIVOS A MODIFICAR (2)

1. `types.ts` - Añadir SceneScore, GenerationResult
2. `cinematicService.ts` - Refactor solo `generateScenesInParallel()`

---

## 🚫 ARCHIVOS A NO TOCAR

❌ **NO modificar**:
- `cinematicService.ts` → funciones de narrativa (`streamNarrative`, etc.)
- `cinematicService.ts` → funciones de mixing (`remixSceneWithCloudinary`, etc.)
- `cinematicService.ts` → función de Supabase save (`generateCompleteCinematicVideo` parte final)
- `video/VideoPersistenceService.ts`
- `audio/NarrationService.ts`
- Cualquier archivo en `pages/`, `components/`

---

## 📊 TIMELINE DE IMPLEMENTACIÓN

| Fase | Archivos | Tiempo | Orden |
|------|----------|--------|-------|
| 1    | 4 archivos | 2-3h | Config → Wrapper → Timeout → Types |
| 2    | 2 archivos | 2-3h | CriticAgent → EngineSelector |
| 3    | 2 archivos | 3-4h | FallbackChain → SceneProcessor |
| 4    | 3 archivos | 3-4h | VeoUpgrader → Orchestrator → Refactor |

**Total: 10-14 horas**

---

## 🎯 ORDEN RECOMENDADO (Bottom-up)

1. **Helpers** (30min): `TimeoutHelper.ts`, `SafeGenerationWrapper.ts`
2. **Config** (30min): `CinematicConfig.ts`
3. **Types** (15min): Actualizar `types.ts`
4. **Agents** (2h): `CriticAgent.ts`
5. **Selectors** (1h): `EngineSelector.ts`
6. **Fallback** (1.5h): `FallbackChain.ts`
7. **Processor** (2h): `SceneProcessor.ts`
8. **VEO** (1.5h): `VeoAsyncUpgrader.ts`
9. **Orchestrator** (2h): `VideoOrchestrator.ts`
10. **Integration** (2h): Refactor `cinematicService.ts`

---

## ✅ VALIDACIÓN POST-REFACTOR

### Tests manuales:
- [ ] Config se carga correctamente
- [ ] STOCK genera preview inmediato
- [ ] Score evalúa calidad de stock
- [ ] Engine selector elige correcto motor
- [ ] Fallback chain funciona (simular falla WAN/LTX)
- [ ] VEO timeout funciona (35s max)
- [ ] VEO upgrade solo si engaged (> 5s)
- [ ] Video nunca se rompe (siempre hay STOCK fallback)

### Logs esperados:
```
[EngineSelector] STOCK quality sufficient → final
[SceneProcessor] Processing scene
[Fallback] WAN failed → trying LTX
[VeoUpgrade] VEO timeout → trying fallback
[Orchestrator] All scenes processed
```

---

## 🚀 ¿EMPEZAMOS?

**Siguiente paso**: Crear archivos en orden recomendado, empezando por helpers.

¿Quieres que empiece ahora con la **Fase 1** (Config + Helpers)?
