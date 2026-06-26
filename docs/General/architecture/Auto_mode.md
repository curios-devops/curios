# Feature Blueprint: Unified Intent Router with Auto Mode

## Objective

Introduce a new default mode called **Auto** that intelligently routes user requests to existing features based on detected intent.

The implementation must preserve existing functionality and avoid modifying the internal behavior of Search, Histories, Avatar, or Movie modes.

---

# Non-Goals

The following modules are considered stable and MUST NOT be modified:

* Search
* Histories
* Avatar
* Movie

Their prompts, pipelines, APIs and rendering behavior should remain unchanged.

This feature only adds an orchestration layer before existing modes and then call the modes normally with the user quewry.

---

# High-Level Architecture

```text
Input
 ↓
Mode Resolver
 ↓
If explicit mode selected:
    Direct execution
Else (Auto mode):
    Intent Detection
 ↓
Intent Router
 ↓
Search | Histories | Avatar | Movie 
 ↓
Existing flow 
```

---

# User Modes

Supported modes:

* Auto (new default)
* Search
* Histories
* Avatar
* Movie / (Cinematic is legacy stay for now but no automatic redirect )

---

# Mode Selection Rules

## Explicit Mode

If user manually selects a mode:

* Skip intent detection.
* Skip automatic routing.
* Execute selected mode immediately.

Examples:

Avatar selected:

Input
↓
Avatar()

Movie selected:

Input
↓
Movie()
Cinematic  selected:

Input
↓
Cinematic ()

Search selected:

Input
↓
Search()

Histories selected:

Input
↓
Histories()

The user always overrides automation.

---

## Auto Mode (🚀)

Auto mode becomes the default.(use 🚀 icon )

Flow:

Input
↓
Intent Detection
↓
Intent Router
↓
Target Mode
↓
Existing Feature

---

# Intent Detection

Intent detection should classify requests into high-level categories.

Examples:

### Informational

Examples:

* What is quantum computing?
* Latest OpenAI news
* Tesla stock price

Route to:

Search

---

### Educational / Explainer

Examples:

* Explain black holes
* Teach me calculus
* Help me understand inflation

Route to:

Avatar

---

### Entertainment / Storytelling

Examples:

* Tell me the story of Rome
* Explain WW2 as a movie
* Create a cinematic experience

Route to:

Movie (cinematic is legacy never route to cinematic)

---

### Stories

Examples:

* What´s happening with .. (AI)?
* Tell me about ... (quantum computing)
* What´s new in .. (tecnology this year 2026?)
* Latest trend in .. (what trend are growing in startUps?)

Route to:

Stories
