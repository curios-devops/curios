// OpenAI Decisions API (POST /v1/decisions, gpt-6-luna) — typed, low-latency decisions:
// returns probabilities over predefined answers instead of generated text.
// Returns null on any failure so callers can fall back to their previous classifier.

const DECISIONS_URL = "https://api.openai.com/v1/decisions";
const MODEL = "gpt-6-luna";

export type DecisionQuestion =
  | { type: "predicate"; name: string; instructions: string }
  | {
    type: "choice";
    name: string;
    instructions: string;
    choices: { value: string; description: string }[];
  };

export type DecisionAnswer = {
  type: "predicate" | "choice" | "score" | "refusal";
  name: string;
  probability?: number;
  choice?: string;
  confidence?: number;
  probabilities?: { value: string; probability: number }[];
};

export async function decide(
  input: string,
  questions: DecisionQuestion[],
  timeoutMs: number,
): Promise<Record<string, DecisionAnswer> | null> {
  // @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  // @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
  const orgId = Deno.env.get("OPENAI_ORG_ID");
  if (!apiKey) return null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (orgId) headers["OpenAI-Organization"] = orgId;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(DECISIONS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: MODEL, input, questions }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("Decisions API error", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json() as { answers?: DecisionAnswer[] };
    const byName: Record<string, DecisionAnswer> = {};
    for (const a of data.answers ?? []) byName[a.name] = a;
    return byName;
  } catch (err) {
    console.error("Decisions API request failed", String(err));
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
