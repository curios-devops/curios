🎬 CuriosAI CINEMATIC UX — Spec v2 (Scene-based)

0. Modelo base (ready) 

* Cada respuesta = 3–4 escenas
* Cada escena = unidad independiente (video corto 6-8 sg + Audio + caption)
* Cada escena puede usar un engine distinto (todas usan CLOUDINARY para agregar AUDIO (elevenlabs fallback to openaitts )) + captions 
* Render paralelo con límites

⸻

1. Engines (orden de progresión mas rapido y simple a mas quality lento)

Pexels → LTX → WAN → Veo

* Pexels = base obligatoria (pixabay fallback)
  - Draft video (raw, no audio) → shows in carousel only
  - Draft video + Cloudinary mix (audio + captions) → mixedVideoUrl ready for main player autoplay
* LTX/WAN = mejora rápida (same flow: draft → mix → autoplay)
* Veo = premium async (same flow: draft → mix → autoplay)

⸻

2. Reglas por escena

Inicialización (T=0–2s)

Todas las escenas:

* Se renderizan con Pexels (Pixabay fallback)
* Draft videos (raw, sin audio) → se muestran inmediatamente en carrusel con badge "Draft"
* Mix con Cloudinary (audio + captions) → cambian a badge "Ready" en carrusel
* Solo videos con mixStatus === 'ready' y mixedVideoUrl → van al autoplay en main player

UI:

* Carousel: muestra todos los videos (draft sin audio, mixing, ready con audio)
* Main Player (autoplay loop): SOLO videos mixedVideoUrl con mixStatus === 'ready'
* Badges: "Draft" (raw), "Mixing..." (processing), "Ready" (mixed), "Final" (high quality)

⸻

3. Mejoras automáticas (LTX / WAN / VEO)

Condición:
* director selecciono este engine y video esta ready
* LTX, WAN disponible (ready to play)  

Acción:

* Reemplazo automático en carrusel scena
    * pasa al autoplay principal

⸻

4. Mejora bajo demanda (LTX / WAN / Veo)

Trigger:

* Usuario hace:
    * tap en escena
    

Mostrar CTA:

* “Mejorar esta escena”
Estado “mejorable”:

Badge sutil cliclable:

* “✨"  en cada escena 
⸻

Progresión manual:

Pexels → LTX → WAN → Veo

Reglas:

* No saltos (no Pexels → Veo directo)
* mejorar scena para al siguiente  motor (ej. LTX ->WAN)

⸻

5. Concurrencia (CRÍTICO)

Regla global:

* Máximo 2 escenas simultáneas por engine

Ejemplo:

Pexels: 4 escenas OK
LTX: máx 2 en paralelo
WAN: máx 2
Veo: máx 1–2 (recomendado 1)




⸻

Estado “en progreso”:

Overlay:

* “Renderizando…”

⸻

Estado “upgrade listo”:

* “✨ Versión mejorada”

Tap → reemplazo

⸻

8. Reglas de reemplazo

Automático:

* SOLO:
    * Pexels → Engine Selecionado por director
    * Si director selecciona pexel se queda en pexels

Manual:

* LTX → WAN → Veo

⸻

Nunca:

* múltiples cambios automáticos

⸻

9. Prioridad de escenas

No todas las escenas son iguales:

Escena 1 (hook)

* Pexels draft → carousel immediately
* Mix with Cloudinary (audio + captions) → mixedVideoUrl ready
* ONLY when mixedVideoUrl ready → start autoplay in main player
* NEVER play raw/draft video in main player (only in carousel) 

Escenas 2–3 (contenido)

* Same flow: draft → mix → autoplay
* NEVER add to main player autoplay without Cloudinary mix (audio + captions)
* Draft videos only visible in carousel with "Mixing..." badge

Escena 4 (opcional)

* rara vez upgrade 

⸻



11. Principio UX central

“Cada escena empieza instantánea y puede evolucionar individualmente hay upgrade o  usuario hizo click en emballecer”

⸻

12. Anti-patterns

❌ Upgrade de todas las escenas a la vez
❌ Más de 2 renders simultáneos por engine
❌ Reemplazos en cascada automáticos

⸻

13. Resumen operativo

* 3–4 escenas por respuesta
* Pexels siempre primero (draft → mix → autoplay)
* Main player ONLY shows videos with mixStatus === 'ready' and mixedVideoUrl
* Autoplay loop is continuous: plays all ready mixed videos in sequence, then loops
* If video upgrade (LTX/WAN/VEO) arrives late:
  - Show draft in carousel with "Mixing..." badge
  - After Cloudinary mix → add to next autoplay loop
* Loop continues indefinitely until user stops or navigates away 

🎬 CuriosAI CINEMATOC UX — Parte II (Latency-aware per scene)

0. Cambio clave

Antes:

* latency_ok = ventana fija (ej: <8s)

Ahora:

* latency_ok = depende de si la escena sigue siendo relevante en playback

👉 El sistema ya no piensa en “tiempo desde request”, sino en:

scene_relevance_window

⸻

1. Modelo de tiempo

Suposiciones:

* 3 escenas
* ~8s por escena
* total loop ≈ 24s

⸻

2. Nueva regla: relevance window

Cada escena tiene:

scene_start_time
scene_end_time

Y definimos:

scene_is_active = now ∈ [scene_start_time, scene_end_time]
scene_is_recent = now < scene_end_time + buffer

buffer recomendado:

* 4–6 segundos

⸻

3. Regla de upgrade automático (actualizada)

Condición:

if (engine_result_ready)
AND (scene_is_active OR scene_is_recent)
AND (latency_within_user_tolerance):
    auto_upgrade()
else:
    fallback_to_manual()

⸻

4. Traducción práctica (tu ejemplo)

Usuario ya va por segundo 10

Caso:

* Llega WAN/Veo de escena 

Evaluación:

* escena:
    caso A
    * ya pasó o esta ejecutandose → remplazo pra el proximo loop
    Caso B 
    * aun no se ejecuta, se remplaza de inmediato y se ejecuta en este loop

⸻

Resultado:

Caso A — ejecutado o en ejecucio:

👉 auto-upgrade permitido pero 
sin interrumpir, escena actual, queda para proximo loop
* mostrar “✨ Mejorando escena 1”

Caso B — Aun no se ha ejecutado:

👉 auto-upgrade
👉 mostrar en este loop


⸻

5. UX en autoplay loop (clave)

Como el video hace loop:

👉 tienes una ventaja enorme

Nueva regla:

if scene_loops_again AND upgrade_ready:
    apply_upgrade_on_next_loop

⸻

Esto es oro porque:

* No interrumpes playback actual
* Upgrade se siente natural
* Evitas cambios bruscos

⸻

6. Prioridad de aplicación

Cuando llega un upgrade:

Orden:

1. escena actualmente visible
2. siguiente escena en cola
3. escenas que llegaron tarde (en próximo loop)
4. siempre usuario puede manualmemte apretar mejora escena (se llama a siguiente motor) excepto Veo 

⸻

7. Lógica final consolidada

for each scene:
    if upgrade_ready:
        if scene_is_non_active:
            auto_upgrade_now()
        elif scene_is_playing ro Scene_already_played:
            schedule_upgrade_for next _loop()
        elif user mark for upgrate:
            Create_new Scene_with_upgraded_engine
        

⸻

8. UX states refinados

Auto-upgrade inmediato si aun no esta en play la escena:

* sin mensaje intrusivo

⸻

Upgrade en próximo loop:

* badge sutil:
    * “✨ Mejorando en siguiente vuelta”

⸻

Upgrade manual de escena:

* CTA:
    * “Ver versión mejorada”



10. Principio UX actualizado

“El upgrade ocurre cuando aún usuario no ha visto escena, o se difiere elegantemente al siguiente loop.”

11. Finalizacion y almacenamiento

 * cada escena marcada como final se guarda
 * si todas las escenas estan en estado final, se normalizan y combina en un video final (ojo aqui para que cloudinary pueda combinarlos)
 * mientras haya escenas nuevas aun no vistas se parte un nuevo loop
 * si no hay escenas nuevas y no hay escenas en espera loop se detiene y pasa a replay manual 
 * Si aun no han llegado escenas en espera y se termina el video, espera 1 o dos segundo muestra mensaje "disponible Mas tarde en tu space"


⸻

12. Resultado

* Eliminaste upgrades “fuera de lugar”
* Aprovechas autoplay loop como buffer natural
* Veo deja de ser problema de latencia
* UX se siente fluida, no reactiva

