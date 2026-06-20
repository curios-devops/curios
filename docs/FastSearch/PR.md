# PR.md — Search v2

## Overview

Introduce a new **Search** capability designed to replace the current Search implementation with a significantly faster, simpler, and more maintainable architecture.

The new version preserves the current user experience and response quality while removing the multi-agent orchestration model in favor of a **single direct LLM pipeline**.

This feature should be implemented independently from the current Search module (no internal references to legacy Search code), with the intention of later deprecating and removing the existing Search functionality entirely.

---

# Goals

* Deliver faster search responses.
* Reduce architectural complexity.
* Preserve current Search UX familiarity.
* Maintain grounded answers with cited sources.
* Improve image layout and visual relevance.
* Add smarter post-search engagement through follow-up questions.

---

# Core Changes

## 1. New Search Execution Model

### Current Model (to be replaced later)

Multi-agent swarm flow:

* Retriever agent
* Writer agent
* Orchestrator

### New Search Model

Single-pass direct generation flow:

1. Receive user query
2. Execute web retrieval
3. Execute one LLM generation call
4. Return structured answer with sources, media, and follow-ups

### LLM

Use:

* `openai-mini`

### Search Tool Priority

1. Use default OpenAI web search tool and Search news/latest info 
2. If unavailable, fallback to:

   * `Tavily`

### Media Search Tools

Use:

* `SerpAPI`

For:

* Images
* Videos

---

# Functional Requirements

---

## 2. Response Generation

Use one LLM call to generate the final answer.

The output must preserve the same high-level structure users already know:

1. Question 
2. Tabs system 
3. Media (Image Carrusel , replace 4 fixed images) 
4. AI Overview (Summary / Direct Answer)
5. Key Details
6. Quick links (Sources / References) CArrusel (replace fixed 4 )
7. Follow-ups (replace genrric Related)

---

## 3. Source Grounding

Use the top **10 retrieved links** as grounding context.

The response must:

* Anchor claims to sources
* Cite sources inline or by numbered references
* Preserve current trustworthy style

Reuse the same logical grounding approach currently used by retrieval + writer flows, but implemented directly in one generation pass.

---

## 4. Follow-ups Section

Replace current **Related** section.

New name:

## Follow-ups

Generate **3 to 5 contextual follow-up questions** relevant to the user query.

Examples:

* How does this compare to alternatives?
* What are the latest updates?
* Can I use this for business?
* What are the risks?
* Is there a cheaper option?

### Behavior

Primary:

* LLM dynamically generates relevant follow-ups.

Fallback:

If generation fails, use generic follow-up templates.

---

# UI / UX Requirements

## 5. Preserve Existing Search UI

Replicate current search result layout and styling so users feel continuity.

Keep:

* Typography
* Sections
* Source chips/cards
* General spacing
* Current visual identity

---

## 6. New Media Layout

### Current

Four square thumbnails grid.

### New

Single horizontal carousel.

Images preserve original aspect ratio:

* Landscape
* Portrait
* Square

### Behavior

* Scroll horizontally
* Smooth snapping
* Click opens source
* Lazy load images
* Maintain responsive mobile behavior

### Priority Sorting

Prefer:

1. High resolution
2. Relevant to query
3. Diverse sources
4. Non-duplicate visuals

---

# Technical Requirements

## 7. Backend Flow

```txt
User Query
   ↓
Web Search (OpenAI tool / Tavily fallback)
   ↓
Image + Video Search (SerpAPI)
   ↓
Build Search Context
   ↓
Single openai-mini generation
   ↓
Structured UI Response
```

---

## 8. Search Context Object

Provide the LLM with:

```json
{
  "query": "...",
  "web_results": [10 links],
  "images": [...],
  "videos": [...],
  "date": "...",
  "locale": "user locale"
}
```

---

## 9. Prompting Requirements

The model should:

* Answer clearly and directly first
* Use concise structure
* Cite source numbers
* Avoid hallucinations
* Prefer retrieved data over priors
* Generate useful follow-ups
* Mention uncertainty when needed

---

# Performance Targets

## 10. Speed Goals

Target total response time:

* P50: < 4 sec
* P90: < 7 sec

This should outperform the current multi-agent Search flow.

---

# Reliability

## 11. Fallbacks

If OpenAI web tool unavailable:

* Use Tavily

If SerpAPI fails:

* Return no media gracefully

If fewer than 10 links:

* Use available results

If LLM follow-ups fail:

* Use generic templates

---

# Analytics

## 12. Track Metrics

Capture:

* Search latency
* Tool latency
* Click-through rate on sources
* Click-through rate on media
* Follow-up clicks
* Zero-result rate
* User satisfaction

---

# Migration Plan

## Phase 1

Launch Search behind feature flag.

## Phase 2

A/B test vs current Search.

Measure:

* Speed
* CTR
* Retention
* Satisfaction

## Phase 3

Promote Search as default.

## Phase 4

Remove legacy Search system.

---

# Acceptance Criteria

## Functional

* Query returns grounded answer
* Uses one LLM call
* Uses up to 10 sources
* Shows image/video carousel
* Shows 3–5 follow-ups

## UX

* Looks like current Search UI
* Faster perceived load time
* Responsive on mobile + desktop

## Technical

* OpenAI web search primary
* Tavily fallback
* SerpAPI for media
* Stable under concurrent load

---

# Notes for Engineering

Do not couple implementation to old Search internals.

Recreate only needed logic in a clean isolated module so legacy Search can be deleted later without dependencies.

Recommended module names:

```txt
search/
  controller.ts
  providers/
  prompts/
  formatter/
  ui/
```

---

# Final Outcome

A much faster, cleaner, modern Search experience that keeps the best parts of the current product while removing unnecessary agent complexity.
