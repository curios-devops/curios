# Curios AI — Home Page Style Guide (Inspired by `/create/method-select`)

## Objetivo
Recrear un home minimal con estética premium (MetaHuman + elegancia Apple). Debe verse moderno, limpio, oscuro, con glassmorphism y gradientes sutiles. El foco es un **search box central** con sensación flotante y animación de “encendido” al acercarse (hover/focus).

## Layout
- **Pantalla completa** con fondo oscuro y gradientes radiales suaves.
- **Contenido centrado** en un container max-width 1200px, padding vertical amplio.
- **Search box** en el centro de la pantalla, encima de un subtítulo corto.
- **Side menu** fijo (izquierda), compacto, con tipografía uppercase y tracking.

## Tipografía
- **Fuente:** `Inter` (fallback: `system-ui`, `-apple-system`, `sans-serif`).
- **Título (H1):** tamaño `clamp(48px, 6vw, 72px)`, line-height `1.05`, peso 600-700.
- **Subtítulo:** 18px, color gris suave, max-width 520px.
- **Menú lateral:** 12-14px, uppercase, letter-spacing `0.08em`.

## Paleta
- **Fondo base:** `#0B0F17`.
- **Texto principal:** `#EEF2FF` (blanco frío).
- **Texto secundario:** `rgba(226, 232, 240, 0.65)`.
- **Acento 1:** `#4F46E5` (violet).
- **Acento 2:** `#22D3EE` (cyan).
- **Bordes suaves:** `rgba(148, 163, 184, 0.2)`.

## Fondo (Background)
- Usa un **radial gradient** en la parte superior y otro lateral para dar profundidad:
  - `radial-gradient(circle at top, rgba(86, 128, 255, 0.2), transparent 55%)`
  - `radial-gradient(circle at 20% 60%, rgba(12, 240, 255, 0.12), transparent 50%)`
  - Base `#0B0F17`.

## Side Menu (texto sugerido)
- **Brand:** `CURIOS AI` (tracking alto).
- **Items:** `Home`, `Explore`, `Use Cases`, `Pricing`, `Docs`, `About`.
- Estilo: uppercase, 12-14px, color `rgba(226, 232, 240, 0.8)`.
- Separación: 18-22px entre items.

## Search Box (pieza clave)
- **Contenedor glassmorphism**: fondo `rgba(17, 24, 39, 0.6)` con blur y border suave.
- **Bordes redondeados** (16–20px) y sombra profunda (`0 20px 50px rgba(5, 8, 16, 0.6)`).
- **Tamaño**: ancho máx `720px`, altura `64–72px`, centrado.
- **Input**: fondo ligeramente más oscuro (`rgba(15, 23, 42, 0.6)`), texto blanco, placeholder gris.
- **Icono** de búsqueda en el lado izquierdo (círculo sutil con acento cyan).

## Animación “encendido” (hover/focus)
- Al pasar el mouse o hacer focus, el search box debe:
  - **Elevarse** (`translateY(-6px)`),
  - **Brillar** con sombra de acento (`0 25px 60px rgba(79, 70, 229, 0.25)`),
  - **Borde con glow** (usa pseudo-elemento con gradiente `#4F46E5 → #22D3EE`).
- Transición: `0.4s ease` (transform y box-shadow).

## Microdetalles
- Usa badges suaves para labels (uppercase, fondo violeta transparente).
- Mantén mucho **espacio negativo** para sensación premium.
- Todo debe sentirse “silencioso” y limpio: pocas líneas, tipografía clara, bordes suaves.

## Copy sugerido
- **H1:** “Ask Curios anything.”
- **Subtítulo:** “Instant research with clarity, depth, and style.”
- **Placeholder search:** “Search the frontier of knowledge…”

## Resultado esperado
Un home minimal con una estética cinematográfica, centrado en el search box flotante, con gradiente de fondo, tipografía limpia y hover glow elegante. El look debe sentirse premium, futurista, y Apple-like.