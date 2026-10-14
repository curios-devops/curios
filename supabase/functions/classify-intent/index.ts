// deno-lint-ignore-file no-import-prefix
// Auto Mode intent router.
// PRIMARY: OpenAI Decisions API — one call answers two typed questions: which mode
// (choice, with probabilities → we take the argmax) and whether the user wants to buy
// (predicate). FALLBACK: gpt-5-nano → gpt-5-mini text classification (mode only).
// A third question rates difficulty (tier: easy|normal|complex) → the client answers with
// Luna / Sol / Astra. Body { query, only: "tier" } asks just that (explicit modes skip routing).
// Returns { mode, probabilities?, buyProbability, movieProbability, musicProbability, gameProbability
// (each null when unknown), tier (null when unknown), backend }. The topic predicates send a film,
// a song/artist/album or a video game to its own page.
// Body { query, location?, only: "magazine" } → { sections: [main, …3 more], news } for Magazine.
// Body { query, answer, only: "explore" } picks the best way to keep exploring a Search answer
// (Decisions: watch / play / read) while Luna drafts the one-line pitch of each option.
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
      "Curiosity best answered by a short explainer VIDEO: any 'why does/is…' or 'how does…' question about how or why something works or happens, a process, a natural or scientific phenomenon, a historical event, a place, an animal, space, the body, 'show me', 'what would it look like', 'explain ... visually' or 'tell me the story of'.",
  },
  {
    value: "character",
    description:
      "The user wants a live CONVERSATION with a person: chatting, talking to someone, advice, coaching, tutoring, practicing a language or interview, role-play, talking to a persona or expert, emotional support, or addressing the assistant personally ('can you', 'let's talk', 'I feel', 'help me practice').",
  },
];

const MODE_INSTRUCTIONS =
  "Pick the Curios experience that best answers this request. Judge what the user would enjoy most, not what is easiest: choose search only when a short written answer fully satisfies the request. Why/how questions about nature, science, the body, history or how things work belong to movie even when a one-line answer exists.";

type Tier = "easy" | "normal" | "complex";
const TIER_INSTRUCTIONS =
  "How much reasoning does a great answer to this request need? Most everyday questions are normal.";
const TIER_CHOICES: { value: Tier; description: string }[] = [
  {
    value: "easy",
    description:
      "Trivial: one well-known fact, a definition, a quick conversion or calculation, a greeting or small talk, a simple lookup with an obvious answer.",
  },
  {
    value: "normal",
    description:
      "A typical question needing a clear explanation, summary, recommendation or comparison of a few points, using common knowledge or a handful of sources.",
  },
  {
    value: "complex",
    description:
      "Needs expert-level reasoning: multi-step analysis, non-trivial math or code, rigorous comparison across many factors, specialized medical, legal, financial or scientific depth, research synthesis, or planning under several constraints.",
  },
];

const tierQuestion = { type: "choice" as const, name: "tier", instructions: TIER_INSTRUCTIONS, choices: TIER_CHOICES };

function topTier(answers: Awaited<ReturnType<typeof decide>>): Tier | null {
  const probs = answers?.tier?.probabilities;
  if (!probs?.length) return null;
  const top = probs.reduce((a, b) => (b.probability > a.probability ? b : a));
  return TIER_CHOICES.some((c) => c.value === top.value) ? (top.value as Tier) : null;
}

const BUY_INSTRUCTIONS =
  "The user intends to buy, shop for, order, find deals or prices for, or choose a product to purchase right now — not merely learn how something works or follow news about it.";

// Movie 🍿 (specialization of Video): same Decisions call, no extra latency. The client
// already caught obvious cases locally (film words, franchises); this catches any title,
// actor or director the local list can't know.
const MOVIE_INSTRUCTIONS =
  "The request is about films or cinema: a movie title or franchise, an actor or director and their films, cast, plot, trailer, reviews, box office, release dates, showtimes, what is playing in cinemas or theaters, or where to watch a movie. Not a real historical event, place, person's life or science topic that merely shares a name with a film.";

// Music 🎵: same call. Routes questions about a song, an artist or an album to the Music page.
const MUSIC_INSTRUCTIONS =
  "The request is about a specific song, singer, band, musician, rapper, DJ or album: who sings a song, what a song means, an artist's songs, albums, discography or career, or a record. Not news, latest updates, rumors or controversies about them, not playing an instrument, music theory lessons, buying audio gear, concert tickets, or a film.";

// Games 🎮: same call. Routes questions about a video game to the Games page.
const GAME_INSTRUCTIONS =
  "The request is about a specific video game or game franchise, or wanting to play one: its gameplay, story, characters, levels, release, platforms, reviews, tips, walkthroughs or similar games. Not sports matches, board or card game rules, gambling, game theory, or gaming industry news.";

const SYSTEM_PROMPT = `You are an intent router. ${MODE_INSTRUCTIONS}
Classify the user's query into exactly ONE mode:

${MODE_CHOICES.map((c) => `- "${c.value}": ${c.description}`).join("\n")}

Respond with strict JSON only: {"mode":"search|stories|movie|character"}.`;

