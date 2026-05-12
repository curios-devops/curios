Ahora sí: esto ya es una **arquitectura cerrada, coherente y optimizada para UX + latencia + percepción**.
Te la dejo refactorizada completamente con tus nuevas reglas:

* ❌ sin reemplazos innecesarios
* ✅ motor decidido upfront (salvo VEO async)
* ✅ fallback en cascada garantizado
* ✅ duración fija por escena SIEMPRE
* ✅ estados UX claros (Preview → Draft → Enhanced → Quality)
* ✅ sin Dual Flow en runtime (pipeline único V3)

---

# 🎬 CINEMATIC ARCHITECTURE v3 — TS SPEC (FINAL REFINED)

---

# 0. PRINCIPIOS FUNDAMENTALES

### 🎯 Regla 1 — Duración fija

```text
STOCK = LTX = WAN = VEO
```

👉 Nunca cambia duración, solo cambia motor

---

### 🎯 Regla 2 — No reemplazo innecesario

* Si STOCK pasa → se queda FINAL
* Si no pasa → se selecciona **UN motor base upfront**
* ❌ no cadena STOCK → LTX → WAN (evitado)

---

### 🎯 Regla 3 — Única excepción: VEO

* solo async
* solo si usuario engaged
* único caso de upgrade

---

### 🎯 Regla 4 — Fallback en cascada

```text
VEO → WAN → LTX → STOCK
```

👉 siempre hay resultado

---

### 🎯 Regla 5 — Runtime único (sin Dual Flow)

```text
Solo se ejecuta Orchestrator v3
```

No hay pipeline paralelo Draft/Quality en runtime.
La progresión de calidad queda bajo las reglas de v3 (upfront + VEO async controlado).

---

# 1. UX STATES (CRÍTICO)

```ts
type VideoState =
  | "Preview"   // STOCK
  | "Draft"     // LTX
  | "Enhanced"  // WAN
  | "Quality";  // VEO
```

---

### Mapping

```ts
const ENGINE_TO_STATE = {
  STOCK: "Preview",
  LTX: "Draft",
  WAN: "Enhanced",
  VEO: "Quality"
};
```

---

# 2. CONFIG

```ts
type Engine = "STOCK" | "LTX" | "WAN" | "VEO";

interface Config {
  veoTimeoutMs: number;

  ltxEnabled: boolean;
  wanEnabled: boolean;
  veoEnabled: boolean;

  engagementThresholdMs: number;
}

const CONFIG: Config = {
  veoTimeoutMs: 35000,
  engagementThresholdMs: 5000,

  ltxEnabled: false,
  wanEnabled: false,
  veoEnabled: true
};
```

---

# 3. DECISIÓN DE MOTOR (UPFRONT)

👉 ESTE ES EL CAMBIO MÁS IMPORTANTE

```ts
function selectBaseEngine(
  stockScore: number,
  sceneScore: number
): Engine {
  // ✅ STOCK suficiente → final directo
  if (stockScore > 0.8) {
    return "STOCK";
  }

  // 🚨 APIs no disponibles → fallback automático
  if (!CONFIG.ltxEnabled && !CONFIG.wanEnabled) {
    return "STOCK";
  }

  // 🧠 decisión principal
  if (sceneScore > 0.7 && CONFIG.wanEnabled) {
    return "WAN";
  }

  if (sceneScore > 0.4 && CONFIG.ltxEnabled) {
    return "LTX";
  }

  return "STOCK";
}
```

---

# 4. GENERADORES (SAFE)

```ts
async function safeGenerate(
  engine: Engine,
  generator: () => Promise<Clip>
): Promise<Clip | null> {
  try {
    if (engine === "LTX" && !CONFIG.ltxEnabled) return null;
    if (engine === "WAN" && !CONFIG.wanEnabled) return null;
    if (engine === "VEO" && !CONFIG.veoEnabled) return null;

    return await generator();
  } catch {
    return null;
  }
}
```

---

# 5. CADENA DE FALLBACK (CORE)

```ts
async function generateWithFallback(
  scene: SceneInput,
  baseEngine: Engine
): Promise<{ clip: Clip; engine: Engine }> {

  // 🔵 VEO solo se maneja aparte
  if (baseEngine === "VEO") {
    baseEngine = "WAN";
  }

  // 🟡 WAN
  if (baseEngine === "WAN") {
    const wan = await generateWAN(scene);
    if (wan) return { clip: wan, engine: "WAN" };

    baseEngine = "LTX";
  }

  // 🟡 LTX
  if (baseEngine === "LTX") {
    const ltx = await generateLTX(scene);
    if (ltx) return { clip: ltx, engine: "LTX" };

    baseEngine = "STOCK";
  }

  // 🟢 STOCK (final fallback)
  const stock = await getStockClip(scene);
  return { clip: stock, engine: "STOCK" };
}
```

