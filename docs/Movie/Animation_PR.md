# PR: Refactor Creative Director — Adaptive Procedural Motion Engine

**Branch sugerida:** `feat/adaptive-motion-director`  
**Tipo:** Refactor funcional y creativo  
**Prioridad:** Alta  
**Área:** OCA / Animation Director / Scene Planner / Remotion Renderer

---

## 1. Objetivo

Transformar el Director actual de CuriosAI en un **Creative Director capaz de seleccionar y producir automáticamente diferentes lenguajes de animación programática a partir de la pregunta del usuario**.

Actualmente, el sistema tiende a utilizar un estilo visual muy próximo a Kurzgesagt: ilustración vectorial, composición de elementos circulares, fondos oscuros y una paleta cromática recurrente.

Ese estilo es válido y debemos conservarlo, pero no puede seguir siendo la identidad visual de todas las animaciones.

Una explicación sobre la evolución de los dinosaurios, una pregunta sobre inflación, un tutorial de software y una curiosidad sobre el comportamiento de los gatos no deberían compartir necesariamente la misma dirección artística.

El Director debe comprender qué se está explicando y decidir cuál es el lenguaje visual más adecuado para comunicarlo.

### Restricción fundamental del proyecto

Este PR implementa exclusivamente animaciones generadas mediante código y recursos gráficos existentes.

**Queda fuera del proyecto cualquier generación de contenido visual mediante modelos generativos.**

El Director podrá utilizar un LLM para interpretar la pregunta, diseñar la narrativa, escoger el arquetipo y producir un plan estructurado de escenas. Pero la representación visual se hará mediante:

- React y los componentes de animación que ya existan.
- Remotion, si es el renderer actualmente utilizado.
- SVG, geometrías, paths y formas vectoriales.
- CSS y transformaciones programáticas.
- Canvas o WebGL solamente cuando ya exista una infraestructura útil o esté justificado.
- Tipografía, gráficos, diagramas, iconografía y componentes visuales propios.
- Personajes y objetos construidos a partir de componentes gráficos reutilizables.
- Texturas y patrones procedurales deterministas.

No se utilizarán modelos generativos de imágenes, vídeo o escenas.

No se incorporarán vídeos cinematográficos, grabaciones de stock, escenas fotorrealistas generadas ni workflows de generación de footage.

El resultado debe seguir siendo un motor de animaciones reproducibles, editables y controlables mediante código.

---

## 2. Inspiración y criterios de diseño

La investigación de Higgsfield Content Factory y OpenDesign Motion proporciona varias ideas útiles, pero no debemos reproducir sus productos ni importar sus catálogos completos.

### Higgsfield Content Factory

Fuente: https://higgsfield.ai/content-factory

La idea más aprovechable es que el sistema parte de una intención y una dirección de contenido antes de producir las escenas.

Su flujo contempla una idea, estructura narrativa, escenas, personajes, visuales y montaje. Sus presets incluyen ejemplos de contenido con diferentes formatos y estilos. La página también presenta métricas públicas de vistas y likes para vídeos de referencia, aunque no permite establecer de manera fiable un ranking por familia estética a partir de los datos visibles.

**Qué adoptar:**
- Selección creativa previa a la construcción de escenas.
- Interpretación del contenido y de su intención.
- Consistencia de personajes y dirección visual.
- Uso de referencias concretas como guía.
- Capacidad de adaptar un lenguaje visual a diferentes temas.

**Qué no adoptar:**
- Generación de imágenes o vídeos.
- Dependencia de modelos externos.
- 50+ presets.
- Generación de footage por escena.
- Una arquitectura de producción audiovisual basada en servicios externos.

### OpenDesign Motion

Fuentes:
- https://open-design.ai/motion/
- https://open-design.ai/help/motion/
- https://open-design.ai/showcase/

Sus ejemplos públicos proporcionan una taxonomía útil de diferentes formas de construir motion graphics:

| Ejemplo | Principio que interesa |
|---|---|
| Bring Ideas to Life | Paper cutout, narrativa y personajes |
| The Future Is Already Here | Tipografía cinética, composición y ritmo |
| Motion Designer Showreel | Composición gráfica y presentación |
| One-Shape UI Motion | Transformación continua de elementos |
| Product Promo | Narrativa comercial y demostración de producto |

Es especialmente relevante que OpenDesign documenta animaciones editables mediante HTML y una práctica con animación local y audio, sin un servicio externo de generación de medios.

También son interesantes las skills públicas de motion design: propósito del movimiento, jerarquía, timing, easing, duración, coreografía y número limitado de propiedades animadas.

**Qué adoptar:**
- Animaciones construidas mediante código.
- Composiciones editables.
- Frames y momentos controlables.
- Reutilización de componentes.
- Separación entre intención, composición y movimiento.
- Correcciones locales sin reconstruir todo el proyecto.

**Qué no adoptar:**
- Su catálogo completo de plantillas.
- Su colección de skills.
- Un sistema de presets interminable.
- La importación indiscriminada de efectos o técnicas.

### Motion Engineering: documento de referencia

El documento adjunto *Motion Engineering with Opus 5.5: Build Launch Videos You Can Sell* proporciona criterios adicionales para construir animaciones reproducibles:

- Brief por escena.
- Eventos visuales identificables.
- Estado inicial y final.
- Timings explícitos.
- Control de frames.
- Posiciones y jerarquías.
- Lectura del texto durante los holds.
- Semillas aleatorias deterministas.
- Revisión de frames concretos.
- Correcciones localizadas.

Estos principios se incorporan al pipeline, pero no se deben generalizar los detalles propios de un vídeo comercial: cursores, botones de exportación, tarjetas de producto o demostraciones de interfaces no son elementos universales.

---

## 3. Nuevo modelo mental del Director

La principal modificación arquitectónica consiste en separar cuatro decisiones que actualmente pueden estar demasiado acopladas.

