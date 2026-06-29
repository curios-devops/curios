SYSTEM INSTRUCTION TO CAP RESULTS

Your goal is to:
1. Stay below a total character limit (MAX_TOTAL=2000).
2. Prioritize higher-quality engines (Brave > Tavily > SearXNG).
3. Preserve diversity across sources.
4. Keep the code minimal, deterministic, and fast.

---

# INPUT DESCRIPTION
start with the object or dictionary payload you have that contains the  search results:
search_results = {
  "Brave":   [Result1, Result2, Result3],
  "Tavily":  [Result1, Result2, Result3],
  "SearXNG": [Result1, Result2, Result3]
}

Each Result should keep (so eliminate other information):
- title
- text or snippep
- url 

---

# PARAMETERS
MAX_TOTAL = 2000                # global character cap
ENGINES = ["Brave", "Tavily", "SearXNG"]
RESULTS_PER_ENGINE = 3

# Round weighting by source reliability
ROUND_WEIGHTS = {
    1: {"Brave": 2, "Tavily": 1, "SearXNG": 0},
    2: {"Brave": 1, "Tavily": 1, "SearXNG": 1},
    3: {"Brave": 0, "Tavily": 1, "SearXNG": 2}
}

# Proportion of total budget per round (sum = 1.0)
ROUND_RATIOS = {1: 0.45, 2: 0.35, 3: 0.20}

---

# OUTPUT
Truncated for input to an LLM, respecting MAX_TOTAL.

Each snippet must appear as:
[12:35 PM, 11/6/2025] Marcelo  Vega: ---

# LOGIC (Pseudocode Reference)

function build_context(search_results):
    context = ""

    for round in [1, 2, 3]:
        round_cap = MAX_TOTAL * ROUND_RATIOS[round]
        total_weight = sum(ROUND_WEIGHTS[round].values())

        for engine in ENGINES:
            weight = ROUND_WEIGHTS[round][engine]
            if weight == 0:
                continue

            per_snippet_cap = round_cap * (weight / total_weight)
            snippet = search_results[engine][round - 1]  # index 0-based

            if not snippet or len(snippet.text.strip()) < 50:
                continue

            trimmed = snippet.text[:int(per_snippet_cap)]

            context += f"[{engine}] {snippet.title}\n{trimmed}\n\n"

            if len(context) >= MAX_TOTAL:
                return context[:MAX_TOTAL]

    return context[:MAX_TOTAL]

---

# RULES
- Implement truncation by *characters* or tokens.
- Maintain readability and structured separation.
- Skip empty or irrelevant snippets (<50 chars).
- The code must be self-contained and easily adaptable.
- Output must be deterministic given same inputs.
- Avoid external dependencies beyond the standard library.

---

# EXAMPLE BEHAVIOR
If MAX_TOTAL = 2000:
- Round 1 (45% → 900 chars): Brave(2x) + Tavily(1x)
- Round 2 (35% → 700 chars): Brave(1x) + Tavily(1x) + SearXNG(1x)
- Round 3 (20% → 400 chars): Tavily(1x) + SearXNG(2x)
Total ≈ 2000 chars of context, prioritized by engine reliability and round order.