// "Explore further" under a Search answer: Video, Games, Music or Stories.
type Explore = "watch" | "play" | "listen" | "read";
const EXPLORE_INSTRUCTIONS =
  "The user read a short written answer to this question. Which Curios experience would make them understand or enjoy the topic more?";
const EXPLORE_CHOICES: { value: Explore; description: string }[] = [
  {
    value: "watch",
    description:
      "A short explainer VIDEO: something visual, physical, spatial or a process — how or why things work or happen, nature, science, space, the body, history, places, machines.",
  },
  {
    value: "play",
    description:
      "An interactive GAME: the topic is a video game, or has rules, strategy, goals, challenges, survival, building or exploring that would be fun to try hands-on.",
  },
  {
    value: "listen",
    description:
      "MUSIC: the topic is a song, singer, band, album, music genre or music scene, best enjoyed by listening.",
  },
  {
    value: "read",
    description:
      "A multi-source STORY: news, a person, a company, a market, politics, culture, an ongoing or evolving situation best told with several sources.",
  },
];

const EXPLORE_PROMPT = `For a question the user asked, write one short line (max 9 words) pitching each way to explore it further, in the same language as the question, specific to its topic:
- watch: a short explainer video (e.g. "See how curved spacetime might work.")
- play: discovering it through an interactive game
- listen: listening to a real song that fits the topic
- read: a richer story from several sources
Also name "game": one real, well-known video game closest to the topic (title only), "song": one real, well-known song closest to the topic ("Title Artist"; when the question is about a song, artist or album, that one), and "topic": the question's subject as a short noun phrase with its article, in the question's language (2-5 words, e.g. "los agujeros de gusano", "black holes").
Respond with strict JSON only: {"watch":"","play":"","listen":"","read":"","game":"","song":"","topic":""}.`;

// Magazine 📰: which sections (NYT + Wired) a question belongs to — the main one and three
// more to rewrite it from — and whether it's current news (→ a news photo) or a general
// topic (→ an AI image for the article).
const MAGAZINE_SECTIONS: { value: string; description: string }[] = [
  { value: "world", description: "World: international affairs, countries, conflicts, diplomacy, global events." },
  { value: "local", description: "Local: what it means for the reader's own city or country (their location is given)." },
  { value: "business", description: "Business: companies, markets, the economy, money, work, startups." },
  { value: "science", description: "Science: research, discoveries, space, nature, how things work." },
  { value: "culture", description: "Culture: arts, books, film, music, TV, games, history, ideas in society." },
  { value: "lifestyle", description: "Style & Lifestyle: fashion, food, travel, home, relationships, trends." },
  { value: "opinion", description: "Opinion: a debatable question where an argued, clearly-labeled point of view helps." },
  { value: "sports", description: "Sports: teams, athletes, competitions, games and results." },
  { value: "well", description: "Health & Wellness: body, mind, fitness, nutrition, sleep, medicine in daily life." },
  { value: "ai", description: "Artificial Intelligence: AI models, companies, uses, risks and rules." },
  { value: "gadgets", description: "Gadgets: phones, devices, consumer tech, apps and reviews." },
  { value: "ideas", description: "Ideas: big-picture essays about where technology, society or thought is heading." },
  { value: "environment", description: "Environment: climate, energy, wildlife, pollution, sustainability." },
  { value: "security", description: "Security: cybersecurity, privacy, hacking, surveillance, crime online." },
  { value: "politics", description: "Politics: governments, elections, laws, policy and political conflict." },
];
const MAGAZINE_INSTRUCTIONS = "Which magazine section of a publication like The New York Times or Wired would run a story answering this question? Judge the core subject, not passing words.";
const NEWS_INSTRUCTIONS = "Answering this well depends on current events or recent developments (news, latest updates, something happening now or this year), rather than an evergreen topic.";