```text
USER QUESTION
     |
     v
CONTENT UNDERSTANDING
     |
     +--> Topic
     +--> Intent
     +--> Complexity
     +--> Audience
     +--> Emotional tone
     +--> Explanatory structure
     |
     v
NARRATIVE FORMAT
     |
     +--> Explainer
     +--> Comparison
     +--> Timeline
     +--> Process
     +--> What-if
     +--> Story
     +--> Data explanation
     |
     v
MOTION ARCHETYPE
     |
     +--> Editorial
     +--> Flat Vector
     +--> Paper Cutout
     +--> Character-led
     +--> Geometric & Data
     +--> Isometric
     +--> UI & Process
     |
     v
ART DIRECTION
     |
     +--> Palette
     +--> Background
     +--> Typography
     +--> Shapes
     +--> Texture
     +--> Composition
     |
     v
MOTION PROFILE
     |
     +--> Entrance
     +--> Movement
     +--> Emphasis
     +--> Transition
     +--> Hold
     |
     v
SCENE PLANNER
     |
     v
DETERMINISTIC ANIMATION RENDERER
     |
     v
VIDEO
```

Estas capas deben tener responsabilidades independientes.

Un arquetipo determina el lenguaje visual general. La dirección artística determina su apariencia. El perfil de movimiento determina cómo se comportan los elementos.

Por ejemplo:

- Arquetipo: Flat Vector.
- Dirección artística: ilustración científica editorial, fondo marfil, azul cielo, naranja y verde.
- Motion profile: Organic Bounce.
- Formato narrativo: Cause and Effect.

Otro vídeo puede utilizar Flat Vector con estilo científico minimalista, fondo blanco y movimiento geométrico.

La misma técnica de ilustración no debe obligar a repetir siempre la misma composición, paleta o animación.

---

## 4. Los siete arquetipos iniciales

El sistema tendrá únicamente siete arquetipos principales.

No son siete presets rígidos, sino siete lenguajes visuales con sus propias reglas, componentes reutilizables y posibilidades de variación.

### 4.1 EDITORIAL / KINETIC TYPOGRAPHY

**ID:** `editorial-kinetic`

<direction>Diseño editorial contemporáneo, tipografía expresiva, gráficos vectoriales y composición dinámica.</direction>

**Uso principal:**
- Curiosidades.
- Tendencias.
- Tecnología.
- Conceptos sociales.
- Ideas abstractas.
- Preguntas con una conclusión contundente.
- Estadísticas individuales o titulares llamativos.

**Gramática visual:**
- Tipografía grande y expresiva.
- Contrastes de tamaños.
- Palabras que se dividen, reorganizan y transforman.
- Geometría sencilla.
- Líneas, subrayados, indicadores y números.
- Uso deliberado del espacio negativo.
- Composiciones editoriales.

**Movimiento:**
- Kinetic typography.
- Word reveal.
- Text masking.
- Morphing.
- Staggered entrances.
- Scale and position transitions.
- Elementos gráficos sincronizados con la narración.

**Paletas posibles:**
- Marfil, negro y rojo.
- Blanco, azul cobalto y amarillo.
- Crema, terracota y verde.
- Blanco y negro monocromático con un acento.

Nunca debe asumirse que editorial significa fondo negro.

**No utilizar cuando:**
La explicación requiera comprender un mecanismo espacial complejo o una secuencia causal con muchos elementos.

**Ejemplo:**

Pregunta: ¿Por qué recordamos algunas canciones durante años?

Propuesta: palabras que aparecen y se repiten, ondas sonoras geométricas, patrones rítmicos y transformación de palabras para representar memoria y repetición.

### 4.2 FLAT VECTOR EXPLAINER

**ID:** `flat-vector`

<direction>Ilustración vectorial 2D, diagramas, objetos esquemáticos y representación visual simplificada de conceptos.</direction>

Este arquetipo conserva el estilo Kurzgesagt actual, pero lo convierte en una opción entre varias.

**Uso principal:**
- Física.
- Biología.
- Ciencia.
- Economía.
- Tecnología conceptual.
- Sistemas naturales.
- Explicaciones de causa y efecto.

**Gramática visual:**
- Formas vectoriales.
- Objetos ilustrados.
- Diagramas.
- Capas de profundidad sencillas.
- Iconos construidos con formas.
- Representación visual de procesos.
- Personajes esquemáticos cuando aporten valor.

**Movimiento:**
- Scale transitions.
- Morphing.
- Position interpolation.
- Parallax por capas.
- Path animation.
- Animated diagrams.
- Staggered reveal.

**Variantes artísticas internas:**
- `scientific-editorial`: ilustración científica clara.
- `playful-flat`: ilustración divertida y colorida.
- `bold-infographic`: composiciones planas de alto contraste.
- `kurzgesagt-inspired`: variante concreta del estilo actual, no default universal.

**Paletas posibles:**
- Blanco, azul cielo, naranja y verde.
- Crema, coral, mostaza y azul.
- Verde salvia, amarillo y azul oscuro.
- Colores naturales según el objeto representado.

**No utilizar cuando:**
La pregunta necesite una explicación basada principalmente en datos, tipografía o una demostración de interfaz que otro arquetipo represente mejor.

**Ejemplo:**

Pregunta: ¿Cómo funciona una vacuna?

Representar partículas, barreras, anticuerpos y etapas de la respuesta inmunitaria mediante elementos vectoriales animados.

### 4.3 PAPER CUTOUT / EDITORIAL COLLAGE

**ID:** `paper-collage`

<direction>Capas de papel, recortes ilustrados, formas orgánicas, texturas y composición artesanal.</direction>

Este estilo representa una oportunidad para salir visualmente del universo de Kurzgesagt.

**Uso principal:**
- Historia.
- Cultura.
- Civilizaciones.
- Sociedad.
- Biografías conceptuales.
- Relatos y acontecimientos.
- Preguntas sobre la evolución de las ideas.

**Gramática visual:**
- Elementos con apariencia de recortes.
- Capas con bordes ligeramente irregulares.
- Sombras muy sutiles.
- Texturas de papel generadas mediante patrones.
- Siluetas.
- Formas superpuestas.
- Composiciones que recuerden a una ilustración editorial física.

**Movimiento:**
- Layered parallax.
- Cutout reveals.
- Mask transitions.
- Rotaciones pequeñas.
- Desplazamientos independientes por capa.
- Construcción progresiva de la composición.

**Paletas posibles:**
- Papel crema, rojo, mostaza y verde.
- Pasteles.
- Tonos tierra.
- Azul y coral sobre fondo cálido.

**Implementación:**
Todo debe construirse mediante SVG, paths, máscaras y capas. Las texturas pueden utilizarse como SVG patterns, ruido procedural determinista o assets propios ya disponibles.

No depender de imágenes generadas.

**No utilizar cuando:**
La precisión de un gráfico numérico, una interfaz o un diagrama técnico sea prioritaria frente al storytelling.

**Ejemplo:**

Pregunta: ¿Cómo se construyeron las primeras ciudades?

Crear una ciudad por capas: edificios, caminos, mercado, murallas y habitantes esquemáticos.

### 4.4 CHARACTER-LED 2D

**ID:** `character-2d`

<direction>Personajes vectoriales expresivos que protagonizan una explicación o representan un comportamiento.</direction>

**Uso principal:**
- Animales.
- Comportamiento humano.
- Psicología.
- Preguntas What-if.
- Situaciones hipotéticas.
- Relaciones causa-consecuencia.
- Contenido educativo informal.

**Gramática visual:**
- Personajes construidos con geometrías y SVG.
- Gestos y expresiones.
- Extremidades articuladas cuando sea necesario.
- Objetos y escenarios sencillos.
- Composiciones expresivas.
- Siluetas reconocibles.

**Movimiento:**
- Character rigs sencillos.
- Position and rotation.
- Squash and stretch moderado.
- Facial expressions.
- Anticipation.
- Follow-through.
- Interaction between characters.

**Biblioteca mínima:**

No construir inicialmente un sistema gigantesco de personajes.

Crear componentes reutilizables para:
- Human generic character.
- Small animal.
- Large animal.
- Simple mascot.
- Object with personality.

El sistema debe permitir cambiar expresiones, posiciones y acciones utilizando componentes existentes.

**Paletas posibles:**
- Colores vivos.
- Pasteles.
- Cálidos.
- Tonos naturales.

**No utilizar cuando:**
La animación necesite transmitir información científica con precisión o presentar muchos valores numéricos. No convertir todas las preguntas en historias protagonizadas por personajes.

**Ejemplo:**

Pregunta: ¿Por qué los gatos siempre parecen caer de pie?

Un gato esquemático se desplaza por varias posiciones, mostrando de manera secuencial el mecanismo de rotación y equilibrio.

### 4.5 GEOMETRIC / DATA MOTION

**ID:** `geometric-data`

<direction>Gráficos, datos, geometría, sistemas matemáticos y transformaciones visuales precisas.</direction>

**Uso principal:**
- Estadísticas.
- Comparaciones.
- Economía.
- Matemáticas.
- Inteligencia artificial.
- Energía.
- Crecimiento.
- Probabilidad.
- Distribuciones.

**Gramática visual:**
- Barras.
- Círculos.
- Líneas.
- Grids.
- Ejes.
- Diagramas.
- Números.
- Relaciones espaciales.

**Movimiento:**
- Data interpolation.
- Chart transitions.
- Line drawing.
- Shape morphing.
- Number counters.
- Geometric transformations.
- Axis and scale transitions.

**Paletas posibles:**
- Blanco, negro y un color de énfasis.
- Beige y azul.
- Gris cálido, naranja y verde.
- Colores discretos con contraste controlado.

**Regla importante:**

No inventar datos para llenar la animación. Los valores deben proceder de la respuesta o del contenido estructurado. Si un valor es ilustrativo, debe identificarse como ejemplo.

**No utilizar cuando:**
La pregunta requiere principalmente una narrativa emocional, personajes o recreación visual de un acontecimiento.

**Ejemplo:**

Pregunta: ¿Por qué la inflación reduce nuestro poder adquisitivo?

Representar una cantidad de dinero, una cesta de productos y una transformación progresiva de su capacidad de compra.

### 4.6 ISOMETRIC / SCHEMATIC WORLDS

**ID:** `isometric-world`

<direction>Espacios y sistemas construidos mediante geometría, diagramas tridimensionales simplificados y composiciones axonométricas.</direction>

Este arquetipo no es una escena cinematográfica ni una simulación fotorrealista.

Es una forma de representar estructuras que necesitan profundidad espacial.

**Uso principal:**
- Arquitectura.
- Sistemas informáticos.
- Infraestructuras.
- Redes.
- Máquinas.
- Espacio.
- Anatomía esquemática.
- Procesos industriales.
- Ecosistemas.

**Gramática visual:**
- Geometría isométrica.
- Bloques.
- Planos.
- Conectores.
- Secciones y capas.
- Módulos.
- Etiquetas.
- Diagramas espaciales.

**Movimiento:**
- Camera-like pan en un espacio gráfico controlado.
- Rotación isométrica.
- Elementos que se ensamblan.
- Exploded views.
- Assembly animation.
- Spatial highlighting.
- Layer transitions.

**Implementación:**

Priorizar SVG y geometría programática.

No incorporar una dependencia pesada de Three.js o WebGL sin que el análisis del repositorio demuestre que es necesaria.

**Paletas posibles:**
- Blanco y azul.
- Arena, naranja y verde.
- Colores técnicos.
- Pasteles geométricos.

**No utilizar cuando:**
Una simple composición 2D comunica el concepto con mayor claridad. No añadir volumen por decoración.

**Ejemplo:**

Pregunta: ¿Cómo funciona Internet?

Representar ordenadores, routers, centros de datos y conexiones como un sistema de módulos isométricos.

### 4.7 UI / PROCESS CHOREOGRAPHY

**ID:** `ui-process`

<direction>Coreografía visual de interfaces, tarjetas, indicadores, pasos y procesos digitales.</direction>

**Uso principal:**
- Tutoriales.
- Software.
- Aplicaciones.
- Automatizaciones.
- Procesos digitales.
- Product explainers.
- Demostraciones de funcionalidades.

