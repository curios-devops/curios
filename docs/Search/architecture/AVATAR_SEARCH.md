Nuevo servicio de Avatar con subtítulos

we will to create a new functionality for this we will update the input box in the home page, by default now shows an arow '->' now new by default will have  the  with tool bar use voice similar to chat gpt. when use write inside the search box it automatically change to arrow, but if press witout adding text then it  start recordng and use openai wisper to get the question and trigger the text Query that should open a new AvatarSearchResults page, and will be part of the Search Functionality.
Also in home page we have a mic button, when user press mic add the wisper functionallity to record and write in the inbox. 
when write in the inbox mic is replaced by Avatar icon so if user press avatar insted of arrow it redirect to the new AvatraSearchResults, if press arrow keep the current flow

UX de la página de respuestas : AvatarSearchResults,  se debe basar en la pagina actual de respuestas de Search como base adaptandola para reremplazar algunos elementos por los especificos de esta nueva paguina AvatarSearchResults


1️⃣ Avatar
	•	Imagen cuadrada  en lugar donde van las 2 x 2 imagenes actualmemte
	•	Representa al asistente que habla las respuestas.
	•	Mantiene la sensación de interacción visual sin ocupar toda la pantalla.
	para el avatar usar el servicio Aurora de elevenLabs

⸻

2️⃣ Subtítulos dinámicos
	•	Texto sincronizado con la voz generada por ElevenLabs.
	•	Estilo narrative-friendly: frases cortas, fáciles de leer, con ligera puntuación narrativa.
	•	Permite minima personalización: caption (on /off) color de fondo del texto ( B/W/ Asscent) , tamaño (s-M-L), location (Midle /Down) use just icon here no text .
	•	Ubicados justo sobre la imagen del avatar (midel) o debajo (down), centrados visualmente.

⸻

3️⃣ Texto completo de la respuesta
	•	Se muestra debajo del avatar y los subtítulos.
	•	Narrativa amigable: organizar el texto en párrafos claros y legibles, como si un narrador contara la respuesta.
	•	Scrollable si la respuesta es larga.
	•	Permite copiar el texto completo fácilmente.
    (ojo que tenimaos ya un genrador de la respuesta pero aqui a difrencia de regular search la respuesta es de narrativa amigable )
⸻

4️⃣ Botones de acción (debajo del avatar)
	•	[Descargar] → descarga el audio/video de la respuesta.
	•	[Cambiar Avatar] → solo disponible en Pro, permite seleccionar otro avatar.
	•	[Mic] → habilita entrada de voz del usuario.

⸻

5️⃣ Indicadores de estado (reciclar el que ya existe)
	•	Mostrar cuando la respuesta está generándose:
	•	“⏳ Generando respuesta…”
	•	Barra de progreso o icono animado para TTS y avatar.
	•	Opcional: indicador de “Audio listo” o “Avatar actualizado”.

⸻

Flujo del UX / interacción

Se puede representar en ASCII text como diagrama de flujo:

Usuario envía pregunta (voz desde Home page)
           │
           ▼
   Generación de respuesta
      (OpenAI / LLM)
           │
           ▼
   Generación de voz
   (ElevenLabs TTS)
           │
           ▼
  Actualización del avatar
  (Imagen cuadrada, sincronizada)
           │
           ▼
  Subtítulos dinámicos
  (sobre o debajo del avatar)
           │
           ▼
Visualización en la página
 ┌──────────────────────────┐
 │ Avatar + Subtítulos      │
 │ Botones de acción        │  
 │ Texto completo scrollable│
 │ Indicadores de estado    │
 └──────────────────────────┘
           │
           ▼
   Interacción usuario
/ [Cambiar Avatar] / [Descargar] [Mic] 
(usar icones no texto) 


🔹 Notas para el agente
	•	El UX debe priorizar claridad narrativa y accesibilidad.
	•	Subtítulos dinámicos + texto completo permite lectura opcional mientras se escucha la voz.
	•	Los botones de acción están siempre visibles justo debajo del avatar.
	•	Mantener indicadores de estado visibles para informar al usuario de progreso.
	•	Todo debe ser TypeScript / front-end friendly, sin necesidad de backend dedicado.

---

## 🎯 Implementation Summary

### Search Box Button Behavior:

**Empty Search Box**:
- Left: **Mic Icon** 🎙️ - Records voice → Transcribes to text box (Whisper API)
- Right: **Equalizer Icon** 📊 - Direct Avatar Search (future: voice → Avatar Search)

**Search Box with Text**:
- Left: **Person/Avatar Icon** 👤 - Navigate to `/avatar-search`
- Right: **Arrow Icon** → - Navigate to `/search` (regular)

### Files Modified:
- `src/components/boxContainer/ButtonBar.tsx` - Added EqualizerIcon, User icon, dual button modes
- `src/components/boxContainer/QueryBoxContainer.tsx` - Split handlers: `handleVoiceClick` (Mic) + `handleAvatarClick` (Avatar)
- `src/services/whisper/whisperService.ts` - Whisper API integration
- `src/services/legacy-search/avatar/` - All avatar search components and services
- `src/main.tsx` - Added `/avatar-search` route

### API Keys Used:
- `OPENAI_API_KEY` - Whisper transcription + Narrative generation
- `ELEVENLAB_API_KEY` - Aurora avatar video + TTS