// Luna picks the most interesting OTHER angles (Decisions only ranks the main one well).
async function draftSections(query: string, location: string): Promise<string[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` };
  if (OPENAI_ORG_ID) headers["OpenAI-Organization"] = OPENAI_ORG_ID;
  try {
    const res = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "gpt-6-luna",
        input: [
          { role: "system", content: `Magazine sections: ${MAGAZINE_SECTIONS.map((s) => `"${s.value}" (${s.description})`).join("; ")}.
For the user's question, list the 4 sections that would give the most interesting, clearly different stories about it, best first. Use "local" only when the reader's location${location ? ` (${location})` : ""} truly changes the story, and "opinion" only for debatable questions. Respond with strict JSON only: {"sections":["",""]}.` },
          { role: "user", content: query },
        ],
        max_output_tokens: 80,
        reasoning: { effort: "none" },
        text: { format: { type: "json_object" } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const obj = JSON.parse(extractOutputText(await res.json()));
    return (Array.isArray(obj?.sections) ? obj.sections : []).filter((v: unknown) => typeof v === "string" && MAGAZINE_SECTIONS.some((s) => s.value === v));
  } catch {
    return [];
  }
}

async function draftExplore(query: string): Promise<Record<string, string> | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` };
  if (OPENAI_ORG_ID) headers["OpenAI-Organization"] = OPENAI_ORG_ID;
  try {
    const res = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "gpt-6-luna",
        input: [{ role: "system", content: EXPLORE_PROMPT }, { role: "user", content: query }],
        max_output_tokens: 200,
        reasoning: { effort: "none" },
        text: { format: { type: "json_object" } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("explore draft error", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const obj = JSON.parse(extractOutputText(await res.json()));
    const out: Record<string, string> = {};
    for (const k of ["watch", "play", "listen", "read", "game", "song", "topic"]) {
      if (typeof obj?.[k] === "string" && obj[k].trim()) out[k] = obj[k].trim().slice(0, 120);
    }
    return out;
  } catch (err) {
    console.error("explore draft failed", String(err));
    return null;
  }
}

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

    if (body?.only === "magazine") {
      const location = typeof body?.location === "string" ? body.location.slice(0, 60) : "";
      const [answers, angles] = await Promise.all([
        decide(`Question: ${query}${location ? `\nReader's location: ${location}` : ""}`, [
          { type: "choice", name: "section", instructions: MAGAZINE_INSTRUCTIONS, choices: MAGAZINE_SECTIONS },
          { type: "predicate", name: "news", instructions: NEWS_INSTRUCTIONS },
        ], 3000),
        draftSections(query, location),
      ]);
      const probs = [...(answers?.section?.probabilities ?? [])].sort((a, b) => b.probability - a.probability);
      const ranked = probs.map((p) => p.value).filter((v) => MAGAZINE_SECTIONS.some((s) => s.value === v));
      // Main = Decisions' pick; the other three = Luna's angles, topped up from Decisions' ranking.
      const sections = [...new Set([...ranked.slice(0, 1), ...angles, ...ranked])].slice(0, 4);
      const news = answers?.news?.probability;
      return jsonResponse({ sections, news: typeof news === "number" ? news : null, backend: answers ? "decisions" : "default" });
    }

    if (body?.only === "explore") {
      const answer = typeof body?.answer === "string" ? body.answer.slice(0, 800) : "";
      const [answers, lines] = await Promise.all([
        decide(answer ? `Question: ${query}\n\nAnswer: ${answer}` : `Question: ${query}`, [
          { type: "choice", name: "explore", instructions: EXPLORE_INSTRUCTIONS, choices: EXPLORE_CHOICES },
        ], 3000),
        draftExplore(query),
      ]);
      const probs = answers?.explore?.probabilities ?? [];
      const top = probs.length ? probs.reduce((a, b) => (b.probability > a.probability ? b : a)).value : null;
      return jsonResponse({
        recommended: EXPLORE_CHOICES.some((c) => c.value === top) ? top : null,
        lines: lines ?? {},
        backend: answers ? "decisions" : "default",
      });
    }

    if (body?.only === "tier") {
      const answers = await decide(query, [tierQuestion], DECISIONS_TIMEOUT_MS);
      return jsonResponse({ tier: topTier(answers), backend: answers ? "decisions" : "default" });
    }

    const answers = await decide(query, [
      { type: "choice", name: "mode", instructions: MODE_INSTRUCTIONS, choices: MODE_CHOICES },
      { type: "predicate", name: "buy", instructions: BUY_INSTRUCTIONS },
      { type: "predicate", name: "movie", instructions: MOVIE_INSTRUCTIONS },
      { type: "predicate", name: "music", instructions: MUSIC_INSTRUCTIONS },
      { type: "predicate", name: "game", instructions: GAME_INSTRUCTIONS },
      tierQuestion,
    ], DECISIONS_TIMEOUT_MS);

    const probabilities = answers?.mode?.probabilities;
    if (probabilities?.length) {
      const top = probabilities.reduce((a, b) => (b.probability > a.probability ? b : a));
      if (VALID_MODES.includes(top.value as Mode)) {
        const buy = answers?.buy?.probability;
        const movie = answers?.movie?.probability;
        const music = answers?.music?.probability;
        const game = answers?.game?.probability;
        return jsonResponse({
          mode: top.value,
          probabilities,
          buyProbability: typeof buy === "number" ? buy : null,
          movieProbability: typeof movie === "number" ? movie : null,
          musicProbability: typeof music === "number" ? music : null,
          gameProbability: typeof game === "number" ? game : null,
          tier: topTier(answers),
          backend: "decisions",
        });
      }
    }

    // Decisions unavailable → previous text classifier (mode only; client resolves buy intent).
    let mode = await classifyWithModel("gpt-6-luna", query);
    if (!mode) mode = await classifyWithModel("gpt-5-mini", query);

    return jsonResponse({ mode: mode ?? "search", buyProbability: null, tier: null, backend: mode ? "gpt-fallback" : "default" });
  } catch (err) {
    console.error("classify-intent error", err);
    // Never block the user — degrade to search.
    return jsonResponse({ mode: "search", buyProbability: null, tier: null, backend: "default" });
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
    reasoning: { effort: model.startsWith("gpt-6") ? "none" : "minimal" }, // Luna takes none, not minimal
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