**Gramática visual:**
- Ventanas.
- Paneles.
- Cards.
- Botones.
- Indicadores.
- Diagramas de flujo.
- Cursors.
- Estados de interfaz.

**Movimiento:**
- Card entrance.
- Button response.
- Cursor movement.
- State transition.
- Progress animation.
- UI transformation.
- Step-by-step reveal.

**Paletas posibles:**
- UI neutra.
- Composiciones claras.
- Contrastes de interfaz.
- Colores de producto cuando se hayan proporcionado expresamente.

**Regla:**
No se debe utilizar automáticamente el diseño visual de la propia interfaz de CuriosAI. Solamente se utiliza la apariencia de un producto externo cuando se esté explicando ese producto o cuando existan assets adecuados.

**No utilizar cuando:**
Una pregunta sobre ciencia, historia o comportamiento pueda explicarse mejor con ilustraciones y metáforas visuales.

**Ejemplo:**

Pregunta: ¿Cómo funciona una autenticación de dos factores?

Mostrar el proceso mediante una interfaz esquemática, código, confirmación y acceso.

---

## 5. No confundir arquetipos con tratamientos visuales

No crear ocho estilos independientes para cada variación de color o de textura.

Hay que separar las siguientes categorías:

| Categoría | Qué define | Ejemplos |
|---|---|---|
| Narrative format | Cómo contamos el contenido | Explainer, timeline, comparison |
| Motion archetype | Lenguaje visual | Flat vector, collage, UI |
| Art treatment | Aspecto artístico | Hand-drawn, playful, minimal, bold |
| Motion profile | Cómo se mueven los objetos | Organic, precise, energetic |
| Composition | Organización del espacio | Split screen, centered, grid |
| Color palette | Colores del proyecto | Warm, pastel, monochrome |

Por tanto:

- Hand-drawn puede ser un tratamiento para Paper Collage o Flat Vector.
- Kurzgesagt-inspired es una variante de Flat Vector.
- Cyberpunk puede ser un tratamiento cromático o gráfico, pero no un arquetipo.
- Minimalist puede aplicarse a Editorial, Geometric o UI.
- Data visualization puede integrarse en varios arquetipos.
- Parallax es una técnica de movimiento, no una dirección artística.

El Director debe seleccionar primero un arquetipo y después adaptar los tratamientos compatibles.

No mezclar indiscriminadamente dos arquetipos principales en un mismo vídeo.

---

## 6. Matriz de selección

El Director debe trabajar con una matriz de orientación, no con un sistema rígido de palabras clave.

| Intención / contenido | Primera opción | Alternativa |
|---|---|---|
| Ciencia explicativa | Flat Vector | Isometric |
| Física y mecanismos | Flat Vector | Geometric |
| Matemáticas | Geometric | Editorial |
| Historia | Paper Collage | Flat Vector |
| Cultura y sociedad | Paper Collage | Editorial |
| Animales | Character 2D | Flat Vector |
| Psicología | Character 2D | Editorial |
| What-if | Character 2D | Flat Vector |
| Economía | Geometric | Editorial |
| Comparaciones | Geometric | Editorial |
| Estadísticas | Geometric | Editorial |
| Tecnología conceptual | Isometric | Flat Vector |
| Redes y sistemas | Isometric | Geometric |
| Tutorial de software | UI Process | Geometric |
| Explicación de interfaz | UI Process | Editorial |
| Tendencias y actualidad | Editorial | Geometric |
| Curiosidades generales | Selección contextual | Selección contextual |
| Biografías conceptuales | Paper Collage | Character 2D |
| Procesos y secuencias | Isometric | Flat Vector |

Estas son preferencias iniciales. El scoring posterior puede decidir otra opción cuando el contenido lo justifique.

---

## 7. Arquitectura de datos TypeScript

El agente debe adaptar estos contratos a las convenciones actuales del repositorio. Son el modelo conceptual y no una orden para duplicar interfaces ya existentes.

### 7.1 MotionArchetype

```typescript
export type MotionArchetypeId =
  | "editorial-kinetic"
  | "flat-vector"
  | "paper-collage"
  | "character-2d"
  | "geometric-data"
  | "isometric-world"
  | "ui-process";

export interface MotionArchetype {
  id: MotionArchetypeId;
  name: string;
  description: string;

  supportedIntents: ContentIntent[];
  supportedNarratives: NarrativeFormat[];

  visualGrammar: {
    preferredComposition: string[];
    preferredElements: string[];
    compatibleTreatments: string[];
  };

  recommendedMotionProfiles: MotionProfileId[];

  palettePresets: string[];
  rendererCapabilities: string[];

  complexity: "low" | "medium" | "high";

  limitations: string[];
  avoidWhen: string[];
}
```

### 7.2 ArtDirection

```typescript
export interface ArtDirection {
  archetypeId: MotionArchetypeId;
  treatment: string;

  palette: {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    muted: string;
  };

  typography: {
    headingFamily?: string;
    bodyFamily?: string;
    headingWeight: number;
    bodyWeight: number;
    scale: number[];
  };

  background: {
    type: "solid" | "gradient" | "pattern";
    value: string;
  };

  texture: {
    enabled: boolean;
    type?: "paper" | "grain" | "dots" | "grid" | "none";
    intensity: number;
    seed: number;
  };

  illustration: {
    style: string;
    strokeWidth?: number;
    cornerRadius?: number;
    depth?: "flat" | "layered" | "isometric";
  };

  composition: {
    safeMargin: number;
    preferredLayout: string;
    density: "low" | "medium" | "high";
  };

  motionLanguage: MotionProfileId;

  seed: number;
}
```

### 7.3 VideoBrief

