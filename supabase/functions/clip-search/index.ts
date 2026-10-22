// Clips (Video page type): the moment of a real video that answers the question.
//   Film / TV scene → find-scene (FIND_SCENE_API_KEY, then FIND_SCENE_K_API_KEY), the clip copied
//                     to our storage (find-scene's URL is signed and expires).
//   Anything else, or no scene → YouTube: Brave video search + Supadata transcripts (Gemini reads
//                     the video when Supadata has none); the page's director picks the segment.
// One clip per question (clip_answers), so the same question never pays twice.
//
// Body { action }:
//   lookup  { key }                → { ready: true, clip } | { ready: false, left }
//   scene   { key, state }         → advances the find-scene search a step (each call ≤ ~25 s):
//                                    { state } (call again) | { done: true, scene } | { failed: reason }
//                                    The first call sends state = { title, year, isSeries, season, episode, quote, description }.
//   youtube { key, searches }      → { candidates: [{ videoId, title, channel, thumbnail, url, transcript }] }
//   save    { key, clip }          → { clip }   (daily caps: guest 1 per connection, free 3, Pro 10)
//   claim   { key }                → links a clip a guest made to the account they just made
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// @ts-ignore: Deno env
const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const CAP = { guest: 1, free: 3, pro: 10 } as const;
const GLOBAL_CAP = 100;
const BUCKET = "movie-assets";
const FIND_SCENE = "https://api.find-scene.com/api";
const FS_KEYS = ["FIND_SCENE_API_KEY", "FIND_SCENE_K_API_KEY"];
const STEP_BUDGET_MS = 25_000;

type Line = { t: number; d: number; text: string };

const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function userId(req: Request): Promise<string | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token || token === env("SUPABASE_ANON_KEY")) return null;
  const res = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, { headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: `Bearer ${token}` } });
  return res.ok ? String((await res.json()).id ?? "") || null : null;
}

/** A guest's connection, hashed — counted for the guest cap, never stored in clear. */
async function ipHash(req: Request): Promise<string> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${env("SUPABASE_URL")}`));
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** New clips the caller may still make in the last 24 h, by tier (and the global cap). */
async function clipsLeft(req: Request, uid: string | null): Promise<number> {
  const since = new Date(Date.now() - 864e5).toISOString();
  const recent = () => db().from("clip_answers").select("id", { count: "exact", head: true }).gte("created_at", since);
  const [{ count: all }, { count: mine }, profile] = await Promise.all([
    recent(),
    uid ? recent().eq("user_id", uid) : recent().eq("creator_ip_hash", await ipHash(req)),
    uid ? db().from("profiles").select("is_pro").eq("id", uid).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const cap = !uid ? CAP.guest : (profile.data as { is_pro?: boolean } | null)?.is_pro ? CAP.pro : CAP.free;
  return Math.max(0, Math.min(cap - (mine ?? 0), GLOBAL_CAP - (all ?? 0)));
}

const toClip = (r: Record<string, unknown>) => ({
  id: r.id, question: r.question, source: r.source, videoId: r.video_id, videoUrl: r.video_url,
  start: Number(r.start_s), end: Number(r.end_s), title: r.title, credit: r.credit, sourceUrl: r.source_url,
  thumbnail: r.thumbnail, why: r.why, overview: r.overview, fiction: r.fiction, moments: r.moments,
  transcript: r.transcript, related: r.related, owned: Boolean(r.user_id),
});

// ── find-scene ────────────────────────────────────────────────────────────────────────────────
type FsResult = { ok: true; result: Record<string, unknown> } | { ok: false; error: string; keyProblem: boolean };

async function fs(name: string, body: Record<string, unknown>, k: number): Promise<FsResult> {
  const res = await fetch(`${FIND_SCENE}/${name}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _token: env(FS_KEYS[k]), ...body }),
  });
  const data = await res.json().catch(() => ({}));
  const error = String(data?.error ?? data?.result?.error ?? (res.ok ? "" : `http ${res.status}`));
  // A bad token or no credits left → the other key gets a turn.
  const keyProblem = res.status === 401 || res.status === 402 || /token|credit|quota|limit|upgrade|pro\b/i.test(error);
  return error ? { ok: false, error, keyProblem } : { ok: true, result: data.result ?? {} };
}

/** Polls a find-scene operation until it finishes or the step budget runs out (null = still running). */
async function fsWait(id: string, deadline: number): Promise<Record<string, unknown> | null> {
  while (Date.now() < deadline) {
    const res = await fetch(`${FIND_SCENE}/operation/${id}`);
    const data = await res.json().catch(() => ({}));
    if (data.status === "completed") return data.result ?? {};
    if (data.status && data.status !== "in_progress") throw new Error(`operation ${data.status}`);
    await sleep(2000);
  }
  return null;
}

const hms = (s: number) => new Date(Math.max(0, s) * 1000).toISOString().slice(11, 19);
const secs = (t: string) => t.split(/[:,.]/).slice(0, 3).reduce((a, n) => a * 60 + Number(n), 0) + (Number(t.split(/[,.]/)[1] ?? 0) / 1000 || 0);

/** SRT text → lines relative to the clip start. */
function srtLines(srt: string, offset: number): Line[] {
  return srt.replace(/\r/g, "").split(/\n\n+/).map((block) => {
    const m = block.match(/(\d\d:\d\d:\d\d[,.]\d+)\s*-->\s*(\d\d:\d\d:\d\d[,.]\d+)\n([\s\S]+)/);
    if (!m) return null;
    const a = secs(m[1]), b = secs(m[2]);
    return { t: Math.max(0, +(a - offset).toFixed(2)), d: +(b - a).toFixed(2), text: m[3].replace(/\n/g, " ").trim() };
  }).filter((x): x is Line => Boolean(x && x.text));
}

async function tmdb(title: string, year: number | undefined, isSeries: boolean) {
  if (!env("TMDB_API_KEY")) return null;
  const kind = isSeries ? "tv" : "movie";
  const search = async (withYear: boolean) => {
    const q = new URLSearchParams({ api_key: env("TMDB_API_KEY"), query: title });
    if (withYear && year) q.set("year", String(year));
    const res = await fetch(`https://api.themoviedb.org/3/search/${kind}?${q}`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    return res?.ok ? (await res.json()).results?.[0] ?? null : null;
  };
  // A series' year is often the episode's, not the premiere's: search series by title only.
  const hit = (!isSeries && year ? await search(true) : null) ?? await search(false);
  if (!hit) return null;
  const date = String(hit.release_date ?? hit.first_air_date ?? "");
  return {
    title: String(hit.title ?? hit.name ?? title), year: date.slice(0, 4),
    image: hit.backdrop_path ? `https://image.tmdb.org/t/p/w1280${hit.backdrop_path}` : hit.poster_path ? `https://image.tmdb.org/t/p/w780${hit.poster_path}` : "",
    url: `https://www.themoviedb.org/${kind}/${hit.id}`,
  };
}

type SceneState = {
  title?: string; year?: number; isSeries?: boolean; season?: number; episode?: number; quote?: string; description?: string;
  k?: number; stage?: "locate" | "sources" | "phrase" | "download"; ops?: { v?: string; t?: string; d?: string };
  vh?: string; th?: string; start?: number; end?: number; srt?: string; info?: Awaited<ReturnType<typeof tmdb>>;
};

async function sceneStep(s: SceneState): Promise<Response> {
  const deadline = Date.now() + STEP_BUDGET_MS;
  const k = s.k ?? 0;
  const fail = (reason: string) => json({ failed: reason });
  // Another key, or give up (the page falls back to YouTube).
  const nextKey = (r: FsResult & { ok: false }) =>
    r.keyProblem && k + 1 < FS_KEYS.length && env(FS_KEYS[k + 1])
      ? json({ state: { ...s, k: k + 1, stage: "locate", ops: {}, vh: undefined, th: undefined } })
      : fail(r.keyProblem ? "no_credits" : r.error);
  if (!env(FS_KEYS[k])) return fail("not_configured");

  if (!s.stage || s.stage === "locate") {
    if (!s.title && s.quote) {
      const r = await fs("quote_to_movie", { quote: s.quote }, k);
      if (!r.ok) return nextKey(r);
      s.title = String((r.result.candidates as string[] | undefined)?.[0] ?? "");
    }
    if (!s.title) return fail("no_title");
    if (s.isSeries && !(s.season && s.episode)) {
      if (!s.quote) return fail("no_episode");
      const r = await fs("find_episode_by_phrase", { title: s.title, phrase: s.quote, isSeries: true }, k);
      if (!r.ok) return nextKey(r);
      const ep = (r.result.episodes as { season?: number; episode?: number }[] | undefined)?.[0];
      if (!ep?.season || !ep?.episode) return fail("no_episode");
      s.season = ep.season; s.episode = ep.episode;
    }
    const what = { title: s.title, ...(s.year ? { year: s.year } : {}), ...(s.isSeries ? { isSeries: true, season: s.season, episode: s.episode } : {}) };
    // Video and (fast) subtitles in parallel: ~20 s instead of ~60 s with the high-accuracy pass.
    const [v, t, info] = await Promise.all([
      fs("get_best_video_source", what, k), s.quote ? fs("get_text_source", { ...what, language: "en" }, k) : Promise.resolve(null),
      tmdb(s.title, s.year, Boolean(s.isSeries)),
    ]);
    if (!v.ok) return nextKey(v);
    if (t && !t.ok) return nextKey(t);
    s.info = info;
    s.ops = { v: String(v.result.operationId ?? ""), t: t?.ok ? String(t.result.operationId ?? "") : undefined };
    s.stage = "sources";
  }

  if (s.stage === "sources") {
    if (!s.vh && s.ops?.v) {
      const r = await fsWait(s.ops.v, deadline);
      if (!r) return json({ state: s });
      s.vh = (r.videoSourceHashes as string[] | undefined)?.[0];
      if (!s.vh) return fail("no_video");
    }
    if (!s.th && s.ops?.t) {
      const r = await fsWait(s.ops.t, deadline);
      if (!r) return json({ state: s });
      s.th = (r.textSourceHashes as string[] | undefined)?.[0];
    }
    s.stage = "phrase";
  }

  if (s.stage === "phrase") {
    if (s.quote && s.th) {
      const r = await fs("search_phrase", { textSourceHash: s.th, phrase: s.quote.slice(0, 200), secondsBefore: 12, secondsAfter: 25, maxOccurrences: 1 }, k);
      const occ = r.ok ? (r.result.occurrences as { rangeStart: string; rangeEnd: string; srt: string }[] | undefined)?.[0] : undefined;
      if (occ) { s.start = secs(occ.rangeStart); s.end = secs(occ.rangeEnd); s.srt = occ.srt; }
    }
    if (s.start === undefined && s.description) {
      const r = await fs("find_by_scene_description", {
        query: s.description.slice(0, 300), title: s.title, nResults: 1, scoreThreshold: 0.3,
        ...(s.isSeries ? { isSeries: true, season: s.season, episode: s.episode } : {}),
      }, k);
      const hit = r.ok ? (r.result.results as { time?: string }[] | undefined)?.[0] : undefined;
      if (hit?.time) { const at = secs(hit.time.split("-")[0]); s.start = Math.max(0, at - 10); s.end = at + 30; }
    }
    if (s.start === undefined || s.end === undefined) return fail("no_scene");
    s.end = Math.min(s.end, s.start + 60); // find-scene: keep clips under a minute
    if (!s.srt && s.th) {
      const r = await fs("get_srt_entries_by_time_range", { textSourceHash: s.th, startTime: hms(s.start), endTime: hms(s.end) }, k);
      if (r.ok) s.srt = String(r.result.srt ?? "");
    }
    const d = await fs("download_by_time", { videoSourceHash: s.vh, startTime: hms(s.start), endTime: hms(s.end) }, k);
    if (!d.ok) return nextKey(d);
    s.ops = { ...s.ops, d: String(d.result.operationId ?? "") };
    s.stage = "download";
  }

  if (s.stage === "download" && s.ops?.d) {
    const r = await fsWait(s.ops.d, deadline);
    if (!r) return json({ state: s });
    const url = String(r.url ?? "");
    if (!url) return fail("no_download");
    const file = await fetch(url);
    if (!file.ok) return fail(`download ${file.status}`);
    const path = `clips/${crypto.randomUUID()}.mp4`;
    const client = db();
    const { error } = await client.storage.from(BUCKET).upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: "video/mp4", upsert: true });
    if (error) return fail(`upload: ${error.message}`);
    const info = s.info;
    const name = info?.title || s.title || "";
    return json({
      done: true,
      scene: {
        videoUrl: client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
        start: 0, end: +(s.end! - s.start!).toFixed(2),
        title: name, credit: [name, info?.year, s.isSeries ? `T${s.season}·E${s.episode}` : ""].filter(Boolean).join(" · "),
        sourceUrl: info?.url ?? "", thumbnail: info?.image ?? "",
        transcript: s.srt ? srtLines(s.srt, s.start!) : [],
      },
    });
  }
  return fail("bad_state");
}

// ── YouTube ───────────────────────────────────────────────────────────────────────────────────
const youtubeId = (url: string) => url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)?.[1] ?? null;

async function braveVideos(q: string) {
  const res = await fetch(`https://api.search.brave.com/res/v1/videos/search?${new URLSearchParams({ q, count: "12" })}`, {
    headers: { Accept: "application/json", "X-Subscription-Token": env("BRAVE_API_KEY") },
  }).catch(() => null);
  if (!res?.ok) return [];
  const data = await res.json();
  return (data.results ?? []).map((r: Record<string, any>) => ({
    videoId: youtubeId(String(r.url ?? "")), title: String(r.title ?? ""), url: String(r.url ?? ""),
    channel: String(r.video?.creator ?? r.video?.publisher ?? r.meta_url?.hostname ?? ""),
    thumbnail: String(r.thumbnail?.original ?? r.thumbnail?.src ?? ""),
  })).filter((r: { videoId: string | null }) => r.videoId);
}

// Supadata's plan allows ~1 request a second: calls are spaced and a 429 is retried once.
const SUPADATA_GAP_MS = 1100;
async function supadata(videoId: string, retry = true): Promise<Line[]> {
  if (!env("SUPADATA_API_KEY")) return [];
  const res = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}`, {
    headers: { "x-api-key": env("SUPADATA_API_KEY") }, signal: AbortSignal.timeout(8000), // a slow one isn't worth the wait
  }).catch(() => null);
  if (res?.status === 429 && retry) { await sleep(1500); return supadata(videoId, false); }
  if (!res?.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.content)
    ? data.content.map((c: { offset: number; duration: number; text: string }) => ({ t: +(c.offset / 1000).toFixed(2), d: +(c.duration / 1000).toFixed(2), text: String(c.text).replace(/\n/g, " ") }))
    : [];
}

/** Fallback when no captions: Gemini watches the video and writes a timestamped transcript. */
async function geminiTranscript(videoId: string): Promise<Line[]> {
  const key = env("GEMINI_STUDIO_API_KEY");
  if (!key) return [];
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [
        { file_data: { file_uri: `https://www.youtube.com/watch?v=${videoId}`, mime_type: "video/*" } },
        { text: 'Transcribe what is said (or, without speech, describe what happens) as JSON: [{"t": seconds from the start, "text": "..."}], one entry every few seconds.' },
      ] }],
      generationConfig: { responseMimeType: "application/json", mediaResolution: "MEDIA_RESOLUTION_LOW" },
    }),
  }).catch(() => null);
  if (!res?.ok) return [];
  try {
    const text = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const rows = JSON.parse(text) as { t: number; text: string }[];
    return rows.filter((r) => typeof r.t === "number" && r.text).map((r, i) => ({ t: r.t, d: Math.max(1, (rows[i + 1]?.t ?? r.t + 4) - r.t), text: String(r.text) }));
  } catch { return []; }
}

// @ts-ignore: Deno runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const key = String(body.key ?? "").slice(0, 300);
    if (!key) return json({ error: "key is required" }, 400);

    if (body.action === "lookup") {
      const { data } = await db().from("clip_answers").select("*").eq("question_key", key).maybeSingle();
      return json(data ? { ready: true, clip: toClip(data) } : { ready: false, left: await clipsLeft(req, await userId(req)) });
    }

    if (body.action === "scene") {
      if (!body.state?.stage && (await clipsLeft(req, await userId(req))) <= 0) return json({ error: "daily_limit" }, 429);
      return await sceneStep({ ...(body.state ?? {}) });
    }

    if (body.action === "youtube") {
      if ((await clipsLeft(req, await userId(req))) <= 0) return json({ error: "daily_limit" }, 429);
      const searches = (Array.isArray(body.searches) ? body.searches : []).map(String).filter(Boolean).slice(0, 2);
      if (!searches.length) return json({ error: "searches required" }, 400);
      const found = (await Promise.all(searches.map(braveVideos))).flat();
      const unique = found.filter((v, i) => found.findIndex((x) => x.videoId === v.videoId) === i).slice(0, 3);
      const withText = await Promise.all(unique.map(async (v, i) => {
        await sleep(i * SUPADATA_GAP_MS);
        return { ...v, transcript: await supadata(v.videoId!) };
      }));
      // No captions anywhere → Gemini reads the best candidate.
      if (withText.length && withText.every((v) => !v.transcript.length)) withText[0].transcript = await geminiTranscript(withText[0].videoId!);
      return json({ candidates: withText.filter((v) => v.transcript.length) });
    }

    if (body.action === "save") {
      const uid = await userId(req);
      const { data: existing } = await db().from("clip_answers").select("*").eq("question_key", key).maybeSingle();
      if (existing) return json({ clip: toClip(existing) });
      if ((await clipsLeft(req, uid)) <= 0) return json({ error: "daily_limit" }, 429);
      const c = body.clip ?? {};
      const source = c.source === "scene" ? "scene" : "youtube";
      const videoId = source === "youtube" ? String(c.videoId ?? "") : null;
      const videoUrl = source === "scene" ? String(c.videoUrl ?? "") : null;
      if (source === "youtube" && !/^[\w-]{11}$/.test(videoId!)) return json({ error: "bad videoId" }, 400);
      if (source === "scene" && !videoUrl!.startsWith(`${env("SUPABASE_URL")}/storage/`)) return json({ error: "bad videoUrl" }, 400);
      const str = (v: unknown, n: number) => String(v ?? "").slice(0, n);
      const row = {
        question_key: key, question: str(c.question || key, 500), source, video_id: videoId, video_url: videoUrl,
        start_s: Math.max(0, Number(c.start) || 0), end_s: Math.max(0, Number(c.end) || 0),
        title: str(c.title, 200), credit: str(c.credit, 200), source_url: str(c.sourceUrl, 500), thumbnail: str(c.thumbnail, 500),
        why: str(c.why, 500), overview: str(c.overview, 2000), fiction: Boolean(c.fiction),
        moments: Array.isArray(c.moments) ? c.moments.slice(0, 6) : [], transcript: Array.isArray(c.transcript) ? c.transcript.slice(0, 1500) : [],
        related: Array.isArray(c.related) ? c.related.slice(0, 4) : [],
        user_id: uid, creator_ip_hash: uid ? null : await ipHash(req),
      };
      const { data, error } = await db().from("clip_answers").upsert(row, { onConflict: "question_key" }).select("*").single();
      if (error) throw new Error(error.message);
      return json({ clip: toClip(data) });
    }

    if (body.action === "claim") {
      const uid = await userId(req);
      if (!uid) return json({ error: "sign_in_required" }, 401);
      const { error } = await db().from("clip_answers").update({ user_id: uid, creator_ip_hash: null })
        .eq("question_key", key).is("user_id", null).eq("creator_ip_hash", await ipHash(req));
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
