// Edge Function — find ONE real reference photo for a movie's swipe frames (Pipeline A
// "REAL" from docs/Movie/enhaced_refactor.md, applied cheaply to the DEFAULT generation):
// SerpAPI Google Images (fallback Brave) → validate candidates server-side → return the
// first usable image URL. No Gemini vision ranking here — that stays in the premium
// Enhance flow; the default path trades ranking for speed and near-zero cost.
//
// The caller (movieService) passes this URL to gemini-image as `referenceImageUrl`,
// grounding all 5 swipe frames on the same real photo (subject consistency + realism).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// @ts-ignore Deno env in Supabase runtime
const SERPAPI_API_KEY = Deno.env.get("SERPAPI_API_KEY");
// @ts-ignore
const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function searchCandidates(query: string): Promise<string[]> {
  if (SERPAPI_API_KEY) {
    try {
      const u = new URL("https://serpapi.com/search");
      u.searchParams.set("engine", "google_images_light");
      u.searchParams.set("q", query);
      u.searchParams.set("hl", "en");
      u.searchParams.set("gl", "us");
      u.searchParams.set("api_key", SERPAPI_API_KEY);
      const r = await fetchWithTimeout(u.toString(), 12000);
      if (r.ok) {
        const d = await r.json();
        const imgs = (d.images_results ?? [])
          .map((x: { original?: string }) => x.original)
          .filter(Boolean) as string[];
        if (imgs.length) return imgs.slice(0, 4);
      } else {
        console.warn("serpapi images non-ok", r.status);
      }
    } catch (e) {
      console.warn("serpapi images failed", String(e));
    }
  }
  if (BRAVE_API_KEY) {
    try {
      const r = await fetchWithTimeout(
        `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=5&safesearch=strict&country=us`,
        12000,
        { headers: { "X-Subscription-Token": BRAVE_API_KEY, Accept: "application/json" } },
      );
      if (r.ok) {
        const d = await r.json();
        const imgs = (d.results ?? [])
          .map((x: { properties?: { url?: string }; thumbnail?: { src?: string } }) => x?.properties?.url || x?.thumbnail?.src)
          .filter(Boolean) as string[];
        if (imgs.length) return imgs.slice(0, 4);
      }
    } catch (e) {
      console.warn("brave images failed", String(e));
    }
  }
  return [];
}

// A candidate is usable if it actually serves a reasonably-sized image.
async function firstUsable(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    try {
      const r = await fetchWithTimeout(url, 8000);
      if (!r.ok) continue;
      const mime = r.headers.get("content-type") || "";
      if (!mime.startsWith("image/")) continue;
      const buf = await r.arrayBuffer();
      if (buf.byteLength < 20_000 || buf.byteLength > 8_000_000) continue; // skip icons/oversized
      return url;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

// @ts-ignore Deno.serve entry point
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const query = (body?.query || "").toString().trim();
    if (!query) return json({ error: "query is required" }, 400);

    const candidates = await searchCandidates(`${query} photo`);
    const imageUrl = await firstUsable(candidates);
    return json({ imageUrl }); // null when nothing usable — caller falls back to prompt-only
  } catch (err) {
    console.error("movie-reference-image error", String(err));
    return json({ imageUrl: null });
  }
});
