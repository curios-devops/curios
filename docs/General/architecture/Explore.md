now we want to create a new page it will call Explore and url will be curiosai.com/explore and update our Explore in the sidebar and instead of showing the signin/ signup modal, should call this new page. for this new page base on https://www.perplexity.ai/discover but use our the disign in our style guide and homepage guide so app keep consistent looks , make light dartk theme responsive scnt responsibe , for the fucntionallyty use our api key Serpapi and end point The API endpoint is https://serpapi.com/search?engine=google_news (yoy=u can review the API here https://serpapi.com/google-news-api), so the generalidea is present top news including a smaill image and snipped, you can also for the first new put the title sniped and right the Image

Below you will find the full PRD: 

# Product Requirements Document (PRD) for Curios Explore 2026 — “The Curiosity Engine”

Internal Codename

Project: Neural Explore

⸻

1. Vision

Transform Curios Explore from a passive AI news feed into an interactive curiosity engine that users:

* explore for long sessions,
* emotionally react to,
* share socially,
* and return to multiple times per day.

The experience should feel like:

* TikTok for intelligence
* Perplexity Discover evolved
* A living map of the internet’s implications

The system should not primarily show “news”.

It should show:

* predictions,
* implications,
* debates,
* conspiratorial interpretations,
* startup opportunities,
* geopolitical consequences,
* rabbit holes.

⸻

2. Product Principles

Core UX Philosophy

Every piece of content should:

1. trigger curiosity,
2. invite interaction,
3. branch into exploration,
4. create identity/opinion,
5. feel alive.

⸻

Emotional Goals

Users should feel:

* “Whoa.”
* “I need to send this.”
* “I didn’t think about it that way.”
* “One more rabbit hole.”

⸻

3. Unified Experience Architecture

The 4 concepts are NOT separate features.

They are layers of the same exploration object.

Each content object (“Curiosity Node”) contains:

* Hot Takes
* Rabbit Hole Graph
* Battle Cards
* Perspective Layers (“Explain like conspiracy”)
* AI-generated visual graph
* Share mechanics

⸻

4. Main Experience Flow

⸻

FEED → EXPLORE → DEPTH LOOP

Step 1 — Discovery Feed

The feed is not a traditional article list.

Each card is:

* immersive,
* opinionated,
* predictive,
* emotionally charged.

Example

Large edge-to-edge card:

“NVIDIA isn’t buying robotics startups.
They’re building the operating system for physical AI.”

Underneath:

* 🔥 82% agree
* ⚔️ Contrarian take
* 🧠 Explore implications
* 🌐 Open rabbit hole

⸻

Step 2 — Expand Node

Tapping a card opens the “Curiosity Node”.

This is the core surface.

It contains:

* AI-generated visual graph
* expandable hot takes
* battle card
* layered perspectives
* branching exploration nodes

⸻

Step 3 — Infinite Rabbit Holes

Users navigate via:

* graph nodes,
* swipes,
* AI-generated implications,
* conversational exploration.

The experience should feel semi-addictive.

⸻

5. Feature Breakdown

⸻

FEATURE 1 — Hot Takes Engine

Goal

Turn every news item into a socially shareable insight object.

⸻

AI Outputs Per Story

For every story generate:

Required:

* Main hot take
* Contrarian take
* Bullish prediction
* Bearish prediction
* “What happens next”
* Startup opportunity
* Meme caption

⸻

Tone

Not clickbait.
Intelligent but emotionally charged.

Think:

* investor Twitter
* top Reddit comment
* elite tech analyst
* futurist energy

⸻

Example

INPUT:

Meta releases AI glasses

OUTPUT:

Hot Take:
“Smartphones are ending faster than people realize.”
Contrarian:
“No one actually wants wearable AI.”
Bullish:
“AI wearables create the next trillion-dollar OS.”
Bearish:
“This becomes the biggest surveillance platform in history.”

⸻

FEATURE 2 — Rabbit Hole Graph

Goal

Create infinite exploration depth.

⸻

Core Concept

Every story becomes a dynamic graph.

Nodes represent:

* implications,
* related entities,
* historical parallels,
* industries affected,
* philosophical questions,
* hidden incentives,
* adjacent topics.

⸻

Example Graph

AI Glasses
 ├── Death of smartphones
 ├── Attention economy
 ├── China hardware race
 ├── Privacy collapse
 ├── Neural interfaces
 └── Startup opportunities

⸻

Visual System

The graph must:

* feel organic,
* animate smoothly,
* have depth,
* feel semi-alive.

⸻

Visual Generation Layer

Use:

* GPT Image-2
* Nano Banana

to generate:

* abstract graph backgrounds,
* exploration landscapes,
* futuristic knowledge-map visuals,
* dynamic AI-generated node art.

⸻

AI Image Generation Requirements

For each major node:
Generate:

* abstract semantic background,
* mood image,
* conceptual topology visualization.

Style:

* dark futuristic,
* liquid gradients,
* neural systems,
* Apple + Nothing + sci-fi editorial.

Avoid:

* generic stock images,
* news thumbnails,
* corporate aesthetics.

⸻

Graph Interaction

Supported interactions:

* pinch zoom,
* drag,
* node expansion,
* kinetic transitions,
* long press previews,
* depth stacking.

⸻

FEATURE 3 — Battle Cards

Goal

Generate intellectual conflict.

⸻

Structure

Every major story gets:

* 2 opposing AI-generated viewpoints.

⸻

Example

TOPIC:

“AI should replace universities”

LEFT:

Universities are obsolete gatekeepers.

RIGHT:

Human mentorship is irreplaceable.

⸻

User Actions

* Agree
* Disagree
* AI Judge
* Roast this take
* Generate stronger argument
* “Which side wins historically?”

⸻

AI Judge

LLM evaluates:

* logic quality,
* evidence,
* long-term plausibility,
* bias.

⸻

FEATURE 4 — Perspective Layers (“Explain Like…”)

Goal

Make content uniquely shareable.

⸻

Generated Perspectives

Every story receives multiple lenses:

Required:

* Normal explanation
* Investor explanation
* Geopolitical explanation
* Cynical explanation
* Conspiracy-style explanation
* Meme explanation
* Founder explanation
* “What nobody is saying”

⸻

Example

TOPIC:

OpenAI launches hardware

PERSPECTIVES:

Investor:
“The AI platform war is shifting into hardware lock-in.”
Conspiracy:
“This is about controlling the future interface layer.”
Founder:
“This kills standalone AI wrappers.”
Meme:
“We recreated the iPhone launch but with GPUs.”

⸻

6. Feed Ranking System

Replace “news relevance”

With:

Curiosity Score

⸻

Curiosity Score Inputs

* emotional polarity
* novelty
* future impact
* debate potential
* conspiracy potential
* startup opportunity density
* memeability
* rabbit hole depth
* share probability

⸻

Formula (initial)

Curiosity Score =
(virality * .25)
+ (future_impact * .25)
+ (debate * .20)
+ (novelty * .15)
+ (exploration_depth * .15)

⸻

7. AI Pipeline Architecture

⸻

INGESTION

Sources:

* Serper News API
* Twitter/X trends
* Reddit
* Hacker News
* YouTube transcripts
* optional: TikTok trend extraction

⸻

PROCESSING

Stage 1 — Deduplication

Cluster similar stories.

⸻

Stage 2 — Curiosity Enrichment

Generate:

* hot takes,
* implications,
* perspectives,
* battle arguments,
* graph nodes,
* exploration branches.

⸻

Stage 3 — Graph Generation

Generate semantic relationship graph.

Store:

{
  "node_id": "",
  "parent_id": "",
  "relationship_type": "",
  "depth": 0
}

⸻

Stage 4 — Visual Generation

Use GPT Image-2 / Nano Banana.

Generate:

* node visuals,
* graph backgrounds,
* conceptual imagery,
* atmosphere layers.

⸻

Stage 5 — Ranking

Apply curiosity scoring.

⸻

8. UI / Design Direction

⸻

Aesthetic

Must feel:

* cinematic,
* fluid,
* intelligent,
* futuristic.

⸻

References

* Cosmos app
* Are.na
* Nothing OS
* Linear
* Apple Invites
* sci-fi HUD systems
* AI-native interfaces

⸻

Design Rules

DO:

* giant typography,
* immersive imagery,
* kinetic motion,
* layered cards,
* depth blur,
* subtle gradients,
* edge-to-edge layouts.

⸻

DO NOT:

* RSS layouts,
* boxed cards,
* tiny thumbnails,
* article grids,
* generic news app design.

⸻

9. Social Mechanics

Share Objects

Users should share:

* hot takes,
* battle cards,
* graph screenshots,
* perspective layers.

⸻

Export Formats

Generate:

* vertical story cards,
* animated snippets,
* graph snapshots,
* “AI debate” share cards.

⸻

10. Metrics

Primary:

* shares/session
* rabbit hole depth
* session duration
* revisit rate
* nodes explored/session

Secondary:

* screenshots
* social reposts
* battle participation
* perspective expansion rate

⸻

11. Suggested Tech Stack

Frontend:

* React / Next.js
* Framer Motion
* WebGL / Three.js
* React Flow or custom graph engine

Backend:

* Node.js
* Redis caching
* vector DB
* graph DB optional

AI:

* OpenAI Responses API
* GPT-5.5 / reasoning model
* GPT Image-2
* Nano Banana

Storage:

* Postgres
* Pinecone / Weaviate

⸻

12. Initial MVP Scope

Phase 1:

* Hot takes
* Battle cards
* Perspective layers
* Basic rabbit hole graph

Phase 2:

* AI-generated graph visuals
* animated graph exploration
* personalization

Phase 3:

* collaborative exploration
* social graph
* AI companions
* predictive trend engine

⸻

13. Non-Functional Requirements

The app must feel:

* instant,
* fluid,
* alive.

Maximum tolerable:

* feed load < 1.5s
* node expansion < 800ms
* graph generation async streamed

⸻

14. Key Product Insight

Curios should not become:

“AI news.”

It should become:

“The interface for exploring implications.”

The news is only the trigger.

The real product is:

* curiosity,
* exploration,
* identity,
* prediction,
* intellectual entertainment.
