// Movie 🍿 fact sheet. TMDB (title, certification, genres, runtime, trailer, cast,
// director, where to watch) + OMDb (IMDb / Rotten Tomatoes / Metacritic ratings,
// awards and Oscars). The user's original query is tried first; only when TMDB finds
// nothing does a fast LLM extract the film title (interpret only when needed).
// Body { query, language?: "es-ES", region?: "ES" } → MovieInfo JSON, or { found: false }.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY") ?? "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const OMDB_API_KEY = Deno.env.get("OMDB_API_KEY") ?? "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// TMDB accepts a v3 key (query param) or a v4 read token (Bearer JWT).
async function tmdb(path: string): Promise<any> {
  const isV4 = TMDB_API_KEY.length > 40;
  const url = `${TMDB}${path}${path.includes("?") ? "&" : "?"}${isV4 ? "" : `api_key=${TMDB_API_KEY}`}`;
  const res = await fetch(url, { headers: isV4 ? { Authorization: `Bearer ${TMDB_API_KEY}` } : {} });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

async function searchMovie(query: string, language: string): Promise<number | null> {
  const data = await tmdb(`/search/movie?query=${encodeURIComponent(query)}&language=${language}&include_adult=false`);
  return data?.results?.[0]?.id ?? null;
}

// Fallback only: "¿de qué trata El show de Truman?" → "El show de Truman".
async function extractTitle(query: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-6-luna",
        input: [
          { role: "system", content: 'Extract the title of the film the user is asking about. Reply with strict JSON {"title": "..."} or {"title": null} if no specific film is named.' },
          { role: "user", content: query },
        ],
        max_output_tokens: 40,
        reasoning: { effort: "none" },
        text: { format: { type: "json_object" } },
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.output_text ?? data.output?.flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("") ?? "";
    const title = JSON.parse(text)?.title;
    return typeof title === "string" && title.trim() ? title.trim() : null;
  } catch {
    return null;
  }
}

function parseOscars(awards: string): { wins: number; nominations: number } {
  const won = awards.match(/Won (\d+) Oscars?/i);
  const nominated = awards.match(/Nominated for (\d+) Oscars?/i);
  return { wins: won ? Number(won[1]) : 0, nominations: nominated ? Number(nominated[1]) : 0 };
}

// OMDb's English awards line → numbers the client can localize ("42 wins & 69 nominations total").
function parseAwardTotals(awards: string): { wins: number; nominations: number } {
  const wins = awards.match(/(\d+) wins?/i);
  const nominations = awards.match(/(\d+) nominations?/i);
  return { wins: wins ? Number(wins[1]) : 0, nominations: nominations ? Number(nominations[1]) : 0 };
}

// Keep well-known titles only: TMDB recommendations include obscure TV films.
const MIN_RELATED_VOTES = 300;

// "More to explore" lists. Popular / In theatres / Coming soon are what's on in the
// user's region; Free / Top rated / Hidden gems follow the current film's genre.
const LISTS: Record<string, (region: string, genre: string) => string> = {
  popular: (r) => `/movie/popular?region=${r}`,
  now_playing: (r) => `/movie/now_playing?region=${r}`,
  upcoming: (r) => `/movie/upcoming?region=${r}`,
  free: (r, g) => `/discover/movie?watch_region=${r}&with_watch_monetization_types=free|ads&sort_by=popularity.desc${g ? `&with_genres=${g}` : ""}`,
  top_rated: (_r, g) => `/discover/movie?sort_by=vote_average.desc&vote_count.gte=2000${g ? `&with_genres=${g}` : ""}`,
  hidden_gems: (_r, g) => `/discover/movie?sort_by=vote_average.desc&vote_average.gte=7.3&vote_count.gte=150&vote_count.lte=1500${g ? `&with_genres=${g}` : ""}`,
};

// @ts-ignore: Deno.serve is the entry point for Supabase Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const language = typeof body?.language === "string" ? body.language : "en-US";
    const region = typeof body?.region === "string" ? body.region.toUpperCase() : "US";
    if (!TMDB_API_KEY) return json({ error: "TMDB_API_KEY not configured" }, 500);

    // Body { list, genreId?, language, region } → { related } for the "More to explore" dropdown.
    if (typeof body?.list === "string") {
      const build = LISTS[body.list];
      if (!build) return json({ error: "Unknown list" }, 400);
      const genre = typeof body?.genreId === "number" ? String(body.genreId) : "";
      const path = build(region, genre);
      const data = await tmdb(`${path}${path.includes("?") ? "&" : "?"}language=${language}&page=1`);
      return json({
        related: (data?.results ?? [])
          .filter((r: any) => r.poster_path)
          .slice(0, 12)
          .map((r: any) => ({ title: r.title, year: (r.release_date ?? "").slice(0, 4), posterUrl: `${IMG}/w342${r.poster_path}` })),
      });
    }

    if (!query) return json({ error: "Missing query" }, 400);

    let id = await searchMovie(query, language);
    if (!id) {
      const title = await extractTitle(query);
      if (title) id = await searchMovie(title, language);
    }
    if (!id) return json({ found: false });

    const lang = language.split("-")[0];
    const m = await tmdb(
      `/movie/${id}?language=${language}&append_to_response=credits,videos,release_dates,watch/providers,recommendations,similar,images&include_video_language=${lang},en,null&include_image_language=${lang},en,null`,
    );

    const omdb = OMDB_API_KEY && m.imdb_id
      ? await fetch(`https://www.omdbapi.com/?i=${m.imdb_id}&apikey=${OMDB_API_KEY}`).then((r) => r.ok ? r.json() : null).catch(() => null)
      : null;

    // Trailer: official YouTube trailer, preferring the user's language.
    const videos: any[] = (m.videos?.results ?? []).filter((v: any) => v.site === "YouTube");
    const trailer =
      videos.find((v) => v.type === "Trailer" && v.official && v.iso_639_1 === lang) ??
      videos.find((v) => v.type === "Trailer" && v.official) ??
      videos.find((v) => v.type === "Trailer") ??
      videos.find((v) => v.type === "Teaser" || v.type === "Clip") ?? null;

    const releases: any[] = m.release_dates?.results ?? [];
    const certFor = (cc: string) =>
      releases.find((r) => r.iso_3166_1 === cc)?.release_dates?.find((d: any) => d.certification)?.certification || "";
    const certification = certFor(region) || certFor("US") || (omdb?.Rated && omdb.Rated !== "N/A" ? omdb.Rated : "");

    const watch = m["watch/providers"]?.results?.[region] ?? null;
    const providers: { name: string; logoUrl: string; type: string }[] = [];
    for (const type of ["flatrate", "free", "ads", "rent", "buy"]) {
      for (const p of watch?.[type] ?? []) {
        if (!providers.some((x) => x.name === p.provider_name)) {
          providers.push({ name: p.provider_name, logoUrl: `${IMG}/w92${p.logo_path}`, type });
        }
      }
    }

    const awardsText = omdb?.Awards && omdb.Awards !== "N/A" ? omdb.Awards : "";
    const ratings = (omdb?.Ratings ?? []).map((r: any) => ({
      source: r.Source === "Internet Movie Database" ? "IMDb" : r.Source,
      value: r.Value,
    }));
    if (!ratings.length && m.vote_average) ratings.push({ source: "TMDB", value: `${m.vote_average.toFixed(1)}/10` });

    return json({
      found: true,
      title: m.title,
      originalTitle: m.original_title,
      year: (m.release_date ?? "").slice(0, 4),
      certification,
      genres: (m.genres ?? []).map((g: any) => g.name),
      genreId: m.genres?.[0]?.id ?? null,
      runtimeMinutes: m.runtime || null,
      overview: m.overview || omdb?.Plot || "",
      posterUrl: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
      backdropUrl: m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
      trailerYoutubeId: trailer?.key ?? null,
      // Videos tab: every official YouTube video TMDB lists (trailers, teasers, clips, featurettes).
      videos: videos.slice(0, 12).map((v: any) => ({ youtubeId: v.key, name: v.name, type: v.type })),
      // Images tab: the film's stills (backdrops).
      images: (m.images?.backdrops ?? []).slice(0, 20).map((b: any) => `${IMG}/w1280${b.file_path}`),
      directors: (m.credits?.crew ?? []).filter((c: any) => c.job === "Director").map((c: any) => c.name),
      cast: (m.credits?.cast ?? []).slice(0, 12).map((c: any) => ({
        name: c.name,
        character: c.character,
        photoUrl: c.profile_path ? `${IMG}/w185${c.profile_path}` : null,
      })),
      watch: { link: watch?.link ?? null, providers },
      ratings,
      awards: awardsText ? { text: awardsText, oscars: parseOscars(awardsText), ...parseAwardTotals(awardsText) } : null,
      // "More to explore": TMDB recommendations, else similar titles.
      related: [...(m.recommendations?.results ?? []), ...(m.similar?.results ?? [])]
        .filter((r: any, i: number, all: any[]) =>
          r.poster_path && r.vote_count >= MIN_RELATED_VOTES && all.findIndex((x) => x.id === r.id) === i)
        .slice(0, 12)
        .map((r: any) => ({ title: r.title, year: (r.release_date ?? "").slice(0, 4), posterUrl: `${IMG}/w342${r.poster_path}` })),
      imdbUrl: m.imdb_id ? `https://www.imdb.com/title/${m.imdb_id}/` : null,
      tmdbUrl: `https://www.themoviedb.org/movie/${id}`,
    });
  } catch (err) {
    console.error("movie-info error", err);
    return json({ error: "Internal server error" }, 500);
  }
});
