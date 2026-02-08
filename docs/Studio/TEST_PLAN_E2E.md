# 🧪 TEST PLAN - Studio End-to-End Flow

## 🎯 Objetivo
Validar el flujo completo de generación de video desde home hasta video renderizado.

---

## ✅ PRE-REQUISITOS

- [x] Servidor levantado: http://localhost:8888
- [x] Variables de entorno configuradas (.env)
- [x] Supabase conectado
- [x] OpenAI API key configurada
- [x] Brave API key configurada (opcional, fallback a placeholders)
- [x] Pexels API key configurada (opcional, fallback sin video fondo)

---

## 🧪 TEST CASES

### **TEST 1: Flujo Completo - Pregunta Simple**

#### **Input**:
```
Pregunta: "Why is the sky blue?"
Tipo: Studio → Video (Explainer Video)
```

#### **Pasos**:
1. ✅ Abrir http://localhost:8888
2. ✅ Escribir pregunta en el input principal
3. ✅ Click en "Studio" en el selector de tipo
4. ✅ Click en "Explainer Video"
5. ✅ Click en botón de buscar/generar

#### **Validaciones Esperadas**:

**STEP 1: Analyze question** (1-2s)
- [ ] Status: "in_progress"
- [ ] Se muestra spinner/loading
- [ ] Completa exitosamente

**STEP 2: Generate key ideas** (3-5s)
- [ ] Status: "in_progress"
- [ ] Key ideas aparecen en streaming
- [ ] 3-5 bullet points visibles
- [ ] Formato: "• Idea 1\n• Idea 2\n• Idea 3"

**STEP 3: Create script** (5-8s)
- [ ] Status: "in_progress"
- [ ] Script aparece en streaming
- [ ] Formato con capítulos (bold **Chapter**)
- [ ] Timestamps (00:00, 00:05, etc.)
- [ ] Completa con ~30s de contenido

**STEP 4: Parse into chapters** (0.5s)
- [ ] Status: "in_progress"
- [ ] ChapterPlan creado exitosamente
- [ ] Console log: "ChapterPlan created"
- [ ] Número de chapters: 3-5

**STEP 5: Prepare assets** (3-8s)
- [ ] Status: "in_progress"
- [ ] Console log: "Preparing chapter assets"
- [ ] Console log: "Chapter assets prepared"
- [ ] Si Brave API: Búsqueda de imágenes
- [ ] Si no Brave: Placeholders SVG
- [ ] Si Pexels API: Video de fondo buscado

**STEP 6: Generate voiceover** (1s)
- [ ] Status: "in_progress"
- [ ] Console log: "Audio generation (using mock for now)"
- [ ] Mock TTS creado (silencio)
- [ ] Completa rápidamente

**STEP 7: Render chapters** (5-10s por chapter)
- [ ] Status: "in_progress"
- [ ] Console log: "Starting chapter-based video rendering"
- [ ] Console log: "Chapter rendered" (x3-5)
- [ ] Progreso visible (0-100%)
- [ ] Primer chapter completo rápido
- [ ] Resto en background

#### **Resultado Final**:
- [ ] Status: "complete"
- [ ] Video URL visible
- [ ] Player de video funcional
- [ ] Video reproduce correctamente
- [ ] Duración: ~30 segundos
- [ ] Resolución: 720×1280 (portrait)
- [ ] Botón de descarga disponible

#### **Console Logs Esperados**:
```
✅ [StudioWriterAgent] Starting content generation
✅ [StudioWriterAgent] Key ideas generated
✅ [StudioWriterAgent] Script generated
✅ [Orchestrator] ChapterPlan created (3 chapters)
✅ [InputManager] Preparando chapters (count: 3)
✅ [InputManager] Chapter preparado (x3)
✅ [BackgroundRenderer] Iniciando rendering
✅ [BackgroundRenderer] Preloading assets
✅ [AssetCache] Cache MISS, fetching... (o Cache HIT si segunda vez)
✅ [ChapterRenderer] Rendering iniciado
✅ [ChapterRenderer] Progreso: 10%, 20%, ..., 100%
✅ [ChapterRenderer] Render completo
✅ [BackgroundRenderer] Chapter rendered (x3)
```

---

### **TEST 2: Performance - Segunda Generación (Cache)**

#### **Input**:
```
Pregunta: "How does gravity work?"
Tipo: Studio → Video
```

