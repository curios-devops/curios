# CuriosAI Visual Generation Enhace Pipeline v1.0

## Objetivo

Generar videos explicativos con el mayor nivel posible de realismo visual, manteniendo control creativo y minimizando el aspecto "AI generated".

---

# Arquitectura General

```text
User enhace request
     │
     ▼
LLM Reasoning Agent
     │
     ├── Classifier Agent
     │        │
     │        ├── News / Current Events
     │        ├── Historical
     │        ├── Scientific
     │        ├── Abstract Concepts
     │        └── Entertainment
     │
     ▼
Visual Strategy Agent
     │
     ├── Real Image Pipeline
     ├── Hybrid Pipeline
     └── Full AI Pipeline
     │
     ▼
Video Animation Agent
     │
     ▼
Final Video Assembly
```

---

# STEP 1 — Content Classification Agent

El primer agente determina qué nivel de realismo requiere el contenido.

## Prompt

```text
Analyze the user query and classify it into one of the following categories:

1. BREAKING_NEWS
2. CURRENT_EVENTS
3. HISTORICAL
4. SCIENCE
5. EDUCATION
6. ABSTRACT
7. FICTION
8. ENTERTAINMENT

Additionally assign:

REALISM_SCORE:
0 = artistic
100 = photojournalistic

Return JSON only.
```

## Ejemplos

### Input

```text
What happened in the Iran-Israel conflict?
```

Output:

```json
{
  "category": "BREAKING_NEWS",
  "realism_score": 95
}
```

---

### Input

```text
Explain black holes
```

Output:

```json
{
  "category": "ABSTRACT",
  "realism_score": 20
}
```

---

# STEP 2 — Visual Strategy Agent

## Regla principal

```text
if realism_score > 80:
    use REAL pipeline

if realism_score between 50 and 80:
    use HYBRID pipeline

if realism_score < 50:
    use FULL_AI pipeline
```

---

# PIPELINE A — REAL (Noticias)

## Objetivo

Conservar el máximo realismo.

---

## Workflow (Mix search Image + prompt text)

```text
Search/use Images (EXA / fallback to brave)
       ↓
Quality Ranking
       ↓
Copyright Filtering
       ↓
Regenerate image (Input Image + prompt text )
       ↓
Micro Animation
       ↓
Video
```

---

## Search Query Generation

Prompt:

```text
Generate 5 photojournalistic search queries for this topic.

Requirements:
- Reuters style
- AP style
- documentary photography
- realistic photography
- editorial photography
```

---

## Ranking Model

Score:

```text
score =
0.4 realism
+0.2 resolution
+0.2 composition
+0.1 face quality
+0.1 freshness
```

---

## Animation Rules

Allowed:

* slow zoom
* dolly in
* dolly out
* pan left
* pan right
* parallax 2.5D
* rack focus

Forbidden:

* lip sync
* body generation
* facial regeneration
* object creation
* camera spins

---

# PIPELINE B — HYBRID (remic current promt text with new prompt from image -> generate new image)

## Objetivo

Usar una imagen real como ancla y recuperar control creativo.

---

## Workflow

```text
Search Image
      ↓
Vision Analysis
      ↓
Scene Extraction
      ↓
Prompt Remix
      ↓
Regenerate
      ↓
Animate
```

---

## Vision Extraction Prompt

```text
Analyze this image and extract:

- environment
- camera angle
- focal length
- lighting
- mood
- composition
- subject description
- colors
- photography style

Return JSON only.
```

---

## Prompt Fusion

Template:

```text
Create a highly realistic image.

SCENE:
{user_scene}

REFERENCE_STYLE:
{vision_analysis}

Requirements:
- photojournalism
- documentary photography
- realistic skin
- natural lighting
- imperfect framing
- authentic camera noise
- real lens artifacts
- candid photography
```

---

# PIPELINE C — FULL AI

## Objetivo

Máxima libertad visual.

---

## Workflow

```text
Script
   ↓
Storyboard
   ↓
Image Generation
   ↓
Video Generation
```

---

## Realism Prompt Booster

Añadir siempre:

```text
photojournalism,
documentary photography,
Reuters style,
AP style,
candid shot,
natural lighting,
real skin texture,
imperfections,
slight motion blur,
unedited photograph,
camera sensor noise,
50mm lens,
realistic depth of field
```

---

# STEP 3 — AI Detection Layer

Después de generar la imagen:

```text
Generated Image
        ↓
AI Detector
        ↓
Visual Quality Score
```

---

## Metrics

Evaluar:

* skin realism
* eye realism
* hand realism
* texture realism
* lighting realism
* background realism

---

## Decision

```text
if realism < 85:
     regenerate

if realism > 85:
     accept
```

---

# STEP 4 — Video Generation

## Prompt Template

```text
Create realistic camera movement.

Rules:
- preserve identity
- preserve lighting
- preserve textures
- preserve composition
- no object generation
- no facial deformation
- documentary cinematography

Movement:
{camera_motion}
```

---

# STEP 5 — Final Assembly

```text
Narration
      +
Video clips
      +
Captions
      +
Background music
      +
Transitions
      ↓
Final MP4
```

---

