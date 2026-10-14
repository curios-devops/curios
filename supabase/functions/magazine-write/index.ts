// Magazine writer: one magazine feature in a section's voice (NYT / Wired desks), grounded
// ONLY in the given sources, in the reader's language. Server-side because a 700–1000 word
// story takes longer than the generic fetch-openai proxy allows (28 s).
//
// Body { query, section, location?, language, model?, long?, sources: [{ title, url, content }] }
// → { headline, dek, short_summary, markdown_report, image_prompt, follow_up_questions, deeper, style_source }
// With deeper: { label, report } Astra continues the story along that thread → { markdown }.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODELS = ["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra"];
const FALLBACK_MODEL = "gpt-6-luna";
const DEEPER_MODEL = "gpt-6-astra";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Each section's desk: the publication voice.
const DESKS: Record<string, { name: string; source: string; voice: string }> = {
  world: { name: "World", source: "The New York Times", voice: "Authoritative foreign-desk reporting: what happened, where, who it affects, and the history behind it. Ground big forces in a human scene." },
  local: { name: "Local", source: "The New York Times (Metro)", voice: "What it means for the reader's own city and country: concrete local effects, places, prices and people." },
  business: { name: "Business", source: "The Wall Street Journal", voice: "Crisp, numbers-literate business reporting: the move, the money, the strategy and who wins or loses." },
  science: { name: "Science", source: "The New York Times Science", voice: "Wonder with rigor: make the science tangible with vivid analogies, explain how we know it, and separate settled facts from open questions." },
  culture: { name: "Culture", source: "The New Yorker", voice: "Elegant cultural criticism and reporting: why it resonates, its history, the people behind it and what it says about us." },
  lifestyle: { name: "Style & Lifestyle", source: "The New York Times Style", voice: "Witty, observant trend writing: the scene, the people, what it feels like and why it is catching on." },
  opinion: { name: "Opinion", source: "The New York Times Opinion", voice: "A clearly argued opinion essay: take a reasoned position, build the case with facts from the sources, and answer the strongest counterargument fairly." },
  sports: { name: "Sports", source: "The Athletic", voice: "Kinetic sports writing: the moment, the players, the tactics and the stakes, for fans and newcomers alike." },
  well: { name: "Health & Wellness", source: "The New York Times Well", voice: "Warm, evidence-based health writing: what the research says, what it means in daily life, and practical takeaways (not medical advice)." },
  ai: { name: "Artificial Intelligence", source: "Wired", voice: "Sharp, skeptical tech reporting on AI: what it really does, who builds it, the hype versus the evidence, and the human stakes." },
  gadgets: { name: "Gadgets", source: "Wired (Gear)", voice: "Hands-on, opinionated gear writing: what it is like to use, what is new, what it costs and who it is for." },
  ideas: { name: "Ideas", source: "Wired Ideas", voice: "A big-picture idea essay: a bold thesis about where things are heading, built from evidence and surprising connections." },
  environment: { name: "Environment", source: "The New York Times Climate", voice: "Clear climate and environment reporting: the science, the places and people affected, and the choices ahead." },
  security: { name: "Security", source: "Wired Security", voice: "Precise security reporting: what happened, how it works, who is at risk and what to do about it." },
  politics: { name: "Politics", source: "The New York Times Politics", voice: "Fair political reporting: the players, the power, the rules and what it means for people, presenting each side accurately." },
};

// Citation name, as Search writes it: [reuters], [bbc] (same rule as llmProvider's extractSiteName).
const siteOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").replace(/\.(com|org|net|io|co|gov|edu|info|biz)(\.[a-z]{2})?$/, "").split(".")[0];
  } catch {
    return "source";
  }
};
const CITE = `- Cite inline like Search does: the source's name in brackets, exactly as given in SOURCES, right after the fact it supports, e.g. [reuters] or [bbc +1] for two from the same site; about one per paragraph, only for facts from the sources.`;

function systemPrompt(section: string, language: string, location: string, long: boolean) {
  const desk = DESKS[section] ?? DESKS.ideas;
  return `You are a senior writer on the ${desk.name} desk of ${desk.source}. Write an original magazine feature that answers the reader's question, in language "${language}" (every field except image_prompt).
Voice: ${desk.voice}${section === "local" && location ? `\nThe reader is in ${location}: tell what it means there.` : ""}${section === "opinion" ? "\nThis is an OPINION piece: a clear first-person argument that stays fair to the facts." : ""}

GROUNDING (non-negotiable):
- Use only facts found in the SOURCES or well-established general knowledge. Never invent quotes, names, numbers, dates or studies.
- Quote someone only with words that appear in a source; otherwise paraphrase and attribute in prose ("according to Reuters…").
- Where sources disagree or evidence is thin, say so.
${CITE}

FORM:
- "headline": a magazine headline of 5–12 words that grabs attention with the tension, surprise or stakes. Do NOT restate the question. Never start with "Understanding", "Exploring", "A look at", "What you need to know"; avoid "X: Y" formulas.
- "dek": one sentence (15–28 words) under the headline that sets up the story.
- "short_summary": two sentences for previews.
- "markdown_report": ${long ? "1400–1800 words: a LONG READ that goes further than a standard feature — more mechanisms, history, numbers, people and open questions from the sources" : "700–1000 words"}. Open with a vivid lede (a scene, a person, a striking fact), never a definition. By the third paragraph, a nut graf on why this matters now. Then ${long ? "5–6" : "3–4"} sections, each opened by a short evocative subhead in **bold** on its own line (2–5 words; never "Background", "Conclusion" or "Introduction"). Flowing paragraphs of 2–4 sentences; no bullet lists; no "In conclusion". End with a kicker — an image, a line from the sources or an open question — not a summary.
- "image_prompt": in English, one editorial cover image idea for this story: subject, setting, mood, composition. No text, no logos, no real people's faces.
- "follow_up_questions": 3 short questions a curious reader would ask next.
- "deeper": a button label (3–8 words, starting with a verb) inviting the reader to go deeper into the one thread of this story most worth expanding, e.g. "Go deeper into how the central bank sets the target".
Reply with strict JSON {"headline":"","dek":"","short_summary":"","markdown_report":"","image_prompt":"","follow_up_questions":[],"deeper":""}.`;
}

