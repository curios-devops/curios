// Clips — talk to the video (ACTx486-style, rebuilt with our own pieces). The viewer pauses and
// asks; the page's director writes the answer and 1-3 shots of 5 s that start from the paused
// moment; this function makes them with Pruna and the page plays them, labelled "AI generated",
// before the original video continues. 1 Pro Credit per question (the page charges it).
//
// Starting image (best available):
//   film/TV clip (our MP4)   → the paused frame (canvas) + its last 5 s → p-video-2-pro-reference
//                              continues the scene (p-video-2 from the frame as fallback)
//   YouTube                  → the video comes down here (Tunelio, then VidKraken) and its last 5 s
//                              before the pause are cut (Mediabunny, no re-encode) into our storage;
//                              the page reads the real frame from it. Else a frame captured from the
//                              screen (desktop), or CLIP_DOWNLOADER_URL (placeholder), or Gemini
//                              describes that second and the image model recreates it
// Who speaks: fiction → the character (Pruna speech + lip-sync); real people → never: the shots
// illustrate the answer and the page's narrator (ElevenLabs) reads it.
//
// Body { action }:
//   start  { clipId, at, question, frame?, video?, videoUrl? } → { questionId, frameUrl?, videoUrl?, scene }
//          frame = JPEG and video = MP4 as base64; videoUrl = a segment already in our storage. Daily caps: guest 1 per connection, free 3, Pro 10.
//   shot   { questionId, prompt, line?, speaks, frameUrl?, videoUrl?, imagePrompt? } → { videoUrl }
//   record { questionId, answer }                   → { ok }
//   segment { videoId, at }                         → { url } the 5 s before `at` of a saved clip's YouTube video, in our storage
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ALL_FORMATS, BufferSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, UrlSource } from "npm:mediabunny@1.62.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// @ts-ignore: Deno env
const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const CAP = { guest: 1, free: 3, pro: 10 } as const;
const GLOBAL_CAP = 50; // each question is 1-3 Pruna shots (≈ $0.13-0.40)
const BUCKET = "movie-assets";
const PRUNA = "https://api.pruna.ai/v1";
const GEMINI_MODEL = "gemini-3.5-flash-lite";

const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function userId(req: Request): Promise<string | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token || token === env("SUPABASE_ANON_KEY")) return null;
  const res = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, { headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: `Bearer ${token}` } });
  return res.ok ? String((await res.json()).id ?? "") || null : null;
}

async function ipHash(req: Request): Promise<string> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${env("SUPABASE_URL")}`));
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Questions the caller may still ask in the last 24 h, by tier (and the global cap). */
async function questionsLeft(req: Request, uid: string | null): Promise<number> {
  const since = new Date(Date.now() - 864e5).toISOString();
  const recent = () => db().from("clip_questions").select("id", { count: "exact", head: true }).gte("created_at", since);
  const [{ count: all }, { count: mine }, profile] = await Promise.all([
    recent(),
    uid ? recent().eq("user_id", uid) : recent().eq("creator_ip_hash", await ipHash(req)),
    uid ? db().from("profiles").select("is_pro").eq("id", uid).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const cap = !uid ? CAP.guest : (profile.data as { is_pro?: boolean } | null)?.is_pro ? CAP.pro : CAP.free;
  return Math.max(0, Math.min(cap - (mine ?? 0), GLOBAL_CAP - (all ?? 0)));
}

const b64bytes = (b64: string) => Uint8Array.from(atob(b64.replace(/^data:[^,]+,/, "")), (c) => c.charCodeAt(0));

async function store(bytes: Uint8Array, path: string, contentType: string): Promise<string> {
  const client = db();
  const { error } = await client.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`upload: ${error.message}`);
  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

const ours = (url: unknown): string | null =>
  typeof url === "string" && url.startsWith(`${env("SUPABASE_URL")}/storage/`) ? url : null;

/** What is on screen at that moment, as a still-image prompt (Gemini; ~2 s). */
async function describe(part: Record<string, unknown>): Promise<string> {
  const key = env("GEMINI_STUDIO_API_KEY");
  if (!key) return "";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [part, { text: "Describe exactly what is on screen at the last moment, as a still-image prompt: who/what (appearance, clothes, pose), framing, setting, lighting, film look. 50-80 words, English. Ignore watermarks and captions." }] }],
      generationConfig: { mediaResolution: "MEDIA_RESOLUTION_LOW" },
    }),
    signal: AbortSignal.timeout(20000),
  }).catch(() => null);
  if (!res?.ok) return "";
  const data = await res.json().catch(() => ({}));
  return String(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

/** An image from a prompt (gemini-image: Nano Banana, gpt-image-2 fallback), optionally styled on a reference. */
async function makeImage(prompt: string, reference: string | null, path: string): Promise<string | null> {
  const res = await fetch(`${env("SUPABASE_URL")}/functions/v1/gemini-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("SUPABASE_ANON_KEY")}` },
    body: JSON.stringify({ prompt, ...(reference ? { referenceImageUrl: reference } : {}), aspectRatio: "16:9", storageBucket: BUCKET, storagePath: path }),
  }).catch(() => null);
  const data = res?.ok ? await res.json().catch(() => null) : null;
  return typeof data?.url === "string" && data.url.startsWith("http") ? data.url : null;
}

/** One Pruna prediction (Try-Sync, then polling) → our stored MP4, or null. */
async function pruna(model: string, input: Record<string, unknown>, path: string): Promise<string | null> {
  const headers = { "Content-Type": "application/json", apikey: env("PRUNA_API_KEY") };
  const deadline = Date.now() + 100_000;
  const submit = await fetch(`${PRUNA}/predictions`, { method: "POST", headers: { ...headers, Model: model, "Try-Sync": "true" }, body: JSON.stringify({ input }) }).catch(() => null);
  let data = submit ? await submit.json().catch(() => null) : null;
  if (!submit?.ok) { console.error("pruna submit", model, submit?.status, JSON.stringify(data).slice(0, 300)); return null; }
  while (data?.status !== "succeeded") {
    if (data?.status === "failed" || data?.status === "canceled" || Date.now() > deadline || !data?.get_url) {
      console.error("pruna", model, JSON.stringify(data).slice(0, 300));
      return null;
    }
    await sleep(2500);
    const poll = await fetch(data.get_url, { headers });
    data = { get_url: data.get_url, ...(await poll.json().catch(() => ({}))) };
  }
  const gen = String(data.generation_url ?? "");
  const file = gen ? await fetch(gen.startsWith("http") ? gen : `https://api.pruna.ai${gen}`, { headers }) : null;
  if (!file?.ok) return null;
  return await store(new Uint8Array(await file.arrayBuffer()), path, "video/mp4");
}

// ── YouTube downloads (for the real paused frame and last seconds) ─────────────────────────────
type Source = { url: string; ranges: boolean; size: number | null };
const MAX_FULL_DOWNLOAD = 120_000_000; // a stream without Range is read whole; keep it in memory bounds

/** Tunelio: a 720p stream link at once (~1 s; the file streams fast) — no Range, so read whole. */
async function tunelio(youtube: string): Promise<Source | null> {
  if (!env("TUNELIO_API_KEY")) return null;
  const res = await fetch(`https://tunelio.dev/create?${new URLSearchParams({ quality: "720p", url: youtube })}`, {
    headers: { Authorization: `Bearer ${env("TUNELIO_API_KEY")}` }, signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (data?.status !== "ok" || typeof data.url !== "string") throw new Error(`tunelio ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
  const size = Number(data.file_size) || null;
  return size && size > MAX_FULL_DOWNLOAD ? null : { url: data.url, ranges: false, size };
}

/** VidKraken: a download job (~15 s for a few minutes of video); its file allows Range reads. */
async function vidkraken(youtube: string): Promise<Source | null> {
  if (!env("VIDKRAKEN_API_KEY")) return null;
  const headers = { Authorization: `Bearer ${env("VIDKRAKEN_API_KEY")}`, "Content-Type": "application/json" };
  const submit = await fetch("https://vidkraken.com/api/v2/download", { method: "POST", headers, body: JSON.stringify({ url: youtube, format: "720" }), signal: AbortSignal.timeout(30000) });
  const job = await submit.json().catch(() => ({}));
  if (!job?.jobId) throw new Error(`vidkraken ${submit.status} ${JSON.stringify(job).slice(0, 200)}`);
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await sleep(2500);
    const poll = await fetch(`https://vidkraken.com/api/v2/download/${job.jobId}`, { headers }).then((r) => r.json()).catch(() => ({}));
    if (poll?.status === "COMPLETED" && typeof poll.downloadUrl === "string") return { url: poll.downloadUrl, ranges: true, size: Number(poll.fileSize) || null };
    if (poll?.status === "FAILED" || poll?.status === "CANCELLED") throw new Error(`vidkraken ${poll.status}`);
  }
  throw new Error("vidkraken timeout");
}

/** The 5 s before `at`, copied without re-encoding (starts at the keyframe before). */
async function cut(source: Source, at: number): Promise<Uint8Array | null> {
  const input = new Input({
    source: source.ranges ? new UrlSource(source.url) : new BufferSource(new Uint8Array(await (await fetch(source.url)).arrayBuffer())),
    formats: ALL_FORMATS,
  });
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const conversion = await Conversion.init({ input, output, trim: { start: Math.max(0, at - 5), end: at } });
  if (!conversion.isValid) return null;
  await conversion.execute();
  return output.target.buffer ? new Uint8Array(output.target.buffer) : null;
}

// @ts-ignore: Deno runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();

    if (body.action === "start") {
      const uid = await userId(req);
      if ((await questionsLeft(req, uid)) <= 0) return json({ error: "daily_limit" }, 429);
      const { data: clip } = await db().from("clip_answers").select("id, source, video_id, thumbnail").eq("id", String(body.clipId ?? "")).maybeSingle();
      if (!clip) return json({ error: "clip not found" }, 404);
      const at = Math.max(0, Number(body.at) || 0);
      const question = String(body.question ?? "").trim().slice(0, 500);
      if (!question) return json({ error: "question required" }, 400);
      const { data: row, error } = await db().from("clip_questions").insert({
        clip_id: clip.id, at_s: at, question, user_id: uid, creator_ip_hash: uid ? null : await ipHash(req),
      }).select("id").single();
      if (error) throw new Error(error.message);
      const folder = `clips/asks/${row.id}`;

      let frameUrl: string | null = null;
      let videoUrl: string | null = null;
      if (typeof body.frame === "string" && body.frame.length < 6_000_000) frameUrl = await store(b64bytes(body.frame), `${folder}/frame.jpg`, "image/jpeg");
      if (typeof body.video === "string" && body.video.length < 20_000_000) videoUrl = await store(b64bytes(body.video), `${folder}/last5.mp4`, "video/mp4");
      else videoUrl = ours(body.videoUrl);
      // YouTube without a captured frame: a download service when configured (placeholder).
      if (!frameUrl && clip.source === "youtube" && env("CLIP_DOWNLOADER_URL")) {
        const res = await fetch(env("CLIP_DOWNLOADER_URL"), {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("CLIP_DOWNLOADER_TOKEN")}` },
          body: JSON.stringify({ videoId: clip.video_id, at, seconds: 5 }), signal: AbortSignal.timeout(30000),
        }).catch(() => null);
        const got = res?.ok ? await res.json().catch(() => ({})) : {};
        if (typeof got.frameUrl === "string") frameUrl = got.frameUrl;
        if (typeof got.videoUrl === "string") videoUrl = got.videoUrl;
      }
      // What is on screen: from the frame, or Gemini watches the YouTube second itself.
      const frameB64 = typeof body.frame === "string" ? body.frame.replace(/^data:[^,]+,/, "") : "";
      const scene = frameB64
        ? await describe({ inline_data: { mime_type: "image/jpeg", data: frameB64 } })
        : clip.source === "youtube"
          ? await describe({ file_data: { file_uri: `https://www.youtube.com/watch?v=${clip.video_id}` }, video_metadata: { start_offset: `${Math.max(0, Math.floor(at) - 3)}s`, end_offset: `${Math.max(1, Math.floor(at))}s` } })
          : "";
      return json({ questionId: row.id, frameUrl, videoUrl, scene, thumbnail: clip.thumbnail });
    }

    if (body.action === "shot") {
      const questionId = String(body.questionId ?? "");
      const { data: q } = await db().from("clip_questions").select("id").eq("id", questionId).maybeSingle();
      if (!q) return json({ error: "question not found" }, 404);
      const n = Math.max(0, Math.min(2, Number(body.n) || 0));
      const folder = `clips/asks/${questionId}`;
      const speaks = Boolean(body.speaks);
      const line = String(body.line ?? "").trim().slice(0, 200);
      const prompt = `${String(body.prompt ?? "").trim().slice(0, 700)} ${speaks && line ? `They say: "${line}"` : "No dialogue and no voice; soft ambient sound only."}`;
      let frameUrl = ours(body.frameUrl);
      const videoUrl = ours(body.videoUrl);
      // No frame to continue from (YouTube without capture, or an illustration shot) → make one.
      if (!frameUrl || body.imagePrompt) {
        frameUrl = await makeImage(String(body.imagePrompt || body.scene || body.prompt).slice(0, 900), ours(body.frameUrl) ?? (typeof body.reference === "string" ? body.reference : null), `${folder}/start-${n}.png`);
        if (!frameUrl) return json({ error: "no_image" }, 502);
      }
      const out = `${folder}/shot-${n}.mp4`;
      // The first shot continues the scene from its own last seconds (pro-reference keeps motion and
      // look, ~$0.48: $0.035/s out + $0.06/s of reference video); the rest start from the frame
      // with p-video-2 (~$0.13), which already matches the look.
      const shot = (videoUrl && n === 0 && !body.imagePrompt
        ? await pruna("p-video-2-pro-reference", { prompt: `Continue this clip. ${prompt}`, video: [videoUrl], image: [frameUrl], duration: 5, resolution: "768p", mode: "speed", aspect_ratio: "16:9" }, out)
        : null)
        ?? await pruna("p-video-2", { prompt, image: frameUrl, duration: 5, resolution: "720p", aspect_ratio: "16:9" }, out);
      return shot ? json({ videoUrl: shot }) : json({ error: "pruna" }, 502);
    }

    if (body.action === "segment") {
      const videoId = String(body.videoId ?? "");
      const at = Math.max(0, Number(body.at) || 0);
      if (!/^[\w-]{11}$/.test(videoId) || at < 1.5) return json({ error: "bad request" }, 400);
      // Only for videos that are a saved clip — the download quota isn't an open downloader.
      const { data: known } = await db().from("clip_answers").select("id").eq("video_id", videoId).limit(1).maybeSingle();
      if (!known) return json({ error: "unknown video" }, 404);
      const path = `clips/segments/${videoId}-${Math.floor(at * 10)}.mp4`;
      const cached = db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      if (!body.via && (await fetch(cached, { method: "HEAD" }).catch(() => null))?.ok) return json({ url: cached });
      const youtube = `https://www.youtube.com/watch?v=${videoId}`;
      // `via` picks one provider (to check the fallback); normally Tunelio, then VidKraken.
      for (const download of [tunelio, vidkraken].filter((d) => !body.via || d.name === body.via)) {
        const source = await download(youtube).catch((e) => { console.error(download.name, String(e)); return null; });
        if (!source) continue;
        const bytes = await cut(source, at).catch((e) => { console.error("cut", download.name, String(e)); return null; });
        if (bytes) return json({ url: await store(bytes, path, "video/mp4"), via: download.name });
      }
      return json({ error: "no_download" }, 502);
    }

    if (body.action === "record") {
      const { error } = await db().from("clip_questions").update({ answer: body.answer ?? {} }).eq("id", String(body.questionId ?? ""));
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
