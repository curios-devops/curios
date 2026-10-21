// Pixabay Search Edge Function — the second stock engine next to pexels-search (Cinematic's
// Continue exploring needs footage the chapters didn't use). Keys stay server-side:
// PIXABAY_API_KEY_2 first; if it fails or hits its limit (100 requests/min per key, verified
// 2026-10-21), PIXABAY_API_KEY. Both keys see the same catalog — the second adds capacity, not images.
// Returns { videos: [{ id, url, pageUrl, image, width, height, duration, user, tags }] } for
// type "videos", { photos: [{ id, url, pageUrl, image, width, height, user }] } for "photos".
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// @ts-ignore: Deno runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { query, type = "videos", perPage = 8 } = await req.json();
    if (!query) return json({ error: "Query parameter is required" }, 400);
    // @ts-ignore: Deno env
    const keys = [Deno.env.get("PIXABAY_API_KEY_2"), Deno.env.get("PIXABAY_API_KEY")].filter(Boolean) as string[];
    if (!keys.length) return json({ error: "Pixabay API key not configured" }, 500);

    const base = type === "videos" ? "https://pixabay.com/api/videos/" : "https://pixabay.com/api/";
    let res: Response | null = null;
    for (const key of keys) {
      const params = new URLSearchParams({ key, q: String(query).slice(0, 100), per_page: String(Math.min(Math.max(perPage, 3), 50)), safesearch: "true" });
      if (type !== "videos") params.set("orientation", "horizontal");
      res = await fetch(`${base}?${params}`);
      if (res.ok) break;
    }
    if (!res?.ok) return json({ error: `Pixabay API error: ${res?.status}` }, res?.status ?? 502);
    const data = await res.json() as { hits?: Record<string, unknown>[] };
    const hits = data.hits ?? [];

    if (type === "videos") {
      type Rendition = { url: string; width: number; height: number; thumbnail?: string };
      const videos = hits.map((h) => {
        const v = h.videos as Record<string, Rendition>;
        const file = v.medium?.url ? v.medium : v.large?.url ? v.large : v.small;
        return {
          id: h.id, url: file?.url, pageUrl: h.pageURL, image: v.medium?.thumbnail || v.large?.thumbnail || v.small?.thumbnail || "",
          width: file?.width, height: file?.height, duration: h.duration, user: h.user, tags: h.tags,
        };
      }).filter((v) => v.url);
      return json({ videos });
    }
    const photos = hits.map((h) => ({
      id: h.id, url: h.largeImageURL, pageUrl: h.pageURL, image: h.webformatURL, width: h.imageWidth, height: h.imageHeight, user: h.user,
    }));
    return json({ photos });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
