// deno-lint-ignore-file no-import-prefix
// Buy-intent tie-breaker (Gemini Flash Lite via Vertex).
// The client's keyword/pattern heuristic (src/services/shopping-intent.ts) already resolves
// most queries on its own (confident yes/no, no network call). Only the AMBIGUOUS confidence
// band falls through to this function — a single cheap yes/no classification, not a full
// intent router. Never blocks the caller: any failure/timeout defaults to false.
import { getVertexAccessToken, vertexModelUrl } from "../_shared/vertex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const MODEL = Deno.env.get("GEMINI_LITE_MODEL") || "gemini-2.5-flash-lite";
const TIMEOUT_MS = 5000; // Keep fast — this must never block Search or Auto routing.

const PROMPT = `Does this search query express an intent to BUY or SHOP for a specific product (as opposed to general research, news, learning, or entertainment)?
Query: "%QUERY%"
Respond with strict JSON only: {"isBuyIntent": true|false}`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// @ts-ignore: Deno.serve is the entry point for Supabase Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    if (!query) return jsonResponse({ error: "Missing query" }, 400);

    const isBuyIntent = await classify(query);
    return jsonResponse({ isBuyIntent });
  } catch (err) {
    console.error("classify-buy-intent error", err);
    // Never block the caller — degrade to "no buy intent".
    return jsonResponse({ isBuyIntent: false });
  }
});

async function classify(query: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const token = await getVertexAccessToken();
    const res = await fetch(`${vertexModelUrl(MODEL)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: PROMPT.replace("%QUERY%", query) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 20 },
      }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error("classify-buy-intent gemini error", res.status, (await res.text()).slice(0, 200));
      return false;
    }

    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? "")
      .join("");
    const parsed = JSON.parse(text) as { isBuyIntent?: boolean };
    return parsed?.isBuyIntent === true;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("classify-buy-intent fetch failed", err);
    return false;
  }
}