// "Go deeper": the same writer continues its own story along the thread the reader picked.
function deeperPrompt(section: string, language: string, label: string) {
  const desk = DESKS[section] ?? DESKS.ideas;
  return `You are the senior writer on the ${desk.name} desk of ${desk.source} who wrote the story below. The reader tapped "${label}": continue the story with 400–600 new words that go deeper into that thread, in language "${language}".
Voice: ${desk.voice}
- Open with a short evocative subhead in **bold** on its own line (2–5 words), then flowing paragraphs of 2–4 sentences; no bullet lists.
- Bring what the story has not said yet: mechanisms, history, numbers, people and open questions. Never repeat it.
- GROUNDING: only facts from the SOURCES or well-established general knowledge; never invent quotes, names, numbers, dates or studies; quote only words that appear in a source.
${CITE}
- End on a line that closes this thread.
Reply with strict JSON {"markdown":""}.`;
}

function outputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text) return data.output_text;
  return (data?.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("");
}

async function ask(model: string, system: string, user: string) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      input: [{ role: "system", content: system }, { role: "user", content: user }],
      max_output_tokens: 8000,
      reasoning: { effort: /luna/.test(model) ? "none" : "low" },
      text: { format: { type: "json_object" } },
    }),
    signal: AbortSignal.timeout(110_000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return JSON.parse(outputText(await res.json()));
}

async function deepen(model: string, system: string, user: string) {
  const out = await ask(model, system, user);
  const markdown = typeof out?.markdown === "string" ? out.markdown.trim() : "";
  if (markdown.length < 300) throw new Error("Incomplete continuation");
  return { markdown };
}

async function write(model: string, system: string, user: string) {
  const out = await ask(model, system, user);
  const report = typeof out?.markdown_report === "string" ? out.markdown_report.trim() : "";
  if (report.length < 400 || typeof out?.headline !== "string" || !out.headline.trim()) throw new Error("Incomplete story");
  return {
    headline: out.headline.trim().slice(0, 160),
    dek: typeof out.dek === "string" ? out.dek.trim().slice(0, 300) : "",
    short_summary: typeof out.short_summary === "string" ? out.short_summary.trim().slice(0, 600) : "",
    markdown_report: report,
    image_prompt: typeof out.image_prompt === "string" ? out.image_prompt.trim().slice(0, 600) : "",
    follow_up_questions: (Array.isArray(out.follow_up_questions) ? out.follow_up_questions : [])
      .filter((q: unknown) => typeof q === "string").slice(0, 3),
    deeper: typeof out.deeper === "string" ? out.deeper.trim().slice(0, 90) : "",
  };
}

// @ts-ignore: Deno.serve is available in Supabase Edge Functions runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim().slice(0, 500) : "";
    if (!query) return json({ error: "Missing query" }, 400);
    const section = typeof body?.section === "string" && DESKS[body.section] ? body.section : "ideas";
    const language = typeof body?.language === "string" ? body.language.slice(0, 5) : "en";
    const location = typeof body?.location === "string" ? body.location.slice(0, 60) : "";
    const model = MODELS.includes(body?.model) ? body.model : FALLBACK_MODEL;
    const sources = (Array.isArray(body?.sources) ? body.sources : []).slice(0, 10)
      .map((s: any) => `[${siteOf(String(s?.url ?? ""))}] ${String(s?.title ?? "").slice(0, 160)}\n${String(s?.content ?? "").slice(0, 700)}`)
      .join("\n\n");
    const user = `Reader's question: "${query}"\n\nSOURCES:\n${sources || "(none found — rely only on well-established general knowledge and say what is uncertain)"}`;

    // Go deeper: Astra continues the story; Sol once more if it fails.
    const label = typeof body?.deeper?.label === "string" ? body.deeper.label.trim().slice(0, 120) : "";
    if (label) {
      const report = typeof body?.deeper?.report === "string" ? body.deeper.report.slice(0, 12000) : "";
      const system = deeperPrompt(section, language, label);
      const prompt = `${user}\n\nTHE STORY SO FAR:\n${report}`;
      try {
        return json(await deepen(DEEPER_MODEL, system, prompt));
      } catch (err) {
        console.error("magazine-write deeper failed", DEEPER_MODEL, String(err));
        return json(await deepen("gpt-6.1-sol", system, prompt));
      }
    }

    const system = systemPrompt(section, language, location, body?.long === true);

    // The chosen model first; if it fails or comes back cut, Luna once more (fast).
    let story;
    try {
      story = await write(model, system, user);
    } catch (err) {
      console.error("magazine-write first attempt failed", model, String(err));
      if (model === FALLBACK_MODEL) throw err;
      story = await write(FALLBACK_MODEL, system, user);
    }
    return json({ ...story, style_source: (DESKS[section] ?? DESKS.ideas).source });
  } catch (err) {
    console.error("magazine-write error", err);
    return json({ error: "The story could not be written", detail: String(err).slice(0, 300) }, 500);
  }
});
