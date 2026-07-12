// deno-lint-ignore-file no-import-prefix
// Auto Mode intent classifier.
// Classifies a user query into one of: search | avatar | movie and returns { mode }.
// Orchestration layer only — does not call any downstream mode.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const OPENAI_ORG_ID = Deno.env.get("OPENAI_ORG_ID");
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 8000; // Keep fast — Auto must not block the user.

type Mode = "search" | "avatar" | "movie" | "stories";
const VALID_MODES: Mode[] = ["search", "avatar", "movie", "stories"];

const SYSTEM_PROMPT = `You are an intent router. Classify the user's query into exactly ONE mode:

- "search": a specific, factual lookup with a concrete answer — facts, prices, definitions, a single piece of news. Examples: "Tesla stock price", "Who won the 2026 election", "Latest iPhone release date".
- "stories": a request to understand what's happening, trending, or emerging around a topic — trend analysis and "what's new / what's happening / latest developments" framed broadly. Examples: "What's happening with AI?", "What's new in technology this year?", "Latest trends in startups", "Tell me about quantum computing developments".
- "avatar": educational / explainer requests where the user wants to learn or understand a concept. Examples: "Explain black holes", "Teach me calculus", "Help me understand inflation".
- "movie": entertainment / storytelling requests meant to be experienced as a narrative. Examples: "Tell me the story of Rome", "Explain WW2 as a movie".

Rules:
- "search" is for a single concrete fact; "stories" is for broader trends/developments on a topic.
- Never output "cinematic".
- When unsure, choose "search".

Respond with strict JSON only: {"mode":"search|stories|avatar|movie","reasoning":"<short>"}.`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// @ts-ignore: Deno.serve is the entry point for Supabase Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim() : "";

    if (!query) {
      return jsonResponse({ error: "Missing query" }, 400);
    }

    // Try the fast/cheap model first; if it isn't enabled on the org (or errors),
    // fall back to gpt-5-mini before finally defaulting to "search".
    let mode = await classifyWithModel("gpt-5-nano", query);
    if (!mode) mode = await classifyWithModel("gpt-5-mini", query);

    return jsonResponse({ mode: mode ?? "search" });
  } catch (err) {
    console.error("classify-intent error", err);
    // Never block the user — degrade to search.
    return jsonResponse({ mode: "search" });
  }
});

// Run one classification attempt with a given gpt-5 model.
// Returns a valid Mode, or null if the call/parse fails (so the caller can fall back).
async function classifyWithModel(model: string, query: string): Promise<Mode | null> {
  const payload = {
    model,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: query },
    ],
    max_output_tokens: 50,
    reasoning: { effort: "minimal" },
    text: { format: { type: "json_object" } },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
  };
  if (OPENAI_ORG_ID) headers["OpenAI-Organization"] = OPENAI_ORG_ID;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI classify error", { model, status: response.status, errText });
      return null;
    }

    const data = await response.json();
    return safeParseMode(extractOutputText(data));
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("classify-intent fetch failed", { model, err });
    return null;
  }
}

// Pull the text out of a Responses API payload (mirrors fetch-openai's gpt-5 handling).
function extractOutputText(data: Record<string, unknown>): string {
  if (typeof data?.output_text === "string" && data.output_text.length > 0) {
    return data.output_text as string;
  }
  const output = data?.output;
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown })?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      const text = (block as { text?: unknown })?.text;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts.join("");
}

function safeParseMode(text: string): Mode | null {
  if (!text) return null;
  try {
    const obj = JSON.parse(text);
    const mode = obj?.mode;
    if (typeof mode === "string" && VALID_MODES.includes(mode as Mode)) {
      return mode as Mode;
    }
  } catch {
    // ignore parse errors — caller defaults to search
  }
  return null;
}
