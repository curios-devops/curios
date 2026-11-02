# PR: Animación HD con Blender (en cola, 1 crédito)

**Rama sugerida:** `feat/animation-hd-blender`
**Tipo:** Funcionalidad nueva
**Estado:** propuesta. No hay nada implementado.
**Área:** animation-studio (Supabase), nuevo worker de render, AnimationScene, Space

---

## 1. Objetivo

En la pantalla de Animación habrá un botón **HD**. Al pulsarlo:

1. Se cobra **1 crédito Pro**.
2. Se pone en cola un render en Blender de la misma animación: mismas escenas, mismo texto y misma voz, con un aspecto de "diorama de plastilina" en 3D.
3. El usuario puede seguir usando la app. Un aviso le dice: *"Tu versión HD estará lista en unos minutos. La encontrarás en el historial de tu Espacio."*
4. Cuando el render termina, el vídeo aparece en el historial de su Espacio.

**Presupuesto de tiempo:** lo ideal es menos de 1 minuto. El límite absoluto son **3 minutos**; si se superan, el render se aborta y se devuelve el crédito.

---

## 2. Opinión: es viable, pero no como en el artículo

El ejemplo de claymation (Opus + Blender) funciona así: el modelo escribe unas 400 líneas de Python para Blender, renderiza, mira el resultado, corrige y repite. El autor tardó **unos 30 minutos solo en el render** en un Mac, y cada ronda consume muchos tokens. Ese bucle no cabe en 3 minutos y tampoco lo necesitamos.

Lo que sí cabe en 3 minutos:

| El artículo | Curios HD |
|---|---|
| Un LLM escribe Python nuevo para cada escena | Un **script fijo de Blender** (`render.py`) construye la escena a partir de un **JSON** |
| Bucle en el que el modelo revisa y corrige el render | Sin bucle. El JSON se valida con código y el script es determinista |
| Opus decide escenas, cámara y tiempos | **Luna** convierte en JSON los *beats* que ya tiene la animación (unos 5 s) |
| EEVEE o Cycles en un Mac, unos 30 min | GPU serverless con el motor más rápido que dé buen aspecto (ver §5) |
| El usuario añade el sonido después | Se **reutiliza el audio del narrador** de la grabación que ya existe |

**Ventaja de seguridad:** el worker nunca ejecuta código escrito por un LLM, solo lee un JSON validado. El propio Blender avisa de que su servidor MCP ejecuta código generado sin ninguna protección; con este diseño evitamos ese riesgo.

**Regla 5 de CLAUDE.md:** el modelo solo decide qué objetos poner y qué cámara usar en cada beat. Los tiempos, los colores, el formato y el montaje los resuelve el código.

---

## 3. Flujo

```
[Botón HD] ──► animation-studio  action:"hd_start"
                 ├─ ¿ya existe la versión HD de esta pregunta? → se devuelve al momento, sin cobrar (ver P4)
                 ├─ comprueba y consume 1 crédito
                 ├─ Luna: beats del manifiesto → scene.json (vocabulario cerrado, §4)
                 ├─ animations.hd_status = 'queued'
                 └─ runCloudRunHd(key).catch(() => runRunPodHd(key))   ← mismo patrón que la grabación
                                │      (Cloud Run job GPU L4; RunPod Serverless async: su cola ES la cola)
                     worker hd-renderer (UNA imagen Docker: Blender headless + ffmpeg, sirve a los dos)
                       1. descarga scene.json y el MP4 actual (para sacar el audio)
                       2. blender -b -P render.py -- scene.json  → frames
                       3. ffmpeg: frames + audio del narrador + subtítulos → MP4 720p
                       4. sube a Cloudinary (upload firmado, como el recorder)
                       5. animation-studio action:"hd_report" {ok, url, seconds}
                                │
animation-studio ──► animations.hd_url / hd_status='ready'
                 └─ movie_projects del usuario: hd_video_url → aparece en el historial del Espacio
```

**Aborto a los 3 minutos:**
- **En el worker:** timeout de 180 s, tanto en la tarea del Cloud Run job como en el `executionTimeout` de RunPod.
- **En el servidor:** si `hd_status` lleva más de 4 min en 'queued', el siguiente `status` lo marca como 'failed' y devuelve el crédito.

Son dos reglas simples, sin cron y sin una cola propia.

**Sin bloquear al usuario:** el cliente no se queda esperando el resultado. Lanza el render y muestra un aviso. Cuando el usuario abre su Espacio o la pregunta, `status` le da la URL HD.

---

## 4. La escena: un vocabulario cerrado

Luna no escribe Python. Escribe un JSON con objetos que `render.py` sabe construir. Todo es procedural y no hace falta ningún asset con licencia:

- **Props (unos 20):** `block`, `sphere`, `cylinder`, `cone`, `arrow`, `coin`, `house`, `tree`, `cloud`, `person`, `gear`, `pipe`, `bars` (gráfico), `sign` (texto 3D corto), `card`, `globe`, `box`, `path`.
- **Acciones (unas 8):** `pop_in`, `hop_to`, `grow`, `spin`, `slide`, `stack`, `fade_out`, `pulse`.
- **Cámaras (5):** `push_in`, `orbit`, `pan`, `top_down`, `pull_back`. Hay una cámara por beat y el paso de una a otra es continuo.

```json
{
  "palette": "clay",
  "set": "workbench",
  "beats": [
    { "camera": "push_in",
      "props": [ { "id": "h1", "type": "house", "color": "coral", "at": [0, 0] },
                 { "id": "c1", "type": "coin",  "color": "accent", "at": [2, 1] } ],
      "actions": [ { "id": "c1", "do": "hop_to", "to": [0, 0] } ],
      "sign": "Precios" }
  ]
}
```

**Lo que resuelve el código, no el modelo:**
- **Duración de cada beat:** se calcula con palabras ÷ 2,6 y luego se escala para que la suma coincida con la duración real del audio grabado.
- **Animación "on twos":** el script renderiza 12 imágenes por segundo, y ffmpeg dobla cada una para dar 24 fps.
- **Movimiento de plastilina:** un pequeño temblor aleatorio en cada pose (*boil*), con semilla fija, y una textura de huellas hecha con ruido.
- **Paleta:** un conjunto fijo de colores "plastilina", aparte de DESIGN.md. Ocurre lo mismo que con las paletas de las animaciones: es el escenario del vídeo, no la interfaz de la app.
- **Subtítulos:** se generan de los `say` con un `.srt` y ffmpeg los incrusta.

La validación descarta los props y acciones desconocidos, recorta las coordenadas y limita a 12 objetos por beat. Si el JSON no se puede usar, se cae a una escena genérica (bloques y carteles con el `label` de cada beat). La versión HD nunca falla por culpa del modelo.

---

## 5. Tiempo de generación (estimado; la Fase 0 lo confirma)

Partimos de una animación típica de 5 a 7 beats de unos 10 s (unos 60 s), en 720p, renderizada on twos: **720 imágenes**.

| Paso | Workbench "clay" | EEVEE |
|---|---|---|
| Luna → scene.json | 3–8 s | 3–8 s |
| Arranque del worker (frío / caliente) | 20–60 s / 2–5 s | 20–60 s / 2–5 s |
| Construir la escena | 2–5 s | 2–5 s |
| Render de 720 imágenes | **15–40 s** (0,02–0,05 s cada una) | **60–220 s** (0,08–0,3 s cada una) |
| ffmpeg (audio, subtítulos, encode) y subida | 8–15 s | 8–15 s |
| **Total** | **≈ 0,5–2 min** ✅ | **≈ 1,5–5 min** ⚠️ |

**Workbench** es el motor de visualización de Blender. Con el *matcap* de plastilina, *cavity*, sombras y profundidad de campo da un aspecto de plastilina bastante convincente y es entre 5 y 10 veces más rápido que EEVEE. Es lo único que cumple con seguridad el ideal de 1 minuto. EEVEE se ve mejor (luz suave, transparencia de la plastilina), pero se pasa del límite en animaciones largas, salvo que dividamos el render en varios workers en paralelo. Eso no lo propongo para la v1.

**Propuesta:** Workbench en la v1, y EEVEE solo si la Fase 0 demuestra que entra en 3 min.

---

## 6. Coste por animación HD (estimado)

| Concepto | Coste |
|---|---|
| Luna (scene.json, unos 2k tokens de salida) | < $0,005 |
| GPU de 1 a 3 min. **Cloud Run L4: lo pagan los créditos de startup.** Fallback RunPod (L4 ~$0,0002/s; 4090 ~$0,0003/s) | **$0 con créditos / $0,02–0,06 en RunPod** |
| Arranque en frío (se factura) | hasta $0,02 |
| Cloudinary (unos 10–20 MB por vídeo) | despreciable dentro del plan |
| **Total** | **≈ $0,03–0,10 por HD** |

1 crédito cubre ese coste con margen. Si la versión HD de una pregunta ya existe, se sirve sin coste (ver P4). Los precios de GPU son aproximados y se verifican en la Fase 0, que se confirma antes de gastar (regla 6).

---

## 7. Cambios (cuando se apruebe)

| Pieza | Cambio |
|---|---|
| **Migración** | `animations`: `hd_status text`, `hd_url text`, `hd_started_at timestamptz`. `movie_projects`: `hd_video_url text` |
| **`supabase/functions/animation-studio/index.ts`** | Acciones `hd_start` y `hd_report` (con `RENDER_SECRET`, igual que `render_failed`). `toAnimation` devuelve `hdUrl` y `hd`. El aborto a los 4 min se comprueba dentro de `status` |
| **`supabase/functions/animation-studio/hd.ts`** (nuevo) | Prompt de Luna, `validateScene()` y escena genérica de respaldo |
| **`services/hd-renderer/`** (nuevo) | `Dockerfile` (Blender 5.x y ffmpeg), `render.py` (JSON → escena → frames) y `handler.py` (descarga, render, mux, subida y aviso). Con `ANIMATION_KEY` en el entorno funciona como Cloud Run job; si no, arranca como handler de RunPod |
| **Despliegue** | `.github/workflows/deploy-hd-renderer.yml`: construye la imagen una vez, la sube a Artifact Registry (Cloud Run) y a GHCR (RunPod), y actualiza el job. Secretos: `RUNPOD_API_KEY` y `RUNPOD_HD_ENDPOINT` en Supabase |
| **`AnimationScene.tsx`** | Botón **HD**: pasa por `requestProAccess()`, llama a `hd_start` y muestra el aviso. Indica si está en cola o lista |
| **Espacio (historial)** | El vídeo HD sustituye al normal en la tarjeta del historial, con una etiqueta **HD**. `hd_start` marca `saved` en el `movie_projects` del usuario para que aparezca aunque no lo hubiera guardado |
| **Tests** | `validateScene` (entrada basura → escena válida), escalado de tiempos (la suma coincide con el audio), aborto a los 4 min (devuelve el crédito) |

**Fuera de alcance de la v1:** formato vertical, EEVEE, render en paralelo, que Luna revise su propio render y animaciones de tipo "machine" o "simulation" (solo *story*).

---

## 8. Fases

0. **Prueba de rendimiento, sin código de producto.**
   - Se monta la imagen Docker, `render.py` y un scene.json escrito a mano.
   - Se renderiza 1 animación de 60 s con Workbench y con EEVEE en la GPU elegida.
   - Se mide el arranque en frío, los segundos por imagen y el coste.
   - **Coste:** menos de $1. Se pide confirmación antes de lanzarla.
   - **Decisión:** si el total supera 3 min con Workbench, nos replanteamos el proyecto.
1. Worker `hd-renderer`, desplegado en la GPU.
2. Migración y acciones en animation-studio, con el prompt de Luna y la validación.
3. Botón HD, aviso y presencia en Espacio y timeline.
4. Prueba completa en producción con la cuenta del dueño: 3 preguntas medidas (tiempo, coste y resultado).

---

## 9. Decisiones (30-oct-2026)

- **P1 · GPU:** Cloud Run GPU (L4) como opción principal y RunPod Serverless como fallback, con la misma imagen Docker.
  - Mientras la cuenta de facturación siga cerrada, todo el tráfico irá por RunPod.
  - Cloud Run GPU suele exigir pedir cuota de GPU L4 en la región, una sola vez.
- **P2 · Duración:** la animación completa, unos 60 s, reutilizando el audio del narrador.
- **P3 · Línea de tiempo:** el **historial del Espacio**.
- **P4 · Si la versión HD ya existe:** se sirve **gratis y al momento**.

## 10. Preguntas que siguen abiertas

- **P5 · Si falla o se aborta:** se devuelve el crédito automáticamente (propuesto).
- **P6 · Cobro en el servidor:** hoy `consumeCredit` corre en el cliente. Para un recurso que cuesta dinero, propongo que `hd_start` compruebe y descuente el crédito en el servidor, leyendo `profiles.remaining_pro_quota`.