---

# 6. PIPELINE POR ESCENA (SIMPLIFICADO)

```ts
async function processScene(
  scene: SceneInput
): Promise<{ clip: Clip; engine: Engine }> {

  const stock = await getStockClip(scene);
  const stockScore = evaluateStock(stock, scene);

  const sceneScore = computeSceneScore(scene, stockScore);

  // 🎯 decisión upfront
  const baseEngine = selectBaseEngine(stockScore, sceneScore);

  // ✅ si STOCK → no gastar más
  if (baseEngine === "STOCK") {
    return { clip: stock, engine: "STOCK" };
  }

  // ⚙️ generar con fallback
  return generateWithFallback(scene, baseEngine);
}
```

---

# 7. VEO (ASYNC UPGRADE)

👉 único caso de reemplazo

```ts
async function tryVeoUpgrade(
  scene: SceneInput,
  currentClip: Clip,
  sceneScore: number,
  onReplace: (clip: Clip) => void
) {
  if (!CONFIG.veoEnabled) return;
  if (sceneScore < 0.85) return;
  if (!isUserEngaged(CONFIG.engagementThresholdMs)) return;

  try {
    const veo = await promiseWithTimeout(
      veoApiCall(scene),
      CONFIG.veoTimeoutMs
    );

    if (veo) {
      onReplace(veo); // 🔁 único replace permitido
    }

  } catch {
    // 🔁 fallback automático
    const wan = await generateWAN(scene);
    if (wan) {
      onReplace(wan);
      return;
    }

    const ltx = await generateLTX(scene);
    if (ltx) {
      onReplace(ltx);
    }
  }
}
```

---

# 8. ORCHESTRATOR

```ts
async function generateVideo(input: VideoInput): Promise<Video> {

  // ⚡ 1. PREVIEW INMEDIATO (STOCK)
  const previewScenes = await Promise.all(
    input.scenes.map(getStockClip)
  );

  renderPreview(previewScenes, "Preview");

  // ⚙️ 2. GENERACIÓN REAL (UPFRONT DECISION)
  const results = await Promise.all(
    input.scenes.map(processScene)
  );

  const finalScenes = results.map(r => r.clip);
  const engines = results.map(r => r.engine);

  const video = assembleVideo(finalScenes);

  updateVideoState(getStateFromEngines(engines));

  // 💎 3. VEO ASYNC
  results.forEach((result, i) => {
    const scene = input.scenes[i];

    tryVeoUpgrade(
      scene,
      result.clip,
      computeSceneScore(scene, 0.5),
      (newClip) => replaceScene(video, i, newClip)
    );
  });

  return video;
}
```

---

# 9. ESTADO UX DINÁMICO

```ts
function getStateFromEngines(engines: Engine[]): VideoState {
  if (engines.includes("VEO")) return "Quality";
  if (engines.includes("WAN")) return "Enhanced";
  if (engines.includes("LTX")) return "Draft";
  return "Preview";
}
```

---

# 10. TIMELINE REAL

```text
t=0s   → Preview (STOCK completo)

t=1–5s → Draft (LTX si aplica)
        → o Enhanced (WAN si elegido upfront)

t=5s+  → trigger VEO (si engaged)

t=20–40s → Quality (si VEO llega)
```

---

# 11. GARANTÍA DEL SISTEMA

👉 pase lo que pase:

```text
VEO falla → WAN
WAN falla → LTX
LTX falla → STOCK
```

👉 resultado:

```text
EL VIDEO SIEMPRE TERMINA
SIN BLOQUEOS
SIN ESPERAS ROTAS
```

---

# 🔥 RESUMEN FINAL

* ✅ duración fija por escena
* ✅ decisión upfront (sin sobre-generación)
* ✅ WAN simplificado (1 escena = 1 clip)
* ✅ VEO único upgrade
* ✅ fallback en cascada sólido
* ✅ UX basada en progreso percibido

---

# 💡 INSIGHT FINAL (ESTO ES TU DIFERENCIADOR)

Esto ya no es un pipeline de video.

Es un:

```text
"Perceptual Rendering System"
```

Donde:

* no optimizas modelos
* optimizas la sensación de progreso

---
