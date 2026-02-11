Estrategia recomendada para TU producto

✅ Reglas simples
	1.	El dispositivo define el preview
	•	Desktop → horizontal
	•	Mobile → vertical
	2.	El destino define el export
	•	TikTok → 9:16
	•	YouTube → 16:9
	•	Instagram feed → 1:1 o 4:5
	3.	Siempre existe un master
	•	El usuario puede descargarlo
	•	Tú mantienes control de calidad
	4.	Safe zone siempre visible
	•	UI la muestra
	•	AI intenta respetarla al generar es decir texto solo dentro de safe zone asi al ajustar siempre texto es visible pues está en safe zone
6️⃣ Implementación técnica (sin volverte loco)
	•	Frontend
	•	CSS + container queries para preview adaptativo
	•	Overlay SVG para safe zones
	•	Backend (VM / Python / FFmpeg)
	•	Presets:
	•	crop=9:16 center
	•	scale + pad
	•	blur background (opcional, queda pro)
Objetivo del Agente

Dado:
	•	1 tema general
	•	N capítulos (con longitud relativa)
	•	~20 imágenes devueltas por una sola búsqueda
	•	Tras filtro → quedan 5–8 imágenes útiles

El agente debe:
	•	Asignar inteligentemente imágenes a capítulos
	•	Respetar prioridades por longitud
	•	Evitar repeticiones
	•	No forzar asignaciones débiles
	•	Minimizar llamadas a APIs

⸻

🧠 Arquitectura del Agente Autónomo

Lo diseñamos como un agente con 4 fases internas:
1. Entrada:
	•	Tema general
	•	Lista de capítulos

Acción:
	•	Hace 1 búsqueda amplia
	•	Query = tema general + subtemas concatenados
	•	Obtiene 20 imágenes
	•	Filtra:
	•	elimina duplicados
	•	elimina imágenes genéricas tipo “abstract background”
	•	elimina títulos irrelevantes

Resultado:
→ 5–8 imágenes candidatas

2. El agente:
	1.	Extrae keywords simples de cada capítulo
	2.	Evalúa si el título de imagen contiene coincidencias básicas
	3.	Marca:
match_strength:
- strong
- medium
- weak
	4.	Calcula prioridad por longitud:
chapter_priority:
- high
- medium
- low
Inteligente (1 sola llamada LLM)

Aquí el agente actúa como orquestador racional.

El LLM recibe:
	•	capítulos
	•	prioridad de cada uno
	•	imágenes
	•	fuerza de match preliminar
	•	reglas duras

Reglas:
	•	Máx 2 imágenes por capítulo
	•	Capítulos high pueden recibir 2
	•	Medium → 1–2
	•	Low → 0–1
	•	No forzar imágenes weak
	•	Mejor dejar una imagen sin usar que asignarla mal

El LLM devuelve JSON estructurado:
chapter → image_ids[]
Nada más.

⸻

🔹 FASE 4 — Validación automática

El agente valida:
	1.	¿Algún capítulo tiene más de 2 imágenes?
	2.	¿Se asignó una imagen marcada “weak” cuando hay otra “strong” disponible?
	3.	¿Se ignoró un capítulo high sin razón?

Si algo falla:
	•	Se hace una segunda llamada LLM de corrección
	•	“Reequilibra respetando reglas”

En 95% de casos no será necesario.

⸻

🧠 Lógica de Distribución Inteligente

El agente sigue este principio:

Relevancia > Prioridad > Equilibrio

Orden mental del agente:
	1.	Asignar imágenes con match fuerte primero
	2.	Priorizar capítulos high
	3.	Luego distribuir medium
	4.	Dejar low con 0 si no hay match claro

Nunca fuerza simetría artificial.

⸻

📊 Flujo Completo
Tema general
     ↓
1 búsqueda amplia
     ↓
Filtro básico
     ↓
Scoring heurístico
     ↓
LLM distribución
     ↓
Validación
     ↓
Resultado final
Total:
	•	1 búsqueda externa
	•	1 llamada LLM
	•	(ocasionalmente 2)

Muy eficiente.

⸻

🔥 Por qué este diseño es elegante
	•	Reduce 5 búsquedas → 1
	•	Reduce 5 llamadas LLM → 1
	•	No necesita embeddings
	•	No necesita visión
	•	Escala bien
	•	Fácil de mantener
	•	Determinista con reglas claras

⸻

🧠 Comportamiento emergente interesante

Este agente empieza a comportarse como un pequeño editor humano:
	•	Prioriza capítulos centrales
	•	No sobrecarga capítulos débiles
	•	Mantiene coherencia temática
	•	Evita relleno innecesario

⸻

🚀 Futuro (sin romper simplicidad)

Si algún día quieres mejorar sin complicar:
	•	Guardar estadísticas de asignación
	•	Aprender qué imágenes los usuarios prefieren
	•	Ajustar heurísticas de prioridad

Pero la base ya es sólida.