#### **Validaciones**:
- [ ] Console log: "Cache HIT" para imágenes repetidas
- [ ] Render más rápido (~3-4s vs 5-6s)
- [ ] Sin requests de red duplicados
- [ ] AssetCache stats: utilization > 0%

---

### **TEST 3: Fallbacks - Sin APIs Externas**

#### **Setup**:
Comentar temporalmente en `.env`:
```
# BRAVE_API_KEY=xxx
# VITE_PEXELS_API_KEY=xxx
```

#### **Validaciones**:
- [ ] Usa placeholders SVG (colores: #0095FF, #3b82f6, #60a5fa)
- [ ] Sin video de fondo (solo colores sólidos)
- [ ] Console log: "Usando placeholders (modo testing)"
- [ ] Console log: "Pexels API no configurada, sin video de fondo"
- [ ] Video se genera correctamente de todas formas

---

### **TEST 4: Tipos de Video**

#### **4A: YouTube Short** (vertical)
- [ ] Input: "What is AI?"
- [ ] Tipo: Studio → YouTube Short
- [ ] Formato: vertical (720×1280)
- [ ] Duración: ~30s

#### **4B: Instagram Reel** (vertical)
- [ ] Input: "Explain photosynthesis"
- [ ] Tipo: Studio → Instagram Reel
- [ ] Formato: vertical (720×1280)
- [ ] Duración: ~30s

#### **4C: Explainer Video** (horizontal)
- [ ] Input: "Why do we dream?"
- [ ] Tipo: Studio → Explainer Video
- [ ] Formato: horizontal (1280×720) **[TODO: verificar si se implementó]**
- [ ] Duración: ~30s

---

### **TEST 5: Edge Cases**

#### **5A: Pregunta Muy Larga**
```
Input: "Explain the entire history of the Roman Empire from its founding to its fall, including all major emperors, battles, and cultural achievements"
```
- [ ] Key ideas se generan correctamente
- [ ] Script se ajusta a 30s (no todo el contenido)
- [ ] Chapters limitados a 3-5

#### **5B: Pregunta Muy Corta**
```
Input: "Why?"
```
- [ ] Sistema maneja gracefully
- [ ] Genera contenido razonable
- [ ] O muestra error apropiado

#### **5C: Caracteres Especiales**
```
Input: "¿Cómo funciona el ADN? 🧬💡"
```
- [ ] Maneja UTF-8 correctamente
- [ ] Emojis no rompen rendering
- [ ] Texto se muestra correctamente

---

## 📊 MÉTRICAS A RECOPILAR

Durante cada test, anotar:

1. **Tiempos**:
   - Key ideas: ___s
   - Script: ___s
   - Asset preparation: ___s
   - First chapter render: ___s
   - Total time: ___s

2. **Tamaños**:
   - Video file size: ___KB
   - Cache size: ___MB

3. **Cache Performance**:
   - First run: ___s
   - Second run (cached): ___s
   - Improvement: ___%

4. **Console Errors**:
   - CORS errors: ___
   - Network failures: ___
   - Rendering errors: ___

---

## 🐛 BUG TRACKING

| Bug ID | Descripción | Severidad | Estado |
|--------|-------------|-----------|--------|
| -      | -           | -         | -      |

---

## ✅ SUCCESS CRITERIA

Para considerar el test exitoso:

- [x] Flujo completo ejecuta sin errores
- [ ] Video se genera en <15s total
- [ ] Video reproduce correctamente
- [ ] Cache funciona (segunda generación más rápida)
- [ ] Fallbacks funcionan (sin APIs externas)
- [ ] Console sin errores críticos
- [ ] UI responsiva durante generación
- [ ] Memoria estable (<200MB)

---

## 🚀 NEXT STEPS AFTER TESTING

Si todos los tests pasan:
1. ✅ Deploy a staging
2. ✅ Test en staging con datos reales
3. ✅ Deploy a producción
4. ✅ Monitor analytics

Si hay bugs:
1. 🐛 Documentar en tabla de bugs
2. 🔧 Priorizar y fix
3. 🧪 Re-test
4. ✅ Deploy cuando esté stable

---

## 📝 TESTING NOTES

**Tester**: _________
**Date**: Feb 8, 2026
**Time**: _________

**Environment**:
- Browser: _________
- OS: macOS
- Node version: _________
- Netlify Dev: Running ✅

**Notes**:
