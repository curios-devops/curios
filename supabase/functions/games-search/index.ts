// Games 🎮: games similar to the user's query, from two sources in one call.
// - playable: browser games (itch.io / WASM-4 / Newgrounds) found by Exa; a URL filter
//   keeps only actual game pages (no devlogs, jams or profiles).
// - similar: commercial games from RAWG — when the query names a game, its genres and
//   tags find similar ones; otherwise RAWG's search results. Skipped without RAWG_API_KEY.
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

async function similarGames(query: string): Promise<{ anchor: Game | null; similar: Game[] }> {
  const found = (await rawg(`/games?search=${encodeURIComponent(query)}&page_size=12`))?.results ?? [];
  const top = found[0];
  // The query names this game ("juegos como Hollow Knight" / "hollow knight").
  const named = top && norm(top.name).length > 2 && norm(query).includes(norm(top.name));
  if (!named) return { anchor: null, similar: found.filter((g: any) => g.background_image).map(toGame) };

  const genres = (top.genres ?? []).map((g: any) => g.id).join(",");
  const tags = (top.tags ?? []).filter((t: any) => t.language === "eng").slice(0, 3).map((t: any) => t.id).join(",");
  const data = await rawg(`/games?ordering=-added&page_size=13${genres ? `&genres=${genres}` : ""}${tags ? `&tags=${tags}` : ""}`);
  return {
    anchor: toGame(top),
    similar: (data?.results ?? []).filter((g: any) => g.id !== top.id && g.background_image).slice(0, 12).map(toGame),
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
