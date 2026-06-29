CuriosAI — Blueprint del Curiosity Engine
Un sistema autónomo de conocimiento exploratorio
(Perplexity + Wikipedia + TikTok + SEO Engine)
0. Visión

El Curiosity Engine es el núcleo de CuriosAI.

Su objetivo no es responder preguntas ni entretener, sino:

transformar curiosidad humana en conocimiento navegable, compartible, indexable y expandible.

El sistema debe:

responder preguntas,
crear conocimiento estructurado,
construir un grafo de curiosidad,
generar contenido SEO,
alimentar un feed de descubrimiento,
evitar doomscrolling,
mantener ciclos activos de aprendizaje.
1. Principios arquitectónicos
1.1 Single Source of Truth

Todo parte de una entidad única:

CuriosityNode

No existen:

posts,
chats,
noticias,
shares,
páginas SEO,

como entidades primarias.

Todo deriva de un CuriosityNode.

1.2 Una pregunta = un activo

Cada pregunta realizada por un usuario genera:

User Question
      ↓
CuriosityNode
      ↓
Space
      ↓
Share
      ↓
SEO Page
      ↓
Feed Item
      ↓
Graph Expansion
2. Entidades principales
2.1 CuriosityNode
interface CuriosityNode {

    id:string;

    query:string;

    answer:string;

    shortSummary:string;

    explainLikeImFive:string;

    sources:Source[];

    images:Media[];

    videos:Media[];

    topicClusters:string[];

    tags:string[];

    createdAt:Date;

    updatedAt:Date;

    agentVersion:string;

    seo:SEOData;

    graph:GraphData;

    metrics:Metrics;
}
2.2 GraphData
interface GraphData {

    parentNodes:string[];

    horizontalNodes:string[];

    verticalNodes:string[];

    broaderNodes:string[];

    depth:number;

    clusterId:string;
}
2.3 Share
interface Share {

    shareId:string;

    nodeId:string;

    createdAt:Date;

    public:boolean;

    views:number;

    clicks:number;

    shares:number;
}
2.4 Space
interface Space {

    userId:string;

    nodeIds:string[];
}
3. Pipeline principal
Stage 1
Question Intake

Entrada:

Usuario pregunta

Ejemplo:

¿Por qué sube la inflación?

El sistema:

normaliza
detecta idioma
extrae intención
clasifica categoría

Output:

{
  "intent":"education",
  "category":"economics",
  "complexity":"medium"
}
Stage 2
Retrieval Engine

Consulta:

Search
News
Images
Videos

Obtiene:

sources
media
metadata
context
Stage 3
Explanation Engine

El agente genera:

full explanation
short explanation
ELI5
key facts
FAQ
related questions
Stage 4
Curiosity Graph Generator

El agente genera:

Horizontal links

Mismo tema.

Ejemplo:

inflation
interest rates
CPI
deflation
Vertical links

Temas relacionados.

economics
banking
government
employment
Upward links

Temas más generales.

macroeconomics
finance
economics
Downward links

Subtemas.

core inflation
consumer inflation
producer inflation
4. Curiosity Score Engine

Cada nodo recibe:

curiosityScore

Formula inicial:

curiosity =
    novelty*0.25 +
    explainability*0.25 +
    usefulness*0.25 +
    engagement*0.25
5. SEO Engine

Cada nodo genera automáticamente:

URL
/learn/why-inflation-rises
Meta
<title>
<meta description>
<canonical>
Structured data
Article
FAQPage
HowTo
QAPage
GEO optimization

Generar:

answer snippets
FAQs
semantic entities
knowledge graph markup
6. Feed Engine

El feed NO es cronológico.

Es:

graph traversal
Horizontal swipe
same topic

Ejemplo:

Inflation
↓
Interest rates
↓
CPI
Vertical swipe
related topic

Ejemplo:

Inflation
↓
Employment
↓
Politics
7. Anti Doomscroll Engine

Nunca permitir:

∞
Curiosity Burst

Máximo:

5-7 nodes

Luego:

Curiosity Reset

Ejemplo:

Has aprendido:

✓ Inflación
✓ Tipos de interés
✓ Empleo

¿Quieres?

• profundizar
• cambiar tema
• hacer una pregunta
8. Curiosity Reset Ads

Puntos de inserción:

every 5 nodes

Formato:

Sponsored Curiosity

Ejemplo:

¿Cómo invertir en ETFs?
Patrocinado.
Explicado por CuriosAI.
9. Space Engine

Cada usuario posee:

Private Knowledge Graph

No es un historial.

Es un grafo personal.

Ejemplo:

User
 ├── AI
 │    ├── LLM
 │    ├── Agents
 │    └── Robotics
 │
 └── Economy
      ├── Inflation
      └── Markets
10. Share Engine

Al compartir:

NO compartir chat.

Compartir:

CuriosityNode snapshot

Guardar:

question
answer
images
videos
sources
graph
timestamp
11. Regeneration Engine

Opcional:

Update explanation

Proceso:

old node
       ↓
retrieve
       ↓
re-explain
       ↓
new version

Mantener:

version history
12. Discovery Engine

Genera:

Trending
highest curiosity score
Emerging
fastest growing cluster
Nearby curiosity

Basado en:

embedding similarity
Serendipity

Inyectar:

10%
random exploration
13. Curiosity Graph Database

Recomendación:

Principal DB
Postgres

Guardar:

nodes
spaces
shares
Vector DB
Qdrant/Pinecone

Guardar:

embeddings
similarity
Graph DB

Opcional:

Neo4j

Guardar:

relationships
14. Autonomous Expansion Engine

Cuando un nodo obtiene suficiente tráfico:

views > threshold

Lanzar:

expand node

Generar:

5 related nodes

Ejemplo:

Inflation
    ↓
    Monetary policy
    ↓
    Central banks
    ↓
    Quantitative easing
15. Long-term Vision

El sistema evoluciona:

Question Engine
        ↓
Knowledge Engine
        ↓
Curiosity Engine
        ↓
Autonomous Curiosity Network
Resultado final

CuriosAI deja de ser:

buscador,
chatbot,
red social,
agregador de noticias,
wiki.

Y pasa a ser:

un sistema autónomo que transforma preguntas humanas en un grafo vivo, navegable, compartible e indexable de conocimiento y curiosidad.