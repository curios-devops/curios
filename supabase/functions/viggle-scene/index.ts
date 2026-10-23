// Tour (360° / 3D) video type — Viggle Scene model (https://docs.viggle.ai/v1/guides/quickstart-scene).
// A prompt becomes an explorable Gaussian-splat scene (.spz) + a 360° panorama in ~20 s,
// 6 credits ($0.06). Every scene is copied to our storage and kept per question (scene_tours),
// so the same question never pays twice — Viggle's own URLs expire in 3 hours.
//
// Body { action }:
//   lookup  { key }                         → { ready: true, tour } | { ready: false, left }
//           `left` = new tours the caller may still make today (checked before the page charges a credit)
//   create  { key, question, prompt, title, overview, related } → { taskId, meta }
//           Anyone with a Pro Credit (the page charges it). Daily caps mirror the credit allowance
//           (app-settings): guest 1 per connection (hashed IP), free 3, Pro 10; GLOBAL_CAP overall.
//   status  { taskId, key, meta }           → { status } | { ready: true, tour } (copies + saves on ready)
//   claim   { key }                         → links a tour a guest made to the account they just made
//   cast    { key, cast }                   → { tour } Immersion: the director's 3-6 characters get a transparent
//           full-body cutout and first-person hands, once per tour. Images: Nano Banana 2 Lite, then Gemini
//           2.5 Flash Image (AI Studio key; both need billing), then Viggle Image (all on green, keyed out
//           here), then gpt-image-1-mini (transparent WebP)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// @ts-ignore: Deno env
const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const VIGGLE = "https://apis.viggle.ai/v1/scenes";
const CAP = { guest: 1, free: 3, pro: 10 } as const;
const GLOBAL_CAP = 100; // ≈ $6 a day at most, whatever happens
const BUCKET = "movie-assets";
const QUALITY = "medium";

const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const viggle = (path: string, init: RequestInit = {}) =>
  fetch(`${VIGGLE}${path}`, { ...init, headers: { Authorization: `Bearer ${env("VIGGLE_API_KEY")}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });

async function userId(req: Request): Promise<string | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token || token === env("SUPABASE_ANON_KEY")) return null;
  const res = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, { headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: `Bearer ${token}` } });
  return res.ok ? String((await res.json()).id ?? "") || null : null;
}

const toTour = (r: Record<string, unknown>) => ({
  question: r.question, title: r.title, overview: r.overview, related: r.related,
  spzUrl: r.spz_url, panoramaUrl: r.panorama_url, owned: Boolean(r.user_id), cast: r.cast_members ?? [],
});

const GREEN = "on a solid pure chroma-key green (#00FF00) background, flat even green, no shadow, no floor";

/** Green-screen image → transparent WebP: green-dominant pixels go, soft edges, green spill removed. */
async function keyOut(bytes: Uint8Array): Promise<Uint8Array> {
  // Loaded on use, so the function still boots if the module can't load (that provider is skipped).
  const { decode } = await import("npm:imagescript@1.3.0");
  const img = await decode(bytes) as any; // deno-lint-ignore no-explicit-any
  for (const [x, y, c] of img.iterateWithColors()) {
    const r = (c >>> 24) & 255, g = (c >>> 16) & 255, b = (c >>> 8) & 255;
    const excess = g - Math.max(r, b);
    const a = excess > 90 ? 0 : excess > 40 ? Math.round((255 * (90 - excess)) / 50) : 255;
    const g2 = excess > 0 ? Math.max(r, b) + Math.round(excess * 0.15) : g;
    img.setPixelAt(x, y, ((r << 24) | (Math.min(255, g2) << 16) | (b << 8) | a) >>> 0);
  }
  return await img.encodeWEBP(80);
}

/** Nano Banana 2 Lite / Gemini 2.5 Flash Image (AI Studio key) on green. */
async function geminiImage(model: string, prompt: string, aspect: string): Promise<Uint8Array | null> {
  if (!env("GEMINI_STUDIO_API_KEY")) return null;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env("GEMINI_STUDIO_API_KEY")}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${prompt}, ${GREEN}` }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } } }),
    signal: AbortSignal.timeout(60000),
  }).catch(() => null);
  const data = res?.ok ? await res.json().catch(() => null) : null;
  const part = (data?.candidates?.[0]?.content?.parts ?? []).find((p: Record<string, any>) => p.inlineData ?? p.inline_data);
  const b64 = (part?.inlineData ?? part?.inline_data)?.data;
  if (!b64) { console.error("gemini image", model, res?.status); return null; }
  return await keyOut(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
}

/** Viggle Image (qwen, $0.01 at 1K, ~15 s) on green. */
async function viggleImage(prompt: string, aspect: string): Promise<Uint8Array | null> {
  if (!env("VIGGLE_API_KEY")) return null;
  const headers = { Authorization: `Bearer ${env("VIGGLE_API_KEY")}` };
  const form = new FormData();
  form.append("prompt", `${prompt}, ${GREEN}`);
  form.append("aspect_ratio", aspect);
  form.append("resolution", "1K");
  form.append("n", "1");
  let job = await fetch("https://apis.viggle.ai/v1/images", { method: "POST", headers, body: form }).then((r) => r.json()).catch(() => null);
  const deadline = Date.now() + 90_000;
  while (job && (job.status === "queued" || job.status === "processing") && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    job = await fetch(`https://apis.viggle.ai/v1/images/${job.id}`, { headers }).then((r) => r.json()).catch(() => null);
  }
  const url = job?.status === "ready" ? job.images?.[0]?.url : null;
  if (!url) { console.error("viggle image", job?.status, JSON.stringify(job?.error ?? null)); return null; }
  return await keyOut(new Uint8Array(await (await fetch(url)).arrayBuffer()));
}

/** gpt-image-1-mini, transparent WebP directly — the last resort. */
async function openaiImage(prompt: string, size: string): Promise<Uint8Array | null> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("OPENAI_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-1-mini", prompt, size, quality: "low", background: "transparent", output_format: "webp", output_compression: 80, n: 1 }),
    signal: AbortSignal.timeout(90000),
  }).catch(() => null);
  const data = res?.ok ? await res.json().catch(() => null) : null;
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) { console.error("openai image", res?.status, JSON.stringify(data).slice(0, 200)); return null; }
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** A transparent WebP (cutouts and hands are laid over the 3D world), stored. */
async function cutout(prompt: string, portrait: boolean, path: string): Promise<string | null> {
  const aspect = portrait ? "2:3" : "3:2";
  const bytes = await geminiImage("gemini-3.1-flash-lite-image", prompt, aspect).catch(() => null)
    ?? await geminiImage("gemini-2.5-flash-image", prompt, aspect).catch(() => null)
    ?? await viggleImage(prompt, aspect).catch(() => null)
    ?? await openaiImage(`${prompt}, isolated, transparent background`, portrait ? "1024x1536" : "1536x1024").catch(() => null);
  if (!bytes) return null;
  const client = db();
  const { error } = await client.storage.from(BUCKET).upload(path, bytes, { contentType: "image/webp", upsert: true });
  return error ? null : client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** New tours the caller may still make in the last 24 h, by tier (and the global cap). */
async function toursLeft(req: Request, uid: string | null): Promise<number> {
  const since = new Date(Date.now() - 864e5).toISOString();
  const recent = () => db().from("scene_tours").select("id", { count: "exact", head: true }).gte("created_at", since);
  const [{ count: all }, { count: mine }, profile] = await Promise.all([
    recent(),
    uid ? recent().eq("user_id", uid) : recent().eq("creator_ip_hash", await ipHash(req)),
    uid ? db().from("profiles").select("is_pro").eq("id", uid).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const cap = !uid ? CAP.guest : (profile.data as { is_pro?: boolean } | null)?.is_pro ? CAP.pro : CAP.free;
  return Math.max(0, Math.min(cap - (mine ?? 0), GLOBAL_CAP - (all ?? 0)));
}

/** A guest's connection, hashed — counted for the guest cap, never stored in clear. */
async function ipHash(req: Request): Promise<string> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${env("SUPABASE_URL")}`));
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function copyToStorage(url: string, path: string, contentType: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const client = db();
  const { error } = await client.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`upload: ${error.message}`);
  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// @ts-ignore: Deno runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const key = String(body.key ?? "").slice(0, 300);
    if (!key) return json({ error: "key is required" }, 400);

    if (body.action === "lookup") {
      const { data } = await db().from("scene_tours").select("*").eq("question_key", key).maybeSingle();
      return json(data ? { ready: true, tour: toTour(data) } : { ready: false, left: await toursLeft(req, await userId(req)) });
    }

    if (body.action === "create") {
      const uid = await userId(req);
      if (!env("VIGGLE_API_KEY")) return json({ error: "VIGGLE_API_KEY not configured" }, 500);
      if ((await toursLeft(req, uid)) <= 0) return json({ error: "daily_limit" }, 429);
      const prompt = String(body.prompt ?? "").trim().slice(0, 1000);
      if (!prompt) return json({ error: "prompt is required" }, 400);
      const sessionId = `curios-${crypto.randomUUID()}`;
      const res = await viggle("/pano", { method: "POST", body: JSON.stringify({ sessionId, prompt, quality: QUALITY }) });
      const task = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: "viggle", status: res.status, detail: task?.error ?? task }, res.status === 402 ? 402 : 502);
      // What to save once the scene is ready (status only gets the task id back).
      const meta = {
        question: String(body.question ?? "").slice(0, 500), title: String(body.title ?? "").slice(0, 120),
        overview: String(body.overview ?? "").slice(0, 2000), related: Array.isArray(body.related) ? body.related.slice(0, 4) : [],
        prompt,
      };
      return json({ taskId: task.id, meta: btoa(unescape(encodeURIComponent(JSON.stringify(meta)))) });
    }

    if (body.action === "status") {
      const taskId = String(body.taskId ?? "");
      if (!/^scn_[\w.-]+$/.test(taskId)) return json({ error: "bad taskId" }, 400);
      const { data: existing } = await db().from("scene_tours").select("*").eq("question_key", key).maybeSingle();
      if (existing) return json({ ready: true, tour: toTour(existing) });
      const res = await viggle(`/${taskId}`);
      const task = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: "viggle", status: res.status }, 502);
      if (task.status === "queued" || task.status === "processing") return json({ status: task.status, queuePosition: task.queuePosition ?? null });
      if (task.status !== "ready") return json({ status: task.status, error: task.error ?? null });

      const meta = JSON.parse(decodeURIComponent(escape(atob(String(body.meta ?? "")))) || "{}");
      const folder = `tours/${taskId.replace(/[^\w-]/g, "_").slice(0, 80)}`;
      const [spzUrl, panoramaUrl] = await Promise.all([
        copyToStorage(task.result.spz.url, `${folder}/scene.spz`, "application/octet-stream"),
        copyToStorage(task.result.panorama.url, `${folder}/panorama.png`, "image/png"),
      ]);
      const row = {
        question_key: key, question: meta.question || key, title: meta.title ?? "", overview: meta.overview ?? "",
        scene_prompt: meta.prompt ?? "", related: meta.related ?? [], spz_url: spzUrl, panorama_url: panoramaUrl,
        user_id: await userId(req), // the creator, from their own session (never from the request body)
        creator_ip_hash: (await userId(req)) ? null : await ipHash(req),
      };
      const { data, error } = await db().from("scene_tours").upsert(row, { onConflict: "question_key" }).select("*").single();
      if (error) throw new Error(error.message);
      return json({ ready: true, tour: toTour(data) });
    }

    if (body.action === "claim") {
      const uid = await userId(req);
      if (!uid) return json({ error: "sign_in_required" }, 401);
      const { error } = await db().from("scene_tours").update({ user_id: uid, creator_ip_hash: null })
        .eq("question_key", key).is("user_id", null)
        .eq("creator_ip_hash", await ipHash(req)); // only the guest who made it (same connection)
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    if (body.action === "cast") {
      const { data: row } = await db().from("scene_tours").select("*").eq("question_key", key).maybeSingle();
      if (!row) return json({ error: "tour not found" }, 404);
      if (Array.isArray(row.cast_members) && row.cast_members.length) return json({ tour: toTour(row) }); // made once
      const str = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
      const cast = (Array.isArray(body.cast) ? body.cast : []).slice(0, 6);
      if (cast.length < 2) return json({ error: "cast required" }, 400);
      const folder = `tours/cast/${row.id}`;
      const members = await Promise.all(cast.map(async (c: Record<string, unknown>, i: number) => {
        const look = str(c.look, 500), hands = str(c.hands, 400);
        const [bodyUrl, handsUrl] = await Promise.all([
          cutout(`Full-body photo of ${look}, standing, facing the viewer, whole figure from head to feet, realistic film-still lighting`, true, `${folder}/${i}-body.webp`),
          cutout(`First-person view through the eyes of ${look}: only the viewer's own two forearms and hands rising from the bottom edge of the frame, ${hands}; only the hands, sleeves and the object they hold — no table, wall, surface, body or scenery, realistic`, false, `${folder}/${i}-hands.webp`),
        ]);
        return {
          name: str(c.name, 40), role: str(c.role, 60), tagline: str(c.tagline, 160), voiceId: str(c.voiceId, 40),
          gender: c.gender === "male" ? "male" : "female", lines: (Array.isArray(c.lines) ? c.lines : []).map((l) => str(l, 300)).filter(Boolean).slice(0, 4),
          bodyUrl, handsUrl,
        };
      }));
      const usable = members.filter((m) => m.bodyUrl);
      if (usable.length < 2) return json({ error: "images failed" }, 502);
      const { data, error } = await db().from("scene_tours").update({ cast_members: usable }).eq("id", row.id).select("*").single();
      if (error) throw new Error(error.message);
      return json({ tour: toTour(data) });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
