# 🎬 Studio Architecture - Updated Phase 6

## Default Studio Output (MVP)

### Video Format Specifications

**Duration:** 30s (range: 20-90s, flexible to match content)  
**Ratio:** 
- Vertical 9:16 (mobile/TikTok/Reels/Shorts)
- Horizontal 16:9 (desktop/YouTube)

### Video Structure (5-scene template)

1. **Hook (3s)**  
   → Strong stock video + large text  
   → Image overlay: None (video-only for impact)

2. **Key Point 1 (7s)**  
   → Stock video background + text animation + subtitles  
   → Image overlay: Optional (supporting evidence)

3. **Key Point 2 (7s)**  
   → **Brave Image Search overlay** (blur + zoom effect)  
   → Stock video base layer continues

4. **Key Point 3 (7s)**  
   → Stock video + supporting visuals  
   → Image overlay: Optional

5. **Conclusion (5s)**  
   → Stock video + CTA  
   → Image overlay: None

### Asset Strategy

**Base Layer (Background):**
- ✅ Stock videos from Pexels/Unsplash
- Continuous, cinematic footage
- Mood-driven (emotion + context)

**Overlay Layer (Supporting Evidence):**
- ✅ Brave Image Search results
- Short duration (3-5s per image)
- Used for key points only (2-3 per video)
- Never as continuous background
- Effects: Ken Burns, blur, zoom, fade

**Audio Layer:**
- ✅ OpenAI TTS narration
- Clear, neutral voice (nova default)
- Fast pacing
- Synchronized with scenes

**Text Layer:**
- ✅ Large, readable subtitles
- Works without sound
- Animated overlays
- Minimal branding

---

## Visuals

### Asset Types
- **Real images:** Brave Image Search + Pexels/Unsplash
- **Screenshots:** When demonstrating tools/apps
- **Icons:** Minimal, supporting concepts
- **Highlights:** Draw attention to key elements
- **Zooms:** Emphasize specific details
- **Motion:** Ken Burns effect, smooth fades
- **Branding:** Soft watermark (bottom right corner)

### Audio
- Clear AI voice narration
- Neutral synthetic voice
- Fast pacing
- **Large subtitles** (CRITICAL - must work muted)

4. Por qué este formato es el más viralizable

Porque:
	•	Se entiende sin sonido
	•	Se entiende en 5 segundos
	•	No depende del realismo
	•	Se percibe como “útil”, no como demo tech
	•	Es compartible en:
	•	WhatsApp
	•	Instagram
	•	TikTok
	•	LinkedIn

5. Cómo hacerlo sticky (esto es clave)

decisiones que multiplican retención:
	1.	Formato consistente
	•	Siempre el mismo estilo
	•	Reconocible en feed
	2.	Lenguaje humano
	•	Nada corporativo
	•	Nada académico
	•	“Here’s what’s really going on…”

Y aquí viene lo importante:

Cada video lleva tu marca dentro 
	•	Intro/outro muy sutil
	•	“Created with _”
	•	Watermark ligero ((soft CuriosAI Watermak on right down corner))


✅ Base visual = stock libre (Pexels / Unsplash)

➕ Apoyo contextual = imágenes de búsqueda SOLO como “referencia visual”, no como hero

Es decir:
	•	Pexels = cuerpo del video
	•	Imágenes de búsqueda (brave Search image)  = overlays, highlights, frames cortos

Regla base (la más importante)

❌ NO busques lo que el usuario preguntó
✅ Busca la idea visual que representa eso

Ejemplo:

User query: “Is AI taking jobs?”

❌ Buscar: AI jobs automation
✅ Buscar: office empty, people working laptop, future work

Search strategy for web images
	1.	Use 3–5 keywords / concept terms per chunk
	•	Mood + Action + Metaphor
	•	Include the topic briefly if needed
⸻

2. El framework de búsqueda (úsalo siempre)

Para cada video genera 3 buckets de búsqueda, en este orden:

🟢 Bucket 1 — Context / Mood

¿Qué emoción transmite el tema?

Ejemplos:
	•	uncertainty
	•	growth
	•	pressure
	•	innovation
	•	simplicity
	•	chaos
	•	focus

👉 Esto da imágenes “cinematográficas” que funcionan como fondo.

⸻

🔵 Bucket 2 — Human action

Qué está haciendo una persona en relación al tema.

Ejemplos:
	•	thinking
	•	working
	•	scrolling phone
	•	presenting
	•	explaining
	•	collaborating
	•	waitin…



Example Flow: 
	1.	User request → recipe JSON (60s video)
	2.	Split into 12 × 5s chunks
	5.	Stitch full video (later optional) for download or social sharing

Video Image Pipeline (Hybrid: Stock + Web Search)

Goal
	•	For each video chunk, fetch 2–3 high-quality images that match the script, mood, and context.
	•	Use engineered queries for both stock APIs and Brave image web search.
Step 1 — Generate the video recipe
	1.	User query → LLM
	2.	LLM outputs per chunk:
	•	Subtitle / script text
	•	Mood / energy
	•	Image keywords (1-3 per chunk, engineered)
{
  "chunks": [
    {
      "script": "Remote work is declining worldwide...",
      "mood": "uncertain",
      "keywords": ["empty office", "people leaving work", "closed doors"]
    },
    {
      "script": "Companies are bringing employees back...",
      "mood": "hopeful",
      "keywords": ["team meeting", "collaboration", "office interaction"],
  
    }
  ]
}
Use  Engineered Query for Web Image Search

raw user query problem: 
	•	Example: “Why is remote work declining?” → search engine might return:
	•	Random office photos
	•	Charts
	•	News logos
	•	❌ Often too literal, irrelevant, or noisy

So use engineered query:
	•	Example: “Remote work decline empty office deserted desks uncertainty”
	•	✅ Much higher chance of finding visually coherent and editorial-style images
	•	Adds mood + metaphor + context (just like stock pipeline)

Bottom line:
	•	Even when using Brave search / Google image always engineer the query. Treat the search engine like a “stock image + editorial source,” not a literal info retrieval tool.

⸻
	