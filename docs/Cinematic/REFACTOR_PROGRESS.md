# Cinematic Director Refactor - Progress Status

**Fecha**: 2026-04-22
**Estado**: 75% completado (Fases 1-2 + BONUS)

---

## ✅ COMPLETADO

### Fase 1: Config & Helpers (100%)
- ✅ [TimeoutHelper.ts](../../src/services/cinematic/core/TimeoutHelper.ts)
- ✅ [SafeGenerationWrapper.ts](../../src/services/cinematic/core/SafeGenerationWrapper.ts)
- ✅ [CinematicConfig.ts](../../src/services/cinematic/config/CinematicConfig.ts)
- ✅ [types.ts](../../src/services/cinematic/types.ts) - Nuevas interfaces añadidas

### Fase 2: Scoring & Selection (100%)
- ✅ [CriticAgent.ts](../../src/services/cinematic/agents/CriticAgent.ts)
- ✅ [EngineSelector.ts](../../src/services/cinematic/core/EngineSelector.ts)

### BONUS: Providers (100%)
- ✅ [WANProvider.ts](../../src/services/cinematic/providers/WANProvider.ts) - Wavespeed WAN 2.2
- ✅ [LTXProvider.ts](../../src/services/cinematic/providers/LTXProvider.ts) - Lightricks LTX-2-Fast

### Fase 3: Core Pipeline (25%)
- ✅ [FallbackChain.ts](../../src/services/cinematic/core/FallbackChain.ts)
- ⏳ SceneProcessor.ts - PENDIENTE
-⏳ VeoAsyncUpgrader.ts - PENDIENTE

### Fase 4: Orchestrator (0%)
- ⏳ VideoOrchestrator.ts - PENDIENTE
- ⏳ Refactor cinematicService.ts - PENDIENTE

---

## 🔄 PRÓXIMOS PASOS

### 1. Crear SceneProcessor.ts
**Responsabilidad**: Pipeline principal por escena
- Fetch STOCK primero
- Evaluar con CriticAgent
- Decidir engine con EngineSelector
- Generar con FallbackChain

### 2. Crear VeoAsyncUpgrader.ts
**Responsabilidad**: VEO async upgrade (único upgrade permitido)
- Check engagement threshold
- Timeout VEO (35s)
- Fallback a WAN/LTX si VEO falla

### 3. Crear VideoOrchestrator.ts
**Responsabilidad**: Orquestador principal
- Paso 1: Preview inmediato (STOCK)
- Paso 2: Generación real (SceneProcessor)
- Paso 3: VEO upgrades async

### 4. Integrar en cinematicService.ts
**Cambios mínimos**:
- Reemplazar `generateScenesInParallel()` con VideoOrchestrator
- Mantener TODO lo demás (narrativa, mixing, Supabase)

---

## 📦 BUILD STATUS

✅ **Build successful**: 22.07s
✅ **No TypeScript errors**
✅ **All new files importing correctly**

---

## 🎯 ENV VARS REQUERIDAS

Para que el sistema funcione completo necesitas:

```bash
# Wavespeed API (WAN + LTX)
VITE_WAVESPEED_API_KEY=your_wavespeed_key

# VEO (ya configurado)
VITE_GOOGLE_CLOUD_PROJECT_ID=...
VITE_GOOGLE_CLOUD_LOCATION=...

# Pexels (ya configurado)
VITE_PEXELS_API_KEY=...
```

---

## 📝 TESTING CHECKLIST

Cuando esté completo, probar:

- [ ] Config se carga
- [ ] STOCK genera preview (< 3s)
- [ ] CriticAgent evalúa clips
- [ ] EngineSelector decide motor correcto
- [ ] WAN genera si habilitado
- [ ] LTX genera si habilitado
- [ ] Fallback chain funciona
- [ ] VEO timeout (35s)
- [ ] VEO upgrade solo si engaged

---

## 💡 CONTINUAR DESDE AQUÍ

**Archivo siguiente**: `SceneProcessor.ts`

**Código sugerido**:
```typescript
export class SceneProcessor {
  async processScene(scene: CinematicScene): Promise<GenerationResult> {
    // 1. Fetch STOCK
    const stock = await this.providers.stock.generate(...)

    // 2. Evaluar
    const stockScore = this.critic.evaluateStock(stock, scene.visualPrompt)
    const sceneScore = this.critic.computeSceneScore(...)

    // 3. Decidir
    const engine = this.selector.selectBaseEngine(stockScore, sceneScore)

    // 4. Si STOCK suficiente → return
    if (engine === 'STOCK') return { clip: stock, engine: 'STOCK', state: 'Preview' }

    // 5. Generar con fallback
    const result = await this.fallback.generateWithFallback(request, engine)
    return { ...result, state: ENGINE_TO_STATE[result.engine] }
  }
}
```

**Tiempo estimado restante**: 4-6 horas

¿Continuar ahora o en otra sesión?