```typescript
export type ContentIntent =
  | "explain"
  | "compare"
  | "teach"
  | "tell-story"
  | "explore"
  | "analyze"
  | "demonstrate"
  | "entertain"
  | "what-if";

export type NarrativeFormat =
  | "explainer"
  | "comparison"
  | "timeline"
  | "process"
  | "cause-effect"
  | "what-if"
  | "story"
  | "data-story"
  | "step-by-step";

export interface VideoBrief {
  question: string;
  topic: string;
  intent: ContentIntent;

  audience: {
    level: "general" | "intermediate" | "expert" | "children";
    priorKnowledge: string;
  };

  tone: string[];

  complexity: number;
  abstraction: number;
  factualDensity: number;

  narrativeFormat: NarrativeFormat;

  durationSeconds: number;
  fps: number;

  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5";

  language: string;

  userOverride?: {
    archetype?: MotionArchetypeId;
    treatment?: string;
    palette?: string;
  };

  brandKit?: VideoBrandKit;
}
```

### 7.4 MotionProfile

```typescript
export type MotionProfileId =
  | "precise"
  | "organic"
  | "playful"
  | "energetic"
  | "editorial"
  | "diagrammatic";

export interface MotionProfile {
  id: MotionProfileId;

  defaultDurations: {
    entrance: number;
    transition: number;
    emphasis: number;
    hold: number;
  };

  easing: {
    entrance: string;
    exit: string;
    emphasis: string;
  };

  staggerSeconds: number;

  overshoot: number;
  springDamping?: number;
  springStiffness?: number;

  allowedProperties: (
    | "position"
    | "scale"
    | "rotation"
    | "opacity"
    | "path"
    | "mask"
  )[];
}
```

### 7.5 SelectionRationale

```typescript
export interface SelectionRationale {
  selectedArchetype: MotionArchetypeId;

  confidence: number;

  reasoning: string[];

  scoreBreakdown: {
    intentFit: number;
    semanticFit: number;
    explanatoryFit: number;
    toneFit: number;
    durationFit: number;
    implementationFit: number;
  };

  secondaryTechniques: string[];

  rejectedAlternatives: {
    archetype: MotionArchetypeId;
    reason: string;
  }[];

  diversityAdjustment: number;
}
```

### 7.6 ScenePlan

```typescript
export interface ScenePlan {
  id: string;
  title: string;
  purpose: string;

  durationSeconds: number;

  startFrame: number;
  endFrame: number;

  entryState: Record<string, unknown>;
  exitState: Record<string, unknown>;

  keyEvents: MotionEvent[];

  elements: SceneElement[];

  narration?: {
    text: string;
    startSeconds: number;
    endSeconds: number;
  };

  transitionOut: string;

  seed: number;
}

export interface MotionEvent {
  id: string;

  name: string;
  purpose: string;

  startSeconds: number;
  endSeconds: number;

  target: string;

  properties: Record<string, number | string>;

  easing: string;

  expectedVisualResult: string;
}
```

`SceneElement` debe utilizar los tipos discriminados que mejor encajen con los componentes existentes del proyecto. Como referencia:

```typescript
export type SceneElement =
  | TextElement
  | ShapeElement
  | IconElement
  | DiagramElement
  | ChartElement
  | CharacterElement
  | UIElement
  | ConnectorElement;
```

No dejar que el LLM genere JSX arbitrario ni componentes React sin restricciones en tiempo de ejecución. El Scene Planner debe producir una estructura declarativa validable que consuma el renderer.

---

## 8. Nuevo algoritmo de selección automática

El Director no debe escoger un estilo basándose únicamente en palabras concretas.

Debe comprender el contenido y su intención.

### Factores de decisión

1. **Intent fit — 30%**

   ¿Qué necesita hacer el vídeo? ¿Enseñar, comparar, narrar, entretener o demostrar?

2. **Semantic fit — 20%**

   ¿Qué representación visual facilita comprender el tema?

3. **Explanatory fit — 20%**

   ¿Hay que representar causalidad, espacio, transformaciones, datos o comportamiento?

4. **Tone fit — 10%**

   ¿Debe transmitir diversión, curiosidad, rigor, sorpresa o claridad?

5. **Duration fit — 10%**

   ¿Qué lenguaje funciona dentro del tiempo disponible?

6. **Implementation fit — 10%**

   ¿Tenemos componentes y recursos suficientes para producirlo bien sin modelos generativos?

Cada factor se puntúa de 0 a 100.

### Pseudocódigo

```typescript
function selectMotionArchetype(
  brief: VideoBrief,
  history: MotionArchetypeId[]
): SelectionResult {

  const candidates = getAvailableArchetypes();

  const scored = candidates.map(archetype => {

    const intent = scoreIntentFit(archetype, brief);
    const semantic = scoreSemanticFit(archetype, brief);
    const explanatory = scoreExplanatoryFit(archetype, brief);
    const tone = scoreToneFit(archetype, brief);
    const duration = scoreDurationFit(archetype, brief);
    const implementation = scoreImplementationFit(archetype, brief);

    const baseScore =
      intent * 0.30 +
      semantic * 0.20 +
      explanatory * 0.20 +
      tone * 0.10 +
      duration * 0.10 +
      implementation * 0.10;

    const diversityPenalty =
      calculateRecentStylePenalty(archetype.id, history);

    return {
      archetype,
      score: baseScore - diversityPenalty,
      diversityPenalty
    };
  });

  return chooseBestCompatibleCandidate(scored, brief);
}
```

### Reglas de diversidad

Evitar que cinco vídeos consecutivos sobre temas diferentes terminen utilizando exactamente la misma dirección artística.

Sin embargo, la diversidad no puede tener más peso que la claridad.

Reglas iniciales:

- Si un arquetipo aparece en dos de los tres vídeos anteriores, aplicar penalización.
- Si acaba de utilizarse en el último vídeo, aplicar una penalización menor.
- Si la diferencia entre las dos mejores opciones es pequeña, favorecer la alternativa menos utilizada.
- Si existe una clara superioridad semántica del primer candidato, conservarlo.
- No seleccionar un estilo inadecuado exclusivamente para variar.

El historial debe limitarse al contexto apropiado del usuario o sesión, reutilizando el mecanismo de historial existente cuando sea posible.

### Confidence

- `80–100`: decisión clara.
- `60–79`: decisión razonablemente sólida.
- `40–59`: utilizar el mejor candidato compatible y simplificar la ejecución.
- `0–39`: fallback a Flat Vector o Editorial, según el contenido.

