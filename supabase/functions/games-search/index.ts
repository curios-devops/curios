// Games 🎮: games similar to the user's query, from two sources in one call.
// - playable: browser games (itch.io / WASM-4 / Newgrounds) found by Exa; a URL filter
//   keeps only actual game pages (no devlogs, jams or profiles).
// - similar: commercial games. Which games are similar is a judgment call, so a fast LLM
//   names them (and the game the query names, if any); RAWG then supplies cover, year,
//   platforms and Metacritic, and titles RAWG can't find are dropped. Without the LLM,
//   RAWG's own search results. Skipped without RAWG_API_KEY.
// Body { query } → { anchor, similar, playable, rawg }           (list page)
// Body { query, detail: true } → game fact sheet, or { found: false }   (fast: RAWG only)
// Body { query, similar: true } → { similar }    Body { query, playable: true } → { playable }
//   (the fact sheet fires these alongside, so the LLM never delays the sheet)
// Body { list, platform?, genreId? } → { items }                   ("More to explore")
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

// RAWG disambiguates remakes with a year: "God of War (2018)" is the game "God of War".
const nameKey = (name: string) => norm(name.replace(/\s*\(\d{4}\)\s*$/, ""));

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

// The RAWG entry for a title: the exact name wins, else an edition of it ("…: Definitive
// Edition"); among equals the most-played one (RAWG also lists jam games and fan copies).
// Never a shorter name: "Spider-Man 2" must not resolve to "Spider-Man".
async function findGame(title: string): Promise<any | null> {
  const results = (await rawg(`/games?search=${encodeURIComponent(title)}&page_size=6`))?.results ?? [];
  const t = norm(title);
  const rank = (g: any) => (nameKey(g.name) === t ? 2 : nameKey(g.name).startsWith(`${t} `) ? 1 : 0);
  return results
    .filter((g: any) => g.background_image && rank(g) > 0)
    .sort((a: any, b: any) => rank(b) - rank(a) || (b.added ?? 0) - (a.added ?? 0))[0] ?? null;
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

// ---- Game fact sheet ------------------------------------------------------------

const ESRB_SHORT: Record<string, string> = {
  everyone: "E", "everyone-10-plus": "E10+", teen: "T", mature: "M", "adults-only": "AO", "rating-pending": "RP",
};

// The game the query names, by RAWG name contained in the query ("de qué trata Celeste"):
// longest name first ("Spider-Man 2" over "Spider-Man"), then the most-played. Only when
// that fails does the LLM name it (slow path).
async function resolveGame(query: string): Promise<any | null> {
  const results = (await rawg(`/games?search=${encodeURIComponent(query)}&page_size=10`))?.results ?? [];
  const q = ` ${norm(query)} `;
  const hit = results
    .filter((g: any) => g.background_image && nameKey(g.name).length > 2 && q.includes(` ${nameKey(g.name)} `))
    .sort((a: any, b: any) => nameKey(b.name).length - nameKey(a.name).length || (b.added ?? 0) - (a.added ?? 0))[0];
  if (hit) return hit;
  const picks = await suggestTitles(query);
  return picks?.anchor ? findGame(picks.anchor).catch(() => null) : null;
}

async function similarTo(query: string): Promise<Game[]> {
  const picks = await suggestTitles(query);
  const anchor = norm(picks?.anchor ?? "");
  const found = await Promise.all((picks?.titles ?? []).slice(0, 12).map((t) => findGame(t).catch(() => null)));
  const seen = new Set<number>();
  return found.filter((g) => g && nameKey(g.name) !== anchor && !seen.has(g.id) && seen.add(g.id)).map(toGame);
}

async function gameDetail(query: string): Promise<Record<string, unknown> | null> {
  const base = await resolveGame(query);
  if (!base) return null;

  const empty = { results: [] };
  const [d, movies, shots, storeLinks] = await Promise.all([
    rawg(`/games/${base.id}`),
    rawg(`/games/${base.id}/movies`).catch(() => empty),
    rawg(`/games/${base.id}/screenshots`).catch(() => empty),
    rawg(`/games/${base.id}/stores`).catch(() => empty),
  ]);

  const urlByStore = new Map<number, string>((storeLinks.results ?? []).map((s: any) => [s.store_id, s.url]));
  const videos = (movies.results ?? [])
    .filter((m: any) => m.data?.max || m.data?.["480"])
    .map((m: any) => ({ name: m.name, url: m.data.max ?? m.data["480"], preview: m.preview ?? null }));
  return {
    found: true,
    name: d.name,
    year: (d.released ?? "").slice(0, 4),
    esrb: d.esrb_rating ? { short: ESRB_SHORT[d.esrb_rating.slug] ?? d.esrb_rating.name, name: d.esrb_rating.name } : null,
    genres: (d.genres ?? []).map((g: any) => g.name),
    genreId: d.genres?.[0]?.id ?? null,
    rating: d.rating || null,
    metacritic: d.metacritic ?? null,
    platforms: (d.platforms ?? []).map((p: any) => p.platform?.name).filter(Boolean),
    description: d.description_raw ?? "",
    imageUrl: d.background_image ?? null,
    website: d.website || null,
    developers: (d.developers ?? []).map((x: any) => ({ name: x.name, imageUrl: x.image_background ?? null })),
    publishers: (d.publishers ?? []).map((x: any) => ({ name: x.name, imageUrl: x.image_background ?? null })),
    stores: (d.stores ?? []).map((s: any) => ({
      name: s.store.name,
      domain: s.store.domain,
      url: urlByStore.get(s.store.id) ?? `https://${s.store.domain}`,
    })),
    // Hero: RAWG's trailer (mp4); the client searches YouTube when there is none.
    trailer: videos[0] ?? null,
    videos,
    screenshots: (shots.results ?? []).map((x: any) => x.image).filter(Boolean),
    rawgUrl: `https://rawg.io/games/${d.slug}`,
  };
}

// ---- "More to explore" lists -----------------------------------------------------

// RAWG parent platform ids.
const PLATFORM_IDS: Record<string, string> = { pc: "1", playstation: "2", xbox: "3" };
const day = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
// Top rated keeps well-known entries only (RAWG also lists re-releases and duplicates).
const MIN_TOP_ADDED = 500;

const LISTS: Record<string, (genre: string) => string> = {
  popular: () => `/games?dates=${day(365)},${day(0)}&ordering=-added`,
  new_releases: () => `/games?dates=${day(30)},${day(0)}&ordering=-added`,
  top_rated: (g) => `/games?ordering=-metacritic&metacritic=80,100${g ? `&genres=${g}` : ""}`,
};

async function exploreList(list: string, platform: string, genre: string): Promise<Game[] | null> {
  const build = LISTS[list];
  if (!build) return null;
  const p = PLATFORM_IDS[platform];
  const data = await rawg(`${build(genre)}&page_size=30${p ? `&parent_platforms=${p}` : ""}`);
  return (data?.results ?? [])
    .filter((g: any) => g.background_image && (list !== "top_rated" || (g.added ?? 0) >= MIN_TOP_ADDED))
    .slice(0, 12)
    .map(toGame);
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

  if (typeof body?.list === "string") {
    if (!RAWG_API_KEY) return json({ items: [] });
    const genre = typeof body?.genreId === "number" ? String(body.genreId) : "";
    const items = await exploreList(body.list, String(body?.platform ?? "all"), genre).catch(() => []);
    return items ? json({ items }) : json({ error: "Unknown list" }, 400);
  }

  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return json({ error: "Missing query" }, 400);

  if (body?.similar) return json({ similar: RAWG_API_KEY ? await similarTo(query).catch(() => []) : [] });
  if (body?.playable) return json({ playable: await playableGames(query).catch(() => []) });

  if (body?.detail) {
    if (!RAWG_API_KEY) return json({ found: false });
    try {
      return json((await gameDetail(query)) ?? { found: false });
    } catch (e) {
      console.error("games-search detail", e);
      return json({ found: false });
    }
  }

  const [rawgResult, playable] = await Promise.all([
    RAWG_API_KEY
      ? similarGames(query).catch((e) => { console.error("games-search RAWG", e); return { anchor: null, similar: [] }; })
      : Promise.resolve({ anchor: null, similar: [] }),
    playableGames(query).catch((e) => { console.error("games-search Exa", e); return []; }),
  ]);

  return json({ ...rawgResult, playable, rawg: !!RAWG_API_KEY });
});
