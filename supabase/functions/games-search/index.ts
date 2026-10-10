// Games 🎮: games similar to the user's query, from two sources in one call.
// - playable: browser games (itch.io / WASM-4 / Newgrounds) found by Exa; a URL filter
//   keeps only actual game pages (no devlogs, jams or profiles).
// - similar: commercial games. Which games are similar is a judgment call, so a fast LLM
//   names them (and the game the query names, if any); RAWG then supplies cover, year,
//   platforms and Metacritic, and titles RAWG can't find are dropped. Without the LLM,
//   RAWG's own search results. Skipped without RAWG_API_KEY.
// Body { query } → { anchor, similar, playable, rawg }.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const EXA_API_KEY = Deno.env.get("EXA_API_KEY") ?? "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const RAWG_API_KEY = Deno.env.get("RAWG_API_KEY") ?? "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

interface Game {
  name: string;
  slug: string;
  imageUrl: string | null;
  year: string;
  rating: number | null;
  metacritic: number | null;
  platforms: string[];
  genres: string[];
  url: string;
}

async function rawg(path: string): Promise<any> {
  const res = await fetch(`https://api.rawg.io/api${path}${path.includes("?") ? "&" : "?"}key=${RAWG_API_KEY}`);
  if (!res.ok) throw new Error(`RAWG ${res.status}`);
  return res.json();
}

const toGame = (g: any): Game => ({
  name: g.name,
  slug: g.slug,
  imageUrl: g.background_image ?? null,
  year: (g.released ?? "").slice(0, 4),
  rating: g.rating || null,
  metacritic: g.metacritic ?? null,
  platforms: (g.parent_platforms ?? []).map((p: any) => p.platform?.name).filter(Boolean),
  genres: (g.genres ?? []).map((x: any) => x.name),
  url: `https://rawg.io/games/${g.slug}`,
});

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// RAWG's tags/genres are too noisy for similarity (Hollow Knight → GTA V), so the LLM picks.
async function suggestTitles(query: string): Promise<{ anchor: string | null; titles: string[] } | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-6-luna",
        input: [
          {
            role: "system",
            content: 'The user is looking for video games. If they name a specific game, "anchor" is its exact official title, else null. "titles": 10 well-known commercial video games most similar to what they ask for (gameplay, style, mood), most similar first, excluding the anchor, exact official English titles. Reply with strict JSON {"anchor": string|null, "titles": string[]}.',
          },
          { role: "user", content: query },
        ],
        max_output_tokens: 300,
        reasoning: { effort: "none" },
        text: { format: { type: "json_object" } },
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.output_text ?? data.output?.flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("") ?? "";
    const parsed = JSON.parse(text);
    const titles = Array.isArray(parsed?.titles) ? parsed.titles.filter((t: unknown) => typeof t === "string") : [];
    return { anchor: typeof parsed?.anchor === "string" ? parsed.anchor : null, titles };
  } catch {
    return null;
  }
}

// The RAWG entry for an exact title: name must match, and among matches the most-played
// one wins (RAWG also lists jam games and fan copies with the same name).
async function findGame(title: string): Promise<any | null> {
  const results = (await rawg(`/games?search=${encodeURIComponent(title)}&page_size=6`))?.results ?? [];
  const t = norm(title);
  return results
    .filter((g: any) => g.background_image && (norm(g.name) === t || norm(g.name).startsWith(`${t} `) || t.startsWith(`${norm(g.name)} `)))
    .sort((a: any, b: any) => (b.added ?? 0) - (a.added ?? 0))[0] ?? null;
}

// Fallback without the LLM: RAWG search, minus the near-empty entries.
const MIN_ADDED = 50;

async function similarGames(query: string): Promise<{ anchor: Game | null; similar: Game[] }> {
  const picks = await suggestTitles(query);
  if (!picks?.titles.length) {
    const found = (await rawg(`/games?search=${encodeURIComponent(query)}&page_size=20`))?.results ?? [];
    return { anchor: null, similar: found.filter((g: any) => g.background_image && (g.added ?? 0) >= MIN_ADDED).slice(0, 12).map(toGame) };
  }
  const [anchor, ...similar] = await Promise.all(
    [picks.anchor, ...picks.titles.slice(0, 12)].map((t) => (t ? findGame(t).catch(() => null) : Promise.resolve(null))),
  );
  const seen = new Set<number>(anchor ? [anchor.id] : []);
  return {
    anchor: anchor ? toGame(anchor) : null,
    similar: similar.filter((g) => g && !seen.has(g.id) && seen.add(g.id)).map(toGame),
  };
}

interface PlayableGame { title: string; url: string; imageUrl: string | null; description: string; site: string }

// Only real game pages: <author>.itch.io/<game>, wasm4.org/play/<cart>, newgrounds.com/portal/view/<id>.
function isGamePage(url: string): boolean {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (u.hostname.endsWith(".itch.io") && u.hostname !== "www.itch.io") return parts.length === 1;
    if (u.hostname === "wasm4.org") return parts[0] === "play" && parts.length === 2;
    if (u.hostname.endsWith("newgrounds.com")) return parts[0] === "portal" && parts[1] === "view";
    return false;
  } catch {
    return false;
  }
}

async function playableGames(query: string): Promise<PlayableGame[]> {
  if (!EXA_API_KEY) return [];
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": EXA_API_KEY },
    body: JSON.stringify({
      query: `${query} — free game you can play in the browser`,
      type: "auto",
      numResults: 25,
      includeDomains: ["itch.io", "wasm4.org", "newgrounds.com"],
      contents: { text: { maxCharacters: 220 } },
    }),
  });
  if (!res.ok) throw new Error(`Exa ${res.status}`);
  const data = await res.json();
  const seen = new Set<string>();
  return (data?.results ?? [])
    .filter((r: any) => isGamePage(r.url) && !seen.has(r.url) && seen.add(r.url))
    .slice(0, 12)
    .map((r: any) => ({
      title: (r.title ?? "").replace(/\s+by\s+[^|]+$|\s*[-|]\s*(itch\.io|Newgrounds\.com|WASM-4).*$/i, "").trim() || r.url,
      url: r.url,
      imageUrl: r.image ?? null,
      description: (r.text ?? "").replace(/\s+/g, " ").trim(),
      site: new URL(r.url).hostname.endsWith("itch.io") ? "itch.io" : new URL(r.url).hostname.replace(/^www\./, ""),
    }));
}

// @ts-ignore: Deno.serve is the entry point for Supabase Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return json({ error: "Missing query" }, 400);

  const [rawgResult, playable] = await Promise.all([
    RAWG_API_KEY
      ? similarGames(query).catch((e) => { console.error("games-search RAWG", e); return { anchor: null, similar: [] }; })
      : Promise.resolve({ anchor: null, similar: [] }),
    playableGames(query).catch((e) => { console.error("games-search Exa", e); return []; }),
  ]);

  return json({ ...rawgResult, playable, rawg: !!RAWG_API_KEY });
});
