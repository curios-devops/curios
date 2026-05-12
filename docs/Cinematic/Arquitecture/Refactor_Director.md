Perfecto—voy a darte la **misma arquitectura pero refactorizada para ejecución real en TypeScript**, incluyendo:

* manejo de APIs no disponibles (LTX / WAN)
* timeouts configurables (especialmente VEO a 40 seg.)
* fallbacks garantizados → **el video NUNCA se rompe**
* estructura lista para backend (workers / services)

---

# 🎬 CINEMATIC ARCHITECTURE — TS EXECUTION SPEC

---

# 0. CONFIG GLOBAL (CRÍTICO)

```ts
type Engine = "STOCK" | "LTX" | "WAN" | "VEO";

interface Config {
  veoTimeoutMs: number; // ej: 30000–40000 (NO hardcode en lógica)
  ltxEnabled: boolean;
  wanEnabled: boolean;
  veoEnabled: boolean;
}

const CONFIG: Config = {
  veoTimeoutMs: 35000,
  ltxEnabled: false, // 🚨 APIs aún no conectadas
  wanEnabled: false, // 🚨 APIs aún no conectadas
  veoEnabled: true
};
```

---

# 1. INPUT (DIRECTOR LAYER)

```ts
interface SceneInput {
  id: number;
  role: "hook" | "setup" | "development" | "climax_cta";
  duration: number;
  narrative: string;
  visualPrompt: string;
  importance: number;
}

interface VideoInput {
  topic: string;
  tone: string;
  scenes: SceneInput[];
}
```

---

# 2. SCORING SYSTEM

```ts
interface SceneScore {
  relevance: number;
  specificity: number;
  visualComplexity: number;
  narrativeWeight: number;
}

function computeSceneScore(score: SceneScore): number {
  return (
    score.relevance * 0.4 +
    score.specificity * 0.2 +
    score.visualComplexity * 0.2 +
    score.narrativeWeight * 0.2
  );
}
```

---

# 3. STOCK FIRST (SIEMPRE)

```ts
async function getStockClip(scene: SceneInput): Promise<Clip> {
  // pexels / pixabay adapter
  return fetchStock(scene.visualPrompt);
}
```

---

# 4. EVALUATION (CRITIC AGENT)

```ts
function evaluateStock(clip: Clip, scene: SceneInput): number {
  // mock inicial → luego CLIP / LLM
  return Math.random(); // placeholder
}
```

---

# 5. SAFE AI GENERATION WRAPPER (CLAVE)

👉 **Este patrón evita romper el pipeline SIEMPRE**

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
  } catch (e) {
    console.warn(`${engine} failed → fallback to STOCK`);
    return null;
  }
}
```

---

# 6. WAN / LTX (NO DISPONIBLES → FALLBACK AUTOMÁTICO)

```ts
async function generateWAN(scene: SceneInput): Promise<Clip | null> {
  return safeGenerate("WAN", async () => {
    // futura implementación
    throw new Error("WAN API not connected");
  });
}

async function generateLTX(scene: SceneInput): Promise<Clip | null> {
  return safeGenerate("LTX", async () => {
    // futura implementación
    throw new Error("LTX API not connected");
  });
}
```

---

# 7. VEO (CON TIMEOUT CONTROLADO)

```ts
async function generateVEO(scene: SceneInput): Promise<Clip | null> {
  return safeGenerate("VEO", async () => {
    return await promiseWithTimeout(
      veoApiCall(scene),
      CONFIG.veoTimeoutMs
    );
  });
}
```

---

## Timeout Helper

```ts
function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("VEO timeout"));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
```

---

# 8. CORE PIPELINE POR ESCENA

```ts
async function processScene(scene: SceneInput): Promise<Clip> {
  const stock = await getStockClip(scene);

  const stockScore = evaluateStock(stock, scene);

  // ✅ CASO 1: stock suficiente
  if (stockScore > 0.75) {
    return stock;
  }

  const sceneScore = computeSceneScore({
    relevance: stockScore,
    specificity: 0.5,
    visualComplexity: 0.5,
    narrativeWeight: scene.importance
  });

  // ✅ CASO 2: no vale la pena gastar
  if (sceneScore < 0.5) {
    return stock;
  }

  // ⚙️ DECISIÓN POR ESCENA

  // Escena 1 (hook)
  if (scene.role === "hook") {
    const ltx = await generateLTX(scene);
    return ltx ?? stock;
  }

  // Escena 4 (CTA)
  if (scene.role === "climax_cta") {
    const veo = await generateVEO(scene);
    if (veo) return veo;

    const ltx = await generateLTX(scene);
    return ltx ?? stock;
  }

  // Escena 2–3 → se manejan fuera (WAN split)
  return stock;
}
```

---

# 9. WAN SPLIT (ESCENAS 2–3)

```ts
async function processCoreScenes(
  scene2: SceneInput,
  scene3: SceneInput
): Promise<[Clip, Clip]> {
  const stock2 = await getStockClip(scene2);
  const stock3 = await getStockClip(scene3);

  const wanClip = await generateWAN(scene2);

  // 🚨 fallback automático si no hay WAN
  if (!wanClip) {
    return [stock2, stock3];
  }

  return splitClip(wanClip);
}
```

---

```ts
function splitClip(clip: Clip): [Clip, Clip] {
  const mid = clip.duration / 2;

  return [
    clip.slice(0, mid),
    clip.slice(mid, clip.duration)
  ];
}
```

---

# 10. SCHEDULER (CONTROL DE RECURSOS)

```ts
class Scheduler {
  private active = {
    LTX: 0,
    WAN: 0,
    VEO: 0
  };

  canRun(engine: Engine): boolean {
    return this.active[engine] < 1;
  }

  start(engine: Engine) {
    this.active[engine]++;
  }

  end(engine: Engine) {
    this.active[engine]--;
  }
}
```

---

# 11. VIDEO ORCHESTRATOR (MAIN)

```ts
async function generateVideo(input: VideoInput): Promise<Video> {
  const [s1, s2, s3, s4] = input.scenes;

  // ⚡ Paso 1 — preview inmediato
  const stockScenes = await Promise.all([
    getStockClip(s1),
    getStockClip(s2),
    getStockClip(s3),
    getStockClip(s4)
  ]);

  renderPreview(stockScenes);

  // 🔁 Paso 2 — procesamiento real

  const scene1 = await processScene(s1);

  const [scene2, scene3] = await processCoreScenes(s2, s3);

  const scene4 = await processScene(s4);

  const finalScenes = [scene1, scene2, scene3, scene4];

  return assembleVideo(finalScenes);
}
```

---

# 12. REPLACEMENT ENGINE

```ts
function replaceScene(
  video: Video,
  sceneIndex: number,
  newClip: Clip
) {
  video.scenes[sceneIndex] = crossfade(
    video.scenes[sceneIndex],
    newClip
  );
}
```

---

# 13. GARANTÍA DEL SISTEMA (CRÍTICO)

👉 Con este diseño:

* ❌ WAN caído → usa STOCK
* ❌ LTX no existe → usa STOCK
* ❌ VEO timeout → usa STOCK
* ❌ cualquier error → usa STOCK

👉 Resultado:

```text
EL VIDEO SIEMPRE SE REPRODUCE
```

---

# 🔥 RESUMEN FINAL (OPERATIVO)

* STOCK = base obligatoria
* LTX/WAN = opcionales (actualmente OFF → fallback automático)
* VEO = activo pero con timeout configurable (40sg.)
* 0 paralelismo por escena
* WAN = 1 render → 2 escenas
* reemplazo progresivo listo para enchufar
* sistema resiliente por diseño
