// Context.dev Answers proxy: fresh web research for questions about current events, so the
// Character answers with today's facts. Fast mode (10 credits; the default "ultra" costs 100).
// The key stays server-side (CONTEXT_DEV_API_KEY). No retries: a live presenter is waiting, and
// on any failure the client falls back to its usual web search.
// Body { question, language?, city? } → { answer, sources } (answer null when nothing usable came back).
// Docs: https://docs.context.dev/api-reference/web-extraction/answers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 1500) : "";
  const language = typeof body?.language === "string" ? body.language.slice(0, 10) : "";
  const city = typeof body?.city === "string" ? body.city.slice(0, 80) : "";
  if (!question) return json({ error: "question is required" }, 400);

  // @ts-ignore
  const key = Deno.env.get("CONTEXT_DEV_API_KEY");
  if (!key) return json({ error: "CONTEXT_DEV_API_KEY not configured" }, 500);

  try {
    const res = await fetch("https://api.context.dev/v1/web/answers", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "fast",
        task: `Answer with the latest facts available today, in ${language ? `language "${language}"` : "the question's language"}, in 3-5 sentences.${city ? ` The user is in ${city}; use that only if it matters to the question.` : ""} Question: ${question}`,
        json_format: { answer: "" },
        // The client waits 7 s: a partial answer from what was found by 6 s beats none.
        timeoutOpts: { milliseconds: 6000, behavior: "return-partial" },
      }),
      signal: AbortSignal.timeout(7000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("Context.dev answers error", res.status, data?.request_id ?? "", JSON.stringify(data).slice(0, 300));
      return json({ answer: null, sources: [] });
    }
    const answer = typeof data?.json_content?.answer === "string" ? data.json_content.answer.trim() : "";
    const sources = Array.isArray(data?.sources) ? data.sources.filter((s: unknown) => typeof s === "string").slice(0, 6) : [];
    return json({ answer: answer || null, sources, partial: Boolean(data?.partial) });
  } catch (error) {
    console.error("Context.dev answers failed", String(error));
    return json({ answer: null, sources: [] });
  }
});