El Director no debe bloquear la generación esperando que el usuario elija un estilo.

### Ejemplos de selección

| Pregunta | Selección | Justificación |
|---|---|---|
| ¿Cómo se produce un agujero negro? | Flat Vector | Concepto científico y causal |
| ¿Qué pasaría si desaparecieran las abejas? | Character 2D | Historia hipotética y comportamiento |
| ¿Por qué suben los precios? | Geometric Data | Relaciones cuantitativas |
| ¿Cómo vivían los romanos? | Paper Collage | Contexto histórico y cultura |
| ¿Cómo funciona una blockchain? | Isometric World | Sistemas y conexiones |
| ¿Cómo utilizar una aplicación de notas? | UI Process | Tutorial de interfaz |
| ¿Por qué nos cuesta concentrarnos? | Editorial | Idea abstracta con fuerte jerarquía tipográfica |

---

## 9. Art Direction independiente del tema de CuriosAI

**Este punto es crítico y debe considerarse un requisito de aceptación.**

Actualmente existe un problema por el que el sistema parece heredar el tema oscuro de la interfaz y su paleta cromática para la composición de la animación.

Esto debe desaparecer.

La animación es un producto creativo independiente de la interfaz desde la que se solicita.

### Separar los dos sistemas de tokens

```typescript
interface AppTheme {
  mode: "light" | "dark";

  surface: string;
  accent: string;
  text: string;
  border: string;
}

interface VideoBrandKit {
  enabled: boolean;

  palette?: string[];

  typography?: {
    heading?: string;
    body?: string;
  };

  logoAsset?: string;
}

interface VideoArtDirection {
  background: string;

  palette: string[];

  typography: Record<string, string>;

  texture?: string;

  illustrationStyle: string;

  motionProfile: MotionProfileId;
}
```

La API del Director no debe aceptar `AppTheme` como fuente de decisiones creativas.

No utilizar:
- CSS variables heredadas del dashboard.
- El accent del tema de CuriosAI como accent universal.
- El fondo oscuro de la aplicación como fondo por defecto.
- El tema del navegador o el sistema operativo.
- Los colores de los componentes de la interfaz.

La Art Direction debe contener todos sus valores resueltos antes de comenzar el renderizado.

### Política de color

Cada arquetipo tendrá varias paletas predefinidas, no una paleta universal.

Ejemplos:

| Arquetipo | Dirección cromática inicial |
|---|---|
| Editorial | Marfil, negro, coral |
| Flat Vector | Azul cielo, crema, naranja, verde |
| Paper Collage | Papel cálido, mostaza, terracota |
| Character 2D | Pasteles o colores vivos |
| Geometric Data | Monocromo con un acento |
| Isometric | Arena, azul, verde y naranja |
| UI Process | Superficies neutras y colores funcionales |

El Director debe poder elegir paletas alternativas de acuerdo con el tema:

- Naturaleza: verdes y tonos tierra.
- Espacio: colores astronómicos apropiados, incluyendo fondos oscuros cuando tengan sentido conceptual.
- Historia: tonos cálidos y materiales.
- Tecnología: colores definidos por la composición, no necesariamente azul o púrpura.
- Educación infantil: paletas alegres con contraste adecuado.

No prohibir el dark background. Prohibir que sea una consecuencia automática del dark mode de CuriosAI.

### Brand kit explícito

Solo utilizar los colores de una marca si:

1. El usuario pide expresamente una animación de marca.
2. El vídeo trata sobre un producto cuya identidad visual conocemos.
3. Existe un Brand Kit explícitamente asociado a ese proyecto.

La identidad gráfica de la aplicación CuriosAI no debe trasladarse automáticamente a todos los vídeos.

---

## 10. Scene Planner: nuevo proceso de construcción

El Scene Planner debe recibir un VideoBrief y una ArtDirection ya seleccionada.

Su trabajo no consiste en decidir de nuevo el estilo, sino en convertir la dirección creativa en escenas técnicamente realizables.

### Estructura narrativa inicial

No imponer la misma estructura a todos los vídeos.

Como punto de partida:

**Explainer:**
1. Hook: presenta la pregunta o problema.
2. Concept: introduce la idea clave.
3. Mechanism: muestra cómo funciona.
4. Example: concreta la explicación.
5. Takeaway: deja una conclusión memorable.

**Comparison:**
1. Presentación de las opciones.
2. Primer elemento.
3. Segundo elemento.
4. Comparación visual directa.
5. Conclusión.

**Timeline:**
1. Contexto.
2. Primer momento.
3. Evolución.
4. Cambio decisivo.
5. Resultado.

**What-if:**
1. Situación inicial.
2. Cambio hipotético.
3. Primera consecuencia.
4. Consecuencia acumulativa.
5. Resultado final.

El Director puede reducir o ampliar las escenas según la duración y la complejidad.

### Cada escena debe definir

- Qué explica.
- Qué debe ver el usuario.
- Cuál es el elemento principal.
- Qué elementos secundarios intervienen.
- Estado inicial.
- Acción visual.
- Resultado.
- Hold de lectura.
- Transición a la siguiente escena.

No añadir movimiento sin propósito.

Cada movimiento debe tener una función: introducir, explicar, destacar, comparar, transformar o guiar la atención.

### Prompt base del Director

```text
You are the Creative Director of CuriosAI's
procedural animation engine.

Your task is to translate a user's question into
an original, visually effective animated explanation.

You do not generate images or videos.

You must use the existing procedural visual system:
vector graphics, SVG, shapes, typography, charts,
diagrams, reusable characters and UI components.

First understand:
- The topic.
- The user's intent.
- The audience.
- The complexity.
- The emotional tone.
- The best narrative structure.

Then select ONE primary motion archetype from
the available archetype registry.

Do not default to Kurzgesagt or any single visual style.

Choose the visual language that best explains
the actual subject.

Select a compatible art treatment and color palette.

Never inherit the application theme or its colors.
The video must have an independent visual identity.

Use one secondary visual technique only when
it improves communication.

Do not mix unrelated styles.

Do not invent facts or numerical data.

Do not use generated images, AI-generated video,
external footage or cinematic scenes.

Return a structured VideoBrief, ArtDirection
and SelectionRationale.

Explain internally why this direction is best
and which alternatives were rejected.
```

### Prompt base del Scene Planner

```text
You are the Scene Planner of CuriosAI.

Receive an approved VideoBrief, MotionArchetype
and ArtDirection.

Your job is to create a sequence of executable
procedural animation scenes.

Use only available renderable elements and
components from the current project.

For every scene specify:

1. Purpose.
2. Duration in seconds.
3. Starting and ending states.
4. Key visual events.
5. Element positions and hierarchy.
6. Motion properties.
7. Easing and timing.
8. Reading hold.
9. Exit transition.

Keep text concise and readable.

Do not animate everything simultaneously.

Do not invent visual assets that do not exist.
Use existing components, simple geometry or
approved procedural primitives.

The scene must explain the content, not merely
decorate it.

Maintain visual consistency throughout the video.

Return validated structured scene data.
```

---

## 11. Motion Engineering Pipeline

El pipeline debe recoger las mejores prácticas del documento adjunto.

### 11.1 Brief

Antes de renderizar, preparar un brief con:

- Formato de entrega.
- Resolución.
- FPS.
- Duración.
- Arquetipo.
- Paleta.
- Tipografía.
- Composición.
- Escenas.
- Timing.
- Elementos necesarios.
- Limitaciones.

### 11.2 Timeline

Trabajar primero en segundos y convertir después a frames.

Por ejemplo, a 30 fps:

| Evento | Tiempo | Frame |
|---|---:|---:|
| Inicio | 0 s | 0 |
| Hook visible | 0,6 s | 18 |
| Hook estabilizado | 1,2 s | 36 |
| Mecanismo comienza | 2 s | 60 |
| Resultado visible | 4 s | 120 |
| Hold final | 5 s | 150 |

Estos son valores ilustrativos, no timings universales.

### 11.3 Determinismo

Cuando el proyecto utilice Remotion:

- Derivar las propiedades animadas del frame actual mediante `useCurrentFrame()`.
- Utilizar las funciones de interpolación y spring de la infraestructura existente.
- No depender de CSS transitions independientes del frame para la animación principal.
- Controlar cualquier variación mediante seeds fijos.
- Evitar `Math.random()` sin seed.
- Mantener las propiedades editables como constantes o configuración del proyecto.

Si el renderer actual utiliza otro mecanismo, conservar su arquitectura y aplicar el mismo principio de determinismo.

### 11.4 Motion profiles

Los siete arquetipos pueden reutilizar seis perfiles de movimiento:

| Profile | Personalidad | Uso |
|---|---|---|
| Precise | Controlado | Datos, UI y diagramas |
| Organic | Suave | Papel, naturaleza y formas |
| Playful | Expresivo | Personajes y curiosidades |
| Energetic | Rápido | Editorial y hooks |
| Editorial | Tipográfico | Titulares y transiciones |
| Diagrammatic | Funcional | Sistemas y mecanismos |

No crear un motor de física distinto para cada arquetipo.

Cada perfil debe definir duraciones, easing y límites de movimiento reutilizables.

### 11.5 Control de composición

Cada escena debe comprobar:

- Márgenes de seguridad.
- Jerarquía visual.
- Tamaño de texto.
- Límites de líneas.
- Solapamientos.
- Contraste.
- Posiciones.
- Lectura correcta.
- Consistencia con la escena anterior y posterior.

El texto debe mantenerse visible el tiempo suficiente para ser leído.

### 11.6 Revisión de frames

Renderizar al menos:

1. Frame inicial de cada escena.
2. Frame de aparición del elemento principal.
3. Frame del resultado o concepto importante.
4. Frame del hold.
5. Frame previo a la transición.
6. Frame posterior a la transición.

Además, generar una preview reproducible a velocidad normal.

No validar una animación únicamente inspeccionando el primer frame.

### 11.7 Corrección localizada

Toda modificación debe responder a cuatro campos:

```text
LOCATION:
Scene 2, frame 120.

OBSERVED DEFECT:
The explanatory label overlaps the diagram.

REQUESTED CHANGE:
Move the label 32px to the right.

MUST REMAIN UNCHANGED:
Diagram geometry, scene duration,
color palette and transition timing.
```

Primero corregir legibilidad, después composición, después timing y finalmente detalles estéticos.

---

## 12. Paleta de componentes y reutilización

Antes de desarrollar nuevos componentes, el agente debe identificar los elementos que ya existen y reutilizarlos.

El objetivo es tener una pequeña biblioteca transversal:

**Typography**
- Headline.
- Subtitle.
- Label.
- Number counter.
- Highlight word.

**Geometry**
- Circle.
- Rectangle.
- Polygon.
- Path.
- Connector.
- Grid.

**Explanation**
- Diagram node.
- Arrow.
- Process step.
- Chart.
- Timeline.
- Comparison panel.

**Characters**
- Basic character.
- Face/expression.
- Simple articulated body.
- Animal silhouette.
- Mascot.

**Composition**
- Split layout.
- Center stage.
- Editorial layout.
- Grid layout.
- Layered composition.

Los elementos deben ser agnósticos al arquetipo cuando sea posible.

Por ejemplo, un componente `Arrow` puede utilizarse en Flat Vector, Geometric Data o Isometric World.

Lo que cambia es su apariencia y su comportamiento, definidos por ArtDirection y MotionProfile.

---

## 13. Separación de responsabilidades y módulos

No asumir que el repositorio tiene estos nombres de archivos o carpetas.

Después de inspeccionar el código, adaptar la estructura actual para que existan estas responsabilidades, reutilizando los módulos existentes:

```text
Animation System
│
├── Director
│   ├── Content Understanding
│   ├── Narrative Selection
│   ├── Archetype Selection
│   └── Selection Rationale
│
├── Art Direction
│   ├── Palette Selection
│   ├── Typography
│   ├── Composition
│   └── Treatments
│
├── Motion Registry
│   ├── Archetypes
│   └── Motion Profiles
│
├── Scene Planner
│   ├── Scene Structure
│   ├── Key Events
│   └── Timing
│
├── Visual Components
│   ├── Typography
│   ├── Geometry
│   ├── Diagrams
│   ├── Characters
│   └── UI
│
├── Renderer
│   ├── Scene Rendering
│   ├── Transitions
│   └── Video Export
│
└── Quality Control
    ├── Frame Inspection
    ├── Layout Validation
    └── Render Validation
```

Evitar introducir una segunda implementación de Director, Scene Planner o Renderer si ya existe una que pueda refactorizarse.

---

## 14. Plan de implementación

Desarrollar de forma incremental.

### Phase 0 — Repository Audit

Antes de tocar código:

1. Inspeccionar la estructura del repositorio.
2. Localizar el Director actual.
3. Localizar el Scene Planner.
4. Identificar el renderer y la infraestructura de animación.
5. Identificar cómo se construye el prompt actual.
6. Seguir el origen de los tokens de color y tema.
7. Localizar los componentes y assets gráficos.
8. Identificar cómo se generan los vídeos y cómo se guardan.
9. Identificar tests, fixtures y mecanismos de renderizado existentes.

Crear un mapa de arquitectura actual.

**No asumir que los nombres o contratos de este PR existen en el repositorio.**

Entregar un breve diagnóstico antes de hacer un refactor masivo.

### Phase 1 — Decoupling

Eliminar la dependencia creativa del tema de interfaz.

- Separar tokens de app y tokens de vídeo.
- Crear ArtDirection independiente.
- Añadir un test que impida heredar el tema de la aplicación.
- Conservar los flujos de producción actuales.

Es la primera corrección obligatoria.

### Phase 2 — Creative Director

Implementar:

- Content understanding.
- Narrative format.
- MotionArchetype registry.
- SelectionRationale.
- Scoring.
- Diversity penalty.
- User override cuando exista.

En esta fase se debe poder seleccionar correctamente un arquetipo aunque todavía no estén implementadas todas sus variantes visuales.

### Phase 3 — Art Direction

Implementar la configuración visual independiente:

- Paletas.
- Tipografía.
- Fondos.
- Tratamientos.
- Composiciones.
- Motion profiles.

Crear al menos dos variantes cromáticas claramente diferenciadas para los arquetipos principales.

No limitar la variedad a cambiar solamente el color de fondo.

### Phase 4 — Seven Motion Archetypes

Implementar los siete arquetipos mediante los componentes y las técnicas existentes.

Priorizar:

1. Editorial / Kinetic Typography.
2. Flat Vector.
3. Paper Cutout.
4. Character-led 2D.
5. Geometric / Data Motion.
6. Isometric / Schematic.
7. UI / Process Choreography.

Cada uno debe incluir al menos una composición y un ejemplo funcional.

No crear siete motores de animación independientes.

### Phase 5 — Scene Planner Integration

Conectar el Director y el Scene Planner.

- Validar contratos.
- Generar escenas compatibles.
- Controlar duración.
- Utilizar timings deterministas.
- Comprobar el tratamiento artístico entre escenas.
- Evitar que la escena vuelva a seleccionar un estilo incompatible.

### Phase 6 — Quality Gate

Implementar validaciones automáticas y revisión visual.

La calidad visual no se puede garantizar exclusivamente con un score semántico.

El sistema debe comprobar también el resultado renderizado.

### Phase 7 — Regression and Cleanup

- Ejecutar los tests.
- Comparar previews anteriores y posteriores.
- Eliminar únicamente código obsoleto confirmado.
- Revisar dependencias.
- Confirmar que los flujos existentes siguen funcionando.
- Documentar limitaciones.

---

## 15. Tests de aceptación

### A. Selección de arquetipos

Crear fixtures con las preguntas de la matriz anterior.

Verificar que el Director escoge el arquetipo más adecuado o una alternativa razonable.

No exigir una coincidencia exacta en todos los casos: evaluar la justificación y la adecuación semántica.

### B. Dark theme regression test

Este test es obligatorio.

Ejecutar exactamente la misma pregunta con:

```typescript
appTheme = "dark";
appTheme = "light";
```

Mantener iguales los datos de entrada, historial, seed y brand kit.

Resultado esperado:

- Mismo arquetipo.
- Misma ArtDirection.
- Mismos colores.
- Mismos fondos.
- Mismo resultado visual.

El tema de la aplicación no puede cambiar la animación.

### C. Color diversity

Comprobar que diferentes arquetipos producen direcciones artísticas realmente diferentes.

Evitar que todos terminen en:

- Navy.
- Cyan.
- Purple.
- Dark background.

### D. Determinismo

Con los mismos inputs, seed y configuración:

- Los mismos elementos deben aparecer.
- Las posiciones deben ser iguales.
- Las curvas y timings deben ser iguales.
- La salida no debe contener variaciones aleatorias.

### E. Scene consistency

Verificar:

- Sin saltos de posición.
- Sin elementos fuera del canvas.
- Sin transiciones rotas.
- Sin textos ilegibles.
- Sin solapamientos indebidos.
- Sin escenas vacías por fallos de componentes.

### F. No-generative media test

Comprobar que la ruta de producción de estos vídeos no depende de:

- APIs de generación de imágenes.
- APIs de generación de vídeo.
- APIs de generación de footage.
- Servicios de media generation externos.

El uso de un LLM para interpretar la pregunta y diseñar el plan no constituye generación de assets visuales.

### G. User override

Cuando el usuario solicita expresamente un arquetipo:

- Respetarlo si está disponible.
- Conservar el resto de decisiones compatibles.
- No reemplazarlo silenciosamente por el estilo por defecto.

### H. Reduced Motion y calidad de lectura

Comprobar que los elementos esenciales siguen siendo comprensibles con movimiento reducido cuando el entorno o la configuración lo requieren.

No sacrificar legibilidad por animación.

---

## 16. Métricas de evaluación

Registrar, cuando sea compatible con los mecanismos existentes:

- Distribución de arquetipos.
- Frecuencia de repetición.
- Confianza de selección.
- Porcentaje de overrides.
- Errores de render.
-