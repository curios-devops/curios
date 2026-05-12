ESPECIFICACIÓN: AI VIDEO GENERATION ENGINE (v1)

🎯 OBJETIVO DEL SISTEMA

Generar un video corto (24–32s) a partir de un prompt de usuario con:
	•	Tiempo a primer frame < 3 segundos
	    3 a 4 escenas
	•	Playback inmediato
	•	Mejora progresiva de calidad sin interrumpir reproducción
	•	Coste controlado por request

⸻

🧩 COMPONENTES DEL SISTEMA

1. ORCHESTRATOR (MINI-BRAIN)

Responsabilidades:
	•	Interpretar el prompt del usuario
	•	Definir estilo del video
	•	Determinar número de escenas (3 o 4)
	•	Activar flujos paralelos

Output estructurado:

Intent:
- tipo: explainer | cinematic | ad | story
- tono: emocional | informativo | humor
- duración objetivo: 20–32s

Escenas: (max 8 segundo each)
- Scene 1: hook 
- Scene 2: desarrollo
- Scene 3: payoff
- Scene 4: opcional

Reglas:
	•	Nunca bloquear esperando recursos externos
	•	Siempre priorizar velocidad sobre perfección

⸻

2. SCENE PLANNER (DIRECTOR AGENT)

Responsabilidades:
	•	Convertir intención en escenas detalladas

Cada escena debe incluir:

Scene ID
Duración estimada (1–3s)
Visual prompt (descriptivo y concreto)
Movimiento (zoom, pan, static, etc.)
Narración (1 frase corta)
Prioridad (high / medium / low)

Reglas:
	•	Scene 1 siempre = máxima prioridad
	•	Máximo 2 sujetos visuales por escena
	•	Evitar prompts complejos en fase inicial

⸻

3. DUAL PIPELINE SYSTEM

El sistema se divide en dos flujos paralelos:

⸻

🟢 FLOW A — FAST RENDER (CRÍTICO)

Objetivo:

Generar primera y segunda escena reproducible muy rapido
en caso de fall back a video stock (pexles) en este caso generar terminos para busqueda  de cada escena ir a buscar 1 video para cada escenas. Para evitar muchos procesos simultaneos busca solo 2 videos (1ra y 2da escena, respetando el api rate de 1 seg), cundo tengas los videos actualizas las escenas con los snap shot de los videos , y repitas para videos 3 y 4 si existe.

Pasos:

3.1 Generación de video rápido

Estrategia:
	•	Opción A: modelo rápido tipo LTX (no esta conectado aun asi que implemetar y comentar)
	•	Opción B: Video stock de pexles


3.2 Playback Fast

Regla crítica:
	•	El video debe comenzar apenas tenemos primera escena lista
	•	en paralelo (1 seg para respetar api rate) sigues con la siguinete escena. 
	cuando las dos primera escenas estan listas vas por 3ra y 4ta 

⸻

🔵 FLOW B — QUALITY UPGRADE

Objetivo:

Mejorar el video mientras el usuario ya lo está viendo

⸻

4.1 Generacio de escenas inversas
    para aumentar la chance que el usuario vea video mejorado, 
	apenas tenemos escena 1 parte playback, luego playback de escena 2 3 y 4, siempre la escena de alta calidad remplaza la draft (podemos indicarlo en alguna pate Draft - Final) 

Prioridad:
	1.	penultima (1 seg rate limit) ultima
	2.	si termina remplaza la Fast
	3.	Video se ejecuta en secuencial escna 1 .. 4 si existe escena de calidad (Veo Video) de va al play con esta (remplaza o pisa a la fast low queslity) 

⸻

4.2 Generación de video de alta calidad

Usar:
	•	Google Vertex AI (Veo )

Input:
	•	prompt refinado
	•	

4.5 Reemplazo progresivo

Comportamiento:
	•	El usuario no debe notar cortes bruscos
	•	Swap solo cuando el segmento esté listo

⸻

🎛️ SCHEDULER (CONTROL DE RECURSOS)

Objetivo:

Evitar saturación del sistema esperar terminen para llamar proximo

⸻

Reglas de concurrencia:

Video high quality jobs: máximo 2
Video Fast jobs: maximo 2 

⸻

Prioridad de ejecución:
	1.	Scene actualmente visible
	2.	Próxima escena inmediata

	

⸻

Política de cancelación:
	•	Si el usuario abandona → detener FLOW B
	•	Si timeout > 30 segundos → cancelar upgrades


🎬 COMPOSITION ENGINE

Responsabilidades:
	•	unir escenas
	•	asegurar continuidad visual 

⸻

Output formats:
	1.	Preview (rápido)
	2.	Standard (quality)
	


🚨 REGLAS DE ORO
	1.	Nunca bloquear esperando calidad
	2.	Siempre mostrar algo rápido
	3.	El primer segundo importa más que el último
	4.	Solo mejorar lo que aporta valor visual
	5.	El sistema debe degradar bien (no romperse)

⸻

🧠 DEFINICIÓN FINAL DEL SISTEMA

Este sistema no es:

un generador de video HQ

Es:

un motor de render progresivo en tiempo real

the fall back with pexles works like sharm, we need: 1.  to double check to pass from one scene to next scen automatically, also 2. review the questions to pexels to make more related to title in the Scene. 

3.Also   refactor the flow a bit, for any scene we will upload the text with its audio (8sec) from elevent labs then and ask CLODDINARY via API for compresion and adding caption text (with the text) and ask to compress, and them download the final video with audio and replace as final in the Video and save it to supabase (so never try to save row video from Quality Video since to huge).   4. finally dimplement a timeout if video never arrives or taking to long just cancel the video so the app do not get stuck,  and save any reamining scene in draft mode in supabase