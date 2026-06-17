🧠 BLUEPRINT DE REFACTOR — SEARCH → ASK DEEPER (PRO 👑)
0. OBJETIVO DEL REFACTOR

Convertir el actual Fast Search en un sistema de 2 niveles:

⚡ Default Search (más corto que ahora)
respuesta más concisa que el estado actual
optimizada para consumo rápido
menor carga de fuentes
síntesis directa
👑 Ask Deeper (Pro Mode toggle)
investigación ampliada + estructurada
multi-query retrieval
mayor evidencia + visual + export
1. NUEVA UX (FRONTEND)
Input único:

“Search…”

Debajo o al lado del input:

Toggle Pro:

👑 Ask Deeper (Pro)

Estados UI:
OFF (default)
sin badge visible o badge discreto “Fast”
ON
badge activo: 👑 PRO ACTIVE
animación ligera o highlight del input
2. DEFAULT SEARCH (REFINADO)
Cambios clave vs tu Fast actual:

👉 IMPORTANTE: hacerlo más corto que ahora

Pipeline:
1–5 fuentes máximo
1 query principal
síntesis directa (no estructurada pesada)
respuesta más compacta que hoy
1–2 citas máximo visibles
Output style:
párrafos cortos
sin exceso de contexto
sin “deep reasoning dump”
Objetivo UX:

“rápido, claro, suficiente”

3. 👑 ASK DEEPER PRO MODE (CORE VALUE)

Cuando toggle ON:

3.1 MULTI-QUERY SYSTEM (CRÍTICO)

Se generan 3 queries automáticamente:

Query 1 — Principal
la pregunta original optimizada
Query 2 — Contrapunto
busca evidencia alternativa o crítica
“risks”, “downsides”, “criticism”, “limitations”
Query 3 — Expansión contextual
amplía a:
actualidad
tendencias recientes
contexto social / mercado
“what people are saying”
si aplica: Reddit / forums / expert commentary
3.2 RETRIEVAL EXPANSION
Fuentes:
10 → 30+ sources
mezcla obligatoria:
news
documentation
academic / technical (si aplica)
social signals (Reddit, X, forums)
authority sites
3.3 IMAGE AUTO-GENERATION (NEW FEATURE)

Para cada Ask Deeper response:

Regla:
generar 1 imagen contextual automática

Ejemplos:

explicación conceptual → diagram
producto → comparativa visual
lugar → visual overview
trend → infographic style summary

👉 Imagen aparece al inicio o en sección “Overview”

3.4 STRUCTURE DE OUTPUT

El output en Pro debe ser:

1. Summary (short but richer than default)
no demasiado largo
más contexto que default
2. Key Insights
bullets claros
3. Evidence (multi-source)
citas múltiples
4. Contrapoints / Risks
diferencias de opinión
limitaciones
5. Context / Trends
actualidad
social signal layer
3.5 PDF EXPORT (PRO FEATURE)

Botón:

📄 Export PDF

Incluye:

full answer
sources
image
structured sections

Formato:

clean report style
shareable link optional
4. RESPONSE LENGTH RULE
IMPORTANTE (muy clave para UX):
Mode	Length
Default Search	↓ 20–30% más corto que actual
Ask Deeper	↑ 1.5x–2x más largo que default

👉 Esto crea contraste claro:

default = snack
pro = report
5. BADGE SYSTEM (👑 ASK DEEPER PRO)
UI rules:
When OFF:
no badge visible OR subtle “Fast”
When ON:
👑 PRO badge appears:
glowing or highlighted
attached to input or response header
Optional microcopy:

“Deeper research with more sources, context, and visuals”

6. SYSTEM ARCHITECTURE
Default Search pipeline:
query
→ 1 query optimization
→ 1–5 retrieval
→ fast LLM synthesis
→ short answer output
Ask Deeper pipeline:
query
→ query expansion (3 queries)
→ broad retrieval (10–30+ sources)
→ rerank + deduplicate
→ claim extraction
→ synthesis LLM (structured output)
→ image generation module
→ PDF builder module
→ final response
7. PRODUCT PRINCIPLES (IMPORTANT)
Regla 1

Default MUST feel:

faster + slightly more concise than current system

Regla 2

Pro MUST feel:

“this is research-grade intelligence”

Regla 3

Toggle MUST feel:

“unlock deeper intelligence”, not “switch mode”

8. WHAT MAKES THIS POWERFUL (INSIGHT)

Este diseño crea 3 cosas clave:

1. hábito diario (default)
2. power-user upgrade (Pro toggle)
3. percepción de inteligencia escalable (depth dial)
9. ONE-LINE PRODUCT DEFINITION

“Curios is a search engine with a depth dial: from instant answers to research-grade intelligence with one toggle.”

Si quieres, el siguiente paso lógico es el más importante a nivel de negocio:

👉 cómo limitar costes del Ask Deeper (sin degradar calidad) con caching + query reuse + source clustering

Ahí es donde se decide si esto escala o se rompe económicamente.