Aquí tienes un **TODO claro y accionable** para que un agente de AI implemente el rediseño siguiendo los principios del artículo 👇

---

# 🎯 TODO — Sistema de Color “Premium UI” (Light/Dark + Warm/Cold)

## 1. Definir principio base (obligatorio)

* ❌ Prohibido usar:

  * Blanco puro `#FFFFFF`
  * Negro puro `#000000`
  * Grises neutros sin tinte
* ✅ Todo color debe tener un **tinte (bias) cálido o frío** coherente con el accent

---

## 2. Crear sistema de “temperatura de color”

### Definir 2 ejes:

* **Modo**:

  * Light
  * Dark

* **Temperatura**:

  * Cold (azulado/verdoso)
  * Warm (naranja/violeta/rojizo)

👉 Resultado: **4 variantes base del sistema**

1. Light + Cold
2. Light + Warm
3. Dark + Cold
4. Dark + Warm

---

## 3. Generar paletas derivadas (por variante)

Para cada una de las 4 variantes, el agente debe generar:

### 🎨 Backgrounds

* `bg-primary`
* `bg-secondary`
* `bg-elevated`

👉 Regla:

* Light → bases claras con tinte sutil
* Dark → bases oscuras con tinte (NO negro puro)

---

### 🧱 Borders

* `border-subtle`
* `border-default`

👉 Regla:

* Siempre derivados del background + ligero contraste
* Mantener mismo tinte

---

### ✍️ Textos

* `text-primary`
* `text-secondary`
* `text-muted`

👉 Regla:

* Nunca gris puro
* Siempre teñidos según temperatura

---

### 🌫️ Sombras

* `shadow-soft`
* `shadow-elevated`

👉 Regla:

* Sombras con color (ej: azul oscuro, violeta oscuro)
* Evitar sombras grises neutrales

---

## 4. Algoritmo de tintado (clave para el agente)

Para cualquier color neutro base:

* Aplicar mezcla:

  * Cold → agregar componente azul/cian (~2–5%)
  * Warm → agregar componente rojo/naranja (~2–5%)

Ejemplo:

* Gris neutro → gris azulado (cold)
* Gris neutro → gris cálido (warm)

---

## 5. Reglas de consistencia global

El agente debe asegurar:

* Toda la UI usa **UNA sola temperatura a la vez**
* No mezclar warm + cold dentro de una misma vista
* Todos los elementos comparten el mismo bias:

  * backgrounds
  * borders
  * text
  * shadows

---

## 6. Integración con Dark Mode

### Light Mode

* Fondos claros teñidos
* Contrastes suaves
* Sensación “aireada”

### Dark Mode

* Fondos oscuros NO negros
* Mayor saturación en tintes
* Sombras más sutiles (menos necesarias)

---

## 7. Integración con selector existente “Accent”

Aprovechando el selector actual **“Accent”**, el agente debe mapear automáticamente:

### 🎯 Mapeo definido

* Azul → **Cold Light**

* Verde → **Cold Light**

* Violeta → **Warm Light**

* Naranja → **Warm Light**

---

## 8. Lógica automática del sistema

Cuando el usuario selecciona un accent:

1. Detectar color elegido

2. Asignar temperatura automáticamente:

   * Azul / Verde → Cold
   * Violeta / Naranja → Warm

3. Aplicar:

   * Light mode por defecto
   * Variante correspondiente (Cold/Warm)

4. Generar toda la paleta derivada coherente

---

## 9. (Opcional recomendado) Extensión a Dark Mode

Si el usuario activa Dark Mode:

* Mantener misma temperatura (Cold/Warm)
* Recalcular:

  * backgrounds → oscuros teñidos
  * textos → claros con bias
  * sombras → más sutiles

---

## 10. Validaciones que el agente debe ejecutar

* ❌ No existen colores:

  * #FFFFFF
  * #000000
  * grises sin tinte

* ✅ Todos los colores:

  * tienen bias detectable (warm/cold)
  * pertenecen a una única temperatura

* ✅ Contraste accesible (WCAG mínimo)

---

## 💡 Resultado esperado

Una UI que:

* Se percibe más **premium**
* Tiene **coherencia visual total**
* Refuerza la **identidad de marca sin saturar**
* Funciona correctamente en light y dark mode