# 🧪 TESTING GUIDE - Cinematic Director Refactor v3

**Objetivo**: Verificar que el sistema funciona correctamente con fallback a STOCK

---

## ⚙️ CONFIGURACIÓN ACTUAL

### API Keys:
- ❌ **VITE_WAVESPEED_API_KEY**: NO configurada (esperado)
- ✅ **VITE_PEXELS_API_KEY**: Configurada
- ✅ **VITE_GOOGLE_CLOUD_PROJECT_ID**: Configurada (VEO)

### Feature Flags (en CinematicConfig.ts):
```typescript
ltxEnabled: false,  // ❌ Sin API key → se salta
wanEnabled: true,   // ❌ Sin API key → fallback
veoEnabled: true,   // ✅ Debe intentar async
```

---

## 🎯 TEST 1: Fallback Cascade (WAN → LTX → STOCK)

### Expectativa:
1. **EngineSelector** decide usar WAN (si score > 0.7)
2. **WANProvider** intenta generar → FALLA (no API key)
3. **FallbackChain** cae a LTX → FALLA (no API key)
4. **FallbackChain** cae a STOCK → ✅ **SUCCESS**

### Logs esperados en consola:
```
[CinematicService] Starting video generation with Director v3
[SceneProcessor] Processing scene { sceneId: "scene_1" }
[CriticAgent] Stock evaluated { stockScore: 0.xxx }
[EngineSelector] High score → WAN selected (o STOCK si score bajo)
[SafeGen] WAN disabled, skipping
[Fallback] WAN failed → trying LTX
[SafeGen] LTX disabled, skipping
[Fallback] LTX failed → using STOCK
[Fallback] Using STOCK (final fallback)
[Orchestrator] All scenes processed { engines: ["STOCK", "STOCK", ...] }
```

### Resultado esperado:
- ✅ Video se genera (NUNCA falla)
- ✅ Estado: **"Preview"** (STOCK)
- ✅ 4 escenas con videos de Pexels
- ✅ "Continue Exploring" con 4 temas relacionados

---

## 🎯 TEST 2: VEO Async Upgrade

### Expectativa:
1. Escenas generadas con STOCK (Preview)
2. Después de **5 segundos** (engagement threshold):
3. **VeoAsyncUpgrader** intenta mejorar escenas con score > 0.85
4. Si VEO succeed → Estado cambia a **"Quality"**
5. Si VEO timeout (35s) → Fallback a WAN/LTX/STOCK

### Logs esperados:
```
[Orchestrator] Starting VEO async upgrades { isEngaged: true }
[VeoUpgrade] Attempting VEO upgrade { sceneId: "scene_1", sceneScore: 0.9 }
[VeoUpgrade] VEO succeeded → upgrading scene (o timeout → fallback)
[Orchestrator] VEO upgrade completed
```

### Resultado esperado:
- ✅ Video inicia con STOCK (instantáneo)
- ⏱️ Después de 5s: intenta VEO
- ✅ Si VEO funciona: upgrade a Quality
- ✅ Si VEO falla/timeout: se queda en Preview

---

## 🎯 TEST 3: Continue Exploring Section

### Expectativa:
- ✅ Sección visible al final de la página
- ✅ Título: "Continue Exploring"
- ✅ 4 tarjetas con imágenes y títulos
- ✅ Click en tarjeta → nueva búsqueda cinematic

### Verificar:
1. **Scroll al final** de CinematicResults
2. Buscar sección con ícono Link2
3. Debe haber **4 tarjetas horizontales** con:
   - Imagen (aspect-ratio 16:9)
   - Título del tema
   - Hover effect (border cambia de color)
4. **Click** en cualquier tarjeta → nueva búsqueda

### Código relevante:
```tsx
{/* Related Topics / Continue Exploring - Show in all tabs */}
{(experience?.relatedTopics?.length ?? 0) > 0 && (
  <section className="rounded-xl border ...">
    <div className="flex items-center gap-2 mb-4">
      <Link2 size={16} />
      <h3>Continue Exploring</h3>
    </div>

    <div className="flex gap-3 overflow-x-auto">
      {experience.relatedTopics.map(topic => (
        <button onClick={() => navigate(`/cinematic-results?q=...`)}>
          {/* Tarjeta con imagen y título */}
        </button>
      ))}
    </div>
  </section>
)}
```

---

## 📊 CHECKLIST DE PRUEBAS

### Básicas:
- [ ] ✅ Abrir `/cinematic-results?q=what is photosynthesis`
- [ ] ✅ Ver narrativa streaming (2-3s)
- [ ] ✅ Ver 4 escenas generándose
- [ ] ✅ Estado inicial: "Preview" (STOCK)
- [ ] ✅ Console logs muestran fallback chain
- [ ] ✅ Scroll al final → "Continue Exploring" visible
- [ ] ✅ 4 tarjetas con imágenes
- [ ] ✅ Click en tarjeta → nueva búsqueda

### Avanzadas:
- [ ] ✅ Esperar 5+ segundos
- [ ] ✅ Verificar logs de VEO upgrade
- [ ] ✅ Si VEO succeed → estado cambia a "Quality"
- [ ] ✅ Reproducir video completo
- [ ] ✅ Audio de narración funciona

### Edge Cases:
- [ ] ✅ Buscar query muy simple → STOCK directo (no gasta en AI)
- [ ] ✅ Buscar query complejo → intenta WAN → falla → STOCK
- [ ] ✅ Error de red → video sigue funcionando
- [ ] ✅ VEO timeout → fallback funciona

---

## 🐛 TROUBLESHOOTING

### Problema 1: "Continue Exploring" no aparece
**Causa**: `experience.relatedTopics` está vacío
**Solución**: Verificar que `enrichRelatedTopics()` se ejecuta
**Log**: Buscar `[CinematicService] Related topic image lookup failed`

### Problema 2: Videos no se generan
**Causa**: Pexels API key inválida
**Solución**: Verificar `VITE_PEXELS_API_KEY` en env
**Log**: `[SafeGen] STOCK failed`

### Problema 3: Estado siempre "Preview"
**Causa**: WAN/LTX/VEO todos fallan
**Solución**: **ESPERADO** sin API keys
**Log**: `[Fallback] Using STOCK (final fallback)`

### Problema 4: VEO no se intenta
**Causas posibles**:
- Score < 0.85 (threshold)
- Engagement < 5s
- `veoEnabled: false`
**Log**: `[VeoUpgrade] Score too low for VEO`

---

## 📝 RESULTADOS ESPERADOS

### Escenario Normal (sin API keys):
```
✅ Narrativa: Streaming OK
✅ Escenas: 4 videos de Pexels (STOCK)
✅ Estado: "Preview"
✅ Continue Exploring: 4 tarjetas
✅ Tiempo total: < 5 segundos
✅ Logs: Fallback chain visible
```

### Escenario con VEO:
```
✅ Narrativa: Streaming OK
✅ Escenas: Inicialmente STOCK
⏱️ Después de 5s: Intenta VEO
✅ Si VEO OK: Estado → "Quality"
✅ Continue Exploring: 4 tarjetas
```

---

## 🚀 PRÓXIMOS PASOS DESPUÉS DEL TEST

Si todo funciona:
1. ✅ Obtener `VITE_WAVESPEED_API_KEY`
2. ✅ Añadir a `.env.local`
3. ✅ Activar `wanEnabled: true` (ya está)
4. ✅ Activar `ltxEnabled: true` si quieres
5. ✅ Re-testear con WAN/LTX

---

**Creado**: 2026-04-22
**Status**: ✅ Listo para testing manual
