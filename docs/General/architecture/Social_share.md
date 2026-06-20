Me gusta mucho la dirección. Yo pondría una introducción bien ejecutiva antes de la arquitectura técnica, enfocada en que **Share no es una feature aislada**, sino una **capa transversal de distribución inteligente** que todos los servicios reutilizan.

Te dejo el blueprint para el agente:

---

# Blueprint — Dynamic Share Layer (Cross-Service Social Distribution)

## Executive Summary

La plataforma incorporará una funcionalidad transversal llamada **Dynamic Share Layer**, diseñada para permitir que cualquier contenido generado por los distintos servicios (Fast Search, Avatar, Movie, Histories, etc.) pueda compartirse de forma inmediata hacia las redes sociales más relevantes según el tipo de contenido.

El objetivo no es simplemente “agregar botones de share”, sino construir una **capa de distribución contextual** que optimice el engagement seleccionando dinámicamente las plataformas más adecuadas para cada output.

Ejemplos:

* **Fast Search / Histories** → contenido informativo (imagen + texto)
  Prioridad:

  * [X](https://x.com?utm_source=chatgpt.com)
  * [LinkedIn](https://www.linkedin.com?utm_source=chatgpt.com)
  * [Facebook](https://www.facebook.com?utm_source=chatgpt.com)
  * [WhatsApp](https://www.whatsapp.com?utm_source=chatgpt.com)

* **Movie / Avatar** → contenido audiovisual short-form
  Prioridad:

  * [TikTok](https://www.tiktok.com?utm_source=chatgpt.com)
  * [Instagram](https://www.instagram.com?utm_source=chatgpt.com)
  * [YouTube Shorts](https://www.youtube.com?utm_source=chatgpt.com)

Esto transforma cada servicio en un generador de contenido **nativamente shareable**, aumentando:

* virality
* retention
* organic acquisition
* content reuse

---

# UX Specification — Share Row

La experiencia de usuario se implementará mediante un componente reusable llamado:

```tsx
<DynamicShareRow />
```

Visualmente será un **horizontal icon row**, similar al diseño ya existente en Search.

## UX Principles

### 1. Context-aware

La row cambia según el servicio que renderiza el contenido.

Ejemplo:

Fast Search:

```text
[X] [LinkedIn] [Facebook] [WhatsApp]
```

Movie:

```text
[TikTok] [Instagram] [Shorts]
```

---

### 2. Minimal friction

El usuario debe poder compartir en 1 click:

```text
Generate → Preview → Share
```

Sin modals innecesarios.

---

### 3. Dynamic ordering

La prioridad de redes no es fija.

La row debe construirse dinámicamente desde configuración:

```ts
shareConfig[serviceType]
```

Ejemplo:

```typescript
const shareConfig = {
  fast_search: ["x", "linkedin", "facebook", "whatsapp"],
  movie: ["tiktok", "instagram", "youtube_shorts"],
  avatar: ["tiktok", "instagram", "youtube_shorts"]
}
```

Esto permite A/B testing futuro.

---

# Placement Rules by Service

## Fast Search

Ubicación:

```text
Image Carousel
↓
Dynamic Share Row
↓
Outline Section
```

Orden exacto:

1. Carousel de imágenes
2. Share row
3. Outline / structured response

---

## Avatar

Ubicación:

```text
Avatar Block
↓
Dynamic Share Row
↓
Title
↓
Text Body
```

---

## Movie

Ubicación:

```text
Main Video
↓
Dynamic Share Row
↓
Title
↓
Description
```

---

# Technical Architecture

## Core Component

```typescript
interface ShareOption {
  id: string
  icon: ReactNode
  label: string
  handler: () => void
}

interface DynamicShareRowProps {
  serviceType: ServiceType
  contentPayload: SharePayload
}
```

---

## Share Payload

Todos los servicios deben serializar su output a un formato común:

```typescript
interface SharePayload {
  title?: string
  description?: string
  text?: string
  imageUrls?: string[]
  videoUrl?: string
  deepLink?: string
}
```

Esto desacopla generación de contenido de distribución.

---

# Social Connector Layer

Cada plataforma tendrá su adapter.

```typescript
interface SocialConnector {
  share(payload: SharePayload): Promise<void>
}
```

Ejemplo:

```typescript
class XConnector implements SocialConnector {}
class LinkedInConnector implements SocialConnector {}
class TikTokConnector implements SocialConnector {}
```

Ventajas:

* modularidad
* testabilidad
* soporte futuro OAuth/API publishing

---

# Phase 1 — Implementation Scope

## Goal

Implementar **Fast Search share row only** como primer MVP.

Movie y Avatar quedan definidos, pero no implementados aún.

---

# Fast Search MVP Tasks

## Task 1 — Audit Existing Search Share Code

Ya existe una funcionalidad de share en Search, aunque no está completamente operativa.

El agente debe:

### Encontrar:

* componente share actual
* handlers existentes
* utilidades de share
* icon assets
* lógica de deep links / native share

Buscar especialmente:

```bash
share
ShareButton
navigator.share
social
```

Objetivo:

Determinar qué partes pueden reutilizarse.

---

## Task 2 — Compare Existing vs New Architecture

Documentar:

### Reusable

* icon rendering
* native share utility
* URL builders

### Refactor Needed

* hardcoded buttons
* service-specific logic
* duplicated handlers

---

## Task 3 — Create Generic Share Component

Crear:

```text
/components/share/DynamicShareRow.tsx
```

Responsabilidades:

* recibir serviceType
* resolver social config
* renderizar botones
* invocar connector correcto

---

## Task 4 — Implement Fast Search Providers

Primera configuración:

```typescript
fast_search: [
  "x",
  "linkedin",
  "facebook",
  "whatsapp"
]
```

Handlers iniciales:

### X

Share text + URL

### LinkedIn

Share URL / article

### Facebook

Share link

### WhatsApp

Share text + URL

---

## Task 5 — Integrate into Fast Search UI

Insertar componente en:

```tsx
FastSearchView
```

Exactamente:

```tsx
<ImageCarousel />

<DynamicShareRow
   serviceType="fast_search"
   contentPayload={payload}
/>

<OutlineSection />
```

---

# Content Mapping for Fast Search

Transformar output de search a:

```typescript
const payload = {
  title: searchResult.title,
  description: searchResult.summary,
  text: searchResult.shareText,
  imageUrls: searchResult.images,
  deepLink: searchResult.url
}
```

---

# Non-Goals (Phase 1)

No implementar aún:

* TikTok upload
* Instagram API publish
* YouTube Shorts upload
* OAuth account linking
* Scheduled publishing
* Analytics

Eso pertenece a fases posteriores.

---

# Future Phases

## Phase 2

Movie share

* TikTok
* Instagram
* Shorts

## Phase 3

Avatar share

## Phase 4

Auto publishing backend

```text
Generate
→ Schedule
→ Publish
→ Analytics
```

---

# Deliverables Expected from Agent

El agente debe entregar:

### Code

* DynamicShareRow component
* share config
* social connectors
* Fast Search integration

### Documentation

* dónde estaba el share antiguo
* qué se reutilizó
* qué se refactorizó

### Demo

Fast Search funcionando con:

* X
* LinkedIn
* Facebook
* WhatsApp

---

Esto deja muy claro que **Share pasa a ser infraestructura de plataforma**, no una feature puntual de Search. Esa distinción arquitectónica vale oro porque después Movie, Avatar y cualquier nuevo servicio solo “enchufan” la misma capa.

Arquitectura conceptual para Avatar y Movie
               Jairo
                 │
                 ▼
         "Explícame agujeros negros"
                 │
                 ▼
        Tu motor de IA genera
        video vertical de 15 s
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
  Feed propio   Guardar   Compartir
                                 │
                 ┌───────────────┼────────────────┐
                 ▼               ▼                ▼
              TikTok        Instagram Reels    YouTube Shorts
Capa Social Connectors

Piensa en ella como adaptadores:

class SocialConnector:
    publish(video)

class TikTokConnector(SocialConnector):
    ...

class InstagramConnector(SocialConnector):
    ...

class YouTubeConnector(SocialConnector):
    ...

Así mañana puedes agregar:

TikTok
Instagram Reels
YouTube Shorts
X
Facebook Reels
LinkedIn
Snapchat

sin cambiar tu motor de video.

Primer MVP (muy fácil)
Paso 1

Generas:

MP4 vertical (1080x1920)
Título
Descripción
Hashtags

Ejemplo:

{
  "title": "¿Qué es un agujero negro?",
  "description": "Explicación en 15 segundos 🚀",
  "hashtags": ["#espacio", "#ciencia", "#ai"]
}
Paso 2

Botón:

Compartir en TikTok

En iOS y Android utilizas el Share Sheet nativo.

Tu app
 ↓
MP4
 ↓
Share Sheet
 ↓
TikTok
 ↓
Jairo publica

No necesitas API de TikTok ni aprobación.

Fase 2

El usuario conecta:

TikTok ↔ Tu app
Instagram ↔ Tu app
YouTube ↔ Tu app

Mediante OAuth.

Entonces:

Jairo
 ↓
Genera video
 ↓
✓ TikTok
✓ Reels
✓ Shorts
 ↓
Publicar
 ↓
Tu backend distribuye automáticamente
Fase 3 (muy interesante)

Tu app puede convertirse en una especie de Buffer/Hootsuite para videos generados por IA:

Prompt
 ↓
Generación
 ↓
Programador
 ↓
9:00 TikTok
9:05 Reels
9:10 Shorts
 ↓
Analytics
Visualizaciones
Likes
Seguidores
CTR
Visión más ambiciosa
Jairo:
"Hazme 30 videos sobre historia romana"

↓
Agente IA

↓
30 Shorts

↓
Programador automático

↓
Publica durante 30 días en:

TikTok
Instagram
YouTube Shorts

↓
Analiza resultados

↓
Aprende qué temas funcionan mejor

↓
Genera los siguientes 30 videos automáticamente

Eso ya se parece más a un "Canva + CapCut + Buffer + TikTok Studio impulsado por IA", y es un mercado enorme.