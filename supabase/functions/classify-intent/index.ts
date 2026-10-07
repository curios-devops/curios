// deno-lint-ignore-file no-import-prefix
// Auto Mode intent router.
// PRIMARY: OpenAI Decisions API — one call answers two typed questions: which mode
// (choice, with probabilities → we take the argmax) and whether the user wants to buy
// (predicate). FALLBACK: gpt-5-nano → gpt-5-mini text classification (mode only).
// Returns { mode, probabilities?, buyProbability (null when unknown), backend }.
// Orchestration layer only — does not call any downstream mode.
import { decide } from "../_shared/decisions.ts";

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
const DECISIONS_TIMEOUT_MS = 1500;

type Mode = "search" | "stories" | "movie" | "character";
const VALID_MODES: Mode[] = ["search", "stories", "movie", "character"];

// Single source of truth for what each mode is for — used by Decisions and the fallback prompt.
// Search is deliberately NOT described as the default: the old prompt's "when unsure, choose
// search" produced a heavy Search bias and almost no Video/Character routes.
const MODE_CHOICES: { value: Mode; description: string }[] = [
  {
    value: "search",
    description:
      "A quick written answer is enough: a specific fact, number, price, date, definition, name, score, weather, address, recipe, how-to steps, a list of options or a product to buy. Reading for a few seconds fully satisfies it.",
  },
  {
    value: "stories",
    description:
      "News and evolving situations: what is happening, the latest developments, trends, or an ongoing story around a topic, company, person, market or event, best told with several sources.",
  },
  {
    value: "movie",
    description:
      "Curiosity best answered by a short explainer VIDEO: how or why something works or happens, a process, a natural or scientific phenomenon, a historical event, a place, an animal, space, the body, 'show me', 'what would it look like', 'explain ... visually' or 'tell me the story of'.",
  },
  {
    value: "character",
    description:
      "The user wants a live CONVERSATION with a person: chatting, talking to someone, advice, coaching, tutoring, practicing a language or interview, role-play, talking to a persona or expert, emotional support, or addressing the assistant personally ('can you', 'let's talk', 'I feel', 'help me practice').",
  },
];

const MODE_INSTRUCTIONS =
  "Pick the Curios experience that best answers this request. Judge what the user would enjoy most, not what is easiest: choose search only when a short written answer fully satisfies the request.";

const BUY_INSTRUCTIONS =
  "The user intends to buy, shop for, order, find deals or prices for, or choose a product to purchase right now — not merely learn how something works or follow news about it.";

const SYSTEM_PROMPT = `You are an intent router. ${MODE_INSTRUCTIONS}
Classify the user's query into exactly ONE mode:

${MODE_CHOICES.map((c) => `- "${c.value}": ${c.description}`).join("\n")}

Respond with strict JSON only: {"mode":"search|stories|movie|character"}.`;

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

    const answers = await decide(query, [
      { type: "choice", name: "mode", instructions: MODE_INSTRUCTIONS, choices: MODE_CHOICES },
      { type: "predicate", name: "buy", instructions: BUY_INSTRUCTIONS },
    ], DECISIONS_TIMEOUT_MS);

    const probabilities = answers?.mode?.probabilities;
    if (probabilities?.length) {
      const top = probabilities.reduce((a, b) => (b.probability > a.probability ? b : a));
      if (VALID_MODES.includes(top.value as Mode)) {
        const buy = answers?.buy?.probability;
        return jsonResponse({
          mode: top.value,
          probabilities,
          buyProbability: typeof buy === "number" ? buy : null,
          backend: "decisions",
        });
      }
    }

    // Decisions unavailable → previous text classifier (mode only; client resolves buy intent).
    let mode = await classifyWithModel("gpt-5-nano", query);
    if (!mode) mode = await classifyWithModel("gpt-5-mini", query);

    return jsonResponse({ mode: mode ?? "search", buyProbability: null, backend: mode ? "gpt-5" : "default" });
  } catch (err) {
    console.error("classify-intent error", err);
    // Never block the user — degrade to search.
    return jsonResponse({ mode: "search", buyProbability: null, backend: "default" });
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
