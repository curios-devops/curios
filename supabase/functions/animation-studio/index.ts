// Animation (Video page type) — the studio. A model writes the answer as a live stage: a 3D machine
// you can turn and run (three.js) or an animated story (SVG + GSAP) in a motion archetype with its own
// palette (archetypes.ts, prompts.ts). Writing one takes Sol ~45-90 s, longer than an edge call may wait, so it runs in
// OpenAI's background mode: `start` launches it, the page polls `status` until the page is written.
// One animation per question (animations table), so the same question opens at once and is free.
//
// Body { action }:
//   lookup { key }                          → { ready: true, animation } | { ready: false, left }
//   start  { key, question, tier, kind?, lang? } → { status: 'making' } — tier luna|sol|astra (Astra for Pro only);
//          kind 'simulation' asks for a simulation to play with (otherwise Luna picks machine or story).
//          Daily caps: guest 2 per connection (hashed IP), free 5, Pro 20; GLOBAL_CAP overall.
//   status { key }                          → { status: 'making' } | { ready: true, animation } | { status: 'failed' }
//   portrait { key }                        → { status: 'making' } | { ready: true, animation }: the same animation
//          re-composed for a phone held upright (same manifest), kept under "<key>|portrait". Made once, from the
//          ready landscape page; it doesn't count toward the daily caps (it is a version, not a new animation).
//   upload { key }                          → { video, poster }: signed Cloudinary uploads for a signed-in viewer
//          whose browser recorded the video itself (the fallback when the cloud recording failed).
//
// Cloud recording: a ready animation (and its portrait version) is recorded once by the Cloud Run job
// animation-recorder (RECORDER_JOB in RECORDER_REGION, run with the Vertex service account) or, when that
// can't start, by the same recorder on GitHub Actions (record-animation.yml): it opens
// curiosai.com/render/animation, which plays the stage once with the narrator and records it. Older
// animations are queued the first time someone opens them. The job reports with RENDER_SECRET:
//   render_upload { key, secret }           → { video, poster } signed uploads
//   render_done   { key, secret, video_url, poster_url, seconds } → the video on the row (and on the
//                  viewers' movies made from it, landscape only)
//   render_failed { key, secret, error }    → render_status failed (viewers' browsers record instead)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { CLASSIFY, MACHINE, PORTRAIT, SIMULATION, STORY } from "./prompts.ts";
import { direct, stageOf, type Direction } from "./archetypes.ts";
import { signedUpload } from "../_shared/cloudinary.ts";
import { getVertexAccessToken, VERTEX_PROJECT } from "../_shared/vertex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// @ts-ignore: Deno env
const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const CAP = { guest: 2, free: 5, pro: 20 } as const;
const GLOBAL_CAP = 300;
const STALE_MS = 12 * 60 * 1000; // a page still unwritten after this is given up
// OpenAI's priority processing writes ~1.7× faster (a page in ~45 s instead of ~80 s) at a higher token
// price; ANIMATION_SERVICE_TIER=default turns it off.
const TIER = () => env("ANIMATION_SERVICE_TIER") || "priority";
const MODELS = {
  luna: () => env("MODEL_LUNA") || "gpt-6-luna",
  sol: () => env("MODEL_SOL") || "gpt-6.1-sol",
  astra: () => env("MODEL_ASTRA") || "gpt-6-astra",
};

const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const openai = (path: string, init: RequestInit = {}) =>
  fetch(`https://api.openai.com/v1${path}`, { ...init, headers: { Authorization: `Bearer ${env("OPENAI_API_KEY")}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });

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

async function isPro(uid: string | null): Promise<boolean> {
  if (!uid) return false;
  const { data } = await db().from("profiles").select("is_pro").eq("id", uid).maybeSingle();
  return Boolean((data as { is_pro?: boolean } | null)?.is_pro);
}

async function left(req: Request, uid: string | null): Promise<number> {
  const since = new Date(Date.now() - 864e5).toISOString();
  const recent = () => db().from("animations").select("id", { count: "exact", head: true }).gte("created_at", since).not("question_key", "like", "%|portrait");
  const [{ count: all }, { count: mine }, pro] = await Promise.all([
    recent(),
    uid ? recent().eq("user_id", uid) : recent().eq("creator_ip_hash", await ipHash(req)),
    isPro(uid),
  ]);
  const cap = !uid ? CAP.guest : pro ? CAP.pro : CAP.free;
  return Math.max(0, Math.min(cap - (mine ?? 0), GLOBAL_CAP - (all ?? 0)));
}

const RENDER_STALE_MS = 20 * 60 * 1000; // a queued recording still without a video after this has failed
const renderState = (r: Record<string, unknown>) =>
  r.render_status === "queued" && Date.now() - new Date(String(r.render_requested_at)).getTime() > RENDER_STALE_MS ? "failed" : r.render_status ?? null;
const toAnimation = (r: Record<string, unknown>) => ({
  question: r.question, kind: r.kind, style: r.style, model: r.model, html: r.html, stage: stageOf(r.style),
  videoUrl: r.video_url ?? null, posterUrl: r.poster_url ?? null, render: renderState(r),
});

/** Starts the Cloud Run job animation-recorder for this key. */
async function runCloudRun(key: string) {
  const job = `projects/${VERTEX_PROJECT}/locations/${env("RECORDER_REGION") || "us-central1"}/jobs/${env("RECORDER_JOB") || "animation-recorder"}`;
  const res = await fetch(`https://run.googleapis.com/v2/${job}:run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await getVertexAccessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ overrides: { containerOverrides: [{ env: [{ name: "ANIMATION_KEY", value: key }] }] } }),
  });
  if (!res.ok) throw new Error(`Cloud Run ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Starts the GitHub Actions workflow record-animation.yml for this key (the same recorder). */
async function runGitHub(key: string) {
  if (!env("GITHUB_DISPATCH_TOKEN")) throw new Error("GITHUB_DISPATCH_TOKEN not set");
  const res = await fetch("https://api.github.com/repos/curios-devops/curios/actions/workflows/record-animation.yml/dispatches", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("GITHUB_DISPATCH_TOKEN")}`, Accept: "application/vnd.github+json", "User-Agent": "curios-animation-studio" },
    body: JSON.stringify({ ref: "main", inputs: { key } }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Queues the cloud recording of a ready animation: Cloud Run, else GitHub Actions; marks it failed when
 *  neither can start (viewers' browsers record it then). */
async function requestRender(key: string) {
  await db().from("animations").update({ render_status: "queued", render_requested_at: new Date().toISOString() }).eq("question_key", key);
  try {
    if (!env("RENDER_SECRET")) throw new Error("RENDER_SECRET not set");
    await runCloudRun(key).catch(async (e) => {
      console.error("render request (Cloud Run)", e);
      await runGitHub(key);
    });
  } catch (e) {
    console.error("render request", e);
    await db().from("animations").update({ render_status: "failed" }).eq("question_key", key);
  }
}
const background = (p: Promise<unknown>) => {
  // @ts-ignore EdgeRuntime is provided by the Supabase edge runtime
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(p); else void p;
};
const keyHash = async (key: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)))].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");

/** The archetypes of the last 3 stories (for variety). */
async function recentArchetypes(): Promise<string[]> {
  const { data } = await db().from("animations").select("style").eq("kind", "story").not("question_key", "like", "%|portrait")
    .order("created_at", { ascending: false }).limit(3);
  return (data ?? []).map((r: { style: string | null }) => String(r.style ?? "").split(":")[0]);
}

/** Luna picks the technique (a 3D machine or a story) and the story's archetype; direct() settles it. */
async function classify(question: string, key: string): Promise<{ kind: "machine" | "story"; style: string; direction?: Direction }> {
  const res = await openai("/responses", {
    method: "POST",
    // json_object mode refuses an input without the word "json" (the instructions do not count).
    body: JSON.stringify({ model: MODELS.luna(), reasoning: { effort: "none" }, instructions: CLASSIFY, input: `Question (reply in json): ${question}`, text: { format: { type: "json_object" } }, max_output_tokens: 200 }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  if (!res?.ok) console.error("classify failed", res?.status, (await res?.text().catch(() => "") ?? "").slice(0, 300));
  const data = res?.ok ? await res.json().catch(() => null) : null;
  const text = data?.output_text ?? (data?.output ?? []).flatMap((o: Record<string, any>) => o.content ?? []).map((c: Record<string, any>) => c.text ?? "").join("");
  let out: Record<string, unknown> = {};
  try { out = JSON.parse(text); } catch { /* → story */ }
  if (out.kind === "machine") return { kind: "machine", style: "3d" };
  const direction = direct(out, await recentArchetypes(), key);
  console.log("animation direction", JSON.stringify({ key, ...direction }));
  return { kind: "story", style: direction.style, direction };
}

const pageOf = (data: Record<string, any>) => {
  const text = data.output_text ?? (data.output ?? []).flatMap((o: Record<string, any>) => o.content ?? []).map((c: Record<string, any>) => c.text ?? "").join("");
  const m = String(text).match(/```html\s*\n([\s\S]*?)```/);
  const html = (m ? m[1] : String(text)).trim();
  return /id=["']manifest["']/.test(html) && html.length > 500 ? html : null;
};

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const key = typeof body.key === "string" ? body.key.trim().slice(0, 300) : "";
    if (!key) return json({ error: "key required" }, 400);
    const uid = await userId(req);
    const { data: row } = await db().from("animations").select("*").eq("question_key", key).maybeSingle();
    const stale = row && row.status === "making" && Date.now() - new Date(row.created_at).getTime() > STALE_MS;

    if (body.action === "lookup") {
      // Older animations are queued on first view; a failed recording is retried after 6 h (e.g. once the job exists).
      const retry = row?.render_status === "failed" && Date.now() - new Date(row.render_requested_at ?? 0).getTime() > 6 * 3600e3;
      if (row?.status === "ready" && (!row.render_status || retry)) background(requestRender(key));
      if (row?.status === "ready") return json({ ready: true, animation: toAnimation(row) });
      if (row?.status === "making" && !stale) return json({ ready: false, status: "making" });
      return json({ ready: false, left: await left(req, uid) });
    }

    if (body.action === "start") {
      if (row?.status === "ready") return json({ ready: true, animation: toAnimation(row) });
      if (row?.status === "making" && !stale) return json({ status: "making" });
      const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
      if (!question) return json({ error: "question required" }, 400);
      if (await left(req, uid) <= 0) return json({ error: uid ? "daily_limit" : "sign_in_required" }, 429);
      const tier = body.tier === "astra" && await isPro(uid) ? "astra" : body.tier === "luna" ? "luna" : "sol";
      const { kind, style, direction } = body.kind === "simulation" ? { kind: "simulation", style: "sim", direction: undefined } : await classify(question, key);
      // The viewer's chosen (or browser) language, for a question that shows none of its own.
      const lang = typeof body.lang === "string" && /^[a-z]{2,3}(-[A-Za-z]{2})?$/.test(body.lang) ? body.lang : "en";
      // Low reasoning: as good a page as medium, a third sooner.
      const effort = tier === "luna" ? "none" : "low";
      const started = await openai("/responses", {
        method: "POST",
        body: JSON.stringify({
          model: MODELS[tier](), reasoning: { effort }, instructions: `${kind === "simulation" ? SIMULATION : kind === "machine" ? MACHINE : STORY(direction!.archetype, direction!.palette)}
LANGUAGE: the question's own; when it shows none clearly (a name, a single word, a link), the language with code "${lang}".`,
          input: question, background: true, store: true, max_output_tokens: 48000, service_tier: TIER(),
        }),
      });
      const job = await started.json().catch(() => null);
      if (!started.ok || !job?.id) { console.error("openai start", started.status, JSON.stringify(job).slice(0, 300)); return json({ error: "start_failed" }, 502); }
      const fields = {
        question_key: key, question, kind, style, model: MODELS[tier](), status: "making", response_id: job.id, html: null,
        user_id: uid, creator_ip_hash: uid ? null : await ipHash(req), created_at: new Date().toISOString(),
      };
      const { error } = await db().from("animations").upsert(fields, { onConflict: "question_key" });
      if (error) throw error;
      return json({ status: "making", kind, style, why: direction?.why });
    }

    if (body.action === "portrait") {
      if (row?.status === "ready") return json({ ready: true, animation: toAnimation(row) });
      if (row?.status === "making" && !stale) return json({ status: "making" });
      if (!key.endsWith("|portrait")) return json({ error: "portrait key required" }, 400);
      const { data: base } = await db().from("animations").select("*").eq("question_key", key.slice(0, -"|portrait".length)).maybeSingle();
      if (base?.status !== "ready" || !base.html) return json({ error: "not_ready" }, 400);
      const started = await openai("/responses", {
        method: "POST",
        body: JSON.stringify({
          model: base.model, reasoning: { effort: "low" }, instructions: PORTRAIT, input: base.html,
          background: true, store: true, max_output_tokens: 48000, service_tier: TIER(),
        }),
      });
      const job = await started.json().catch(() => null);
      if (!started.ok || !job?.id) { console.error("openai portrait", started.status, JSON.stringify(job).slice(0, 300)); return json({ error: "start_failed" }, 502); }
      const { error } = await db().from("animations").upsert({
        question_key: key, question: base.question, kind: base.kind, style: base.style, model: base.model, status: "making",
        response_id: job.id, html: null, user_id: uid, creator_ip_hash: uid ? null : await ipHash(req), created_at: new Date().toISOString(),
      }, { onConflict: "question_key" });
      if (error) throw error;
      return json({ status: "making" });
    }

    if (body.action === "status") {
      if (!row) return json({ status: "failed" });
      if (row.status === "ready") return json({ ready: true, animation: toAnimation(row) });
      if (stale || row.status === "failed") return json({ status: "failed" });
      const res = await openai(`/responses/${row.response_id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) return json({ status: "making" }); // a hiccup: ask again
      if (data.status === "queued" || data.status === "in_progress") return json({ status: "making" });
      const html = data.status === "completed" ? pageOf(data) : null;
      if (!html) {
        console.error("animation failed", data.status, data.incomplete_details ?? data.error ?? "no page");
        await db().from("animations").delete().eq("question_key", key); // the next visit can try again
        return json({ status: "failed" });
      }
      const { data: saved, error } = await db().from("animations").update({ status: "ready", html, updated_at: new Date().toISOString() }).eq("question_key", key).select("*").single();
      if (error) throw error;
      background(requestRender(key));
      return json({ ready: true, animation: toAnimation(saved) });
    }

    if (["render_upload", "render_done", "render_failed"].includes(body.action)) {
      if (!env("RENDER_SECRET") || body.secret !== env("RENDER_SECRET")) return json({ error: "forbidden" }, 403);
      if (row?.status !== "ready") return json({ error: "not_ready" }, 400);
      if (body.action === "render_upload") {
        const id = `render-${await keyHash(key)}`;
        return json({
          video: await signedUpload({ folder: "animations", publicId: id, format: "mp4" }),
          poster: await signedUpload({ folder: "animations", publicId: `${id}-poster`, format: "jpg" }),
        });
      }
      if (body.action === "render_failed") {
        console.error("render failed", key, String(body.error ?? "").slice(0, 300));
        await db().from("animations").update({ render_status: "failed", render_seconds: Number(body.seconds) || null }).eq("question_key", key);
        return json({ ok: true });
      }
      const video = String(body.video_url ?? ""), poster = body.poster_url ? String(body.poster_url) : null;
      if (!video.startsWith("https://res.cloudinary.com/")) return json({ error: "bad video" }, 400);
      await db().from("animations").update({
        video_url: video, poster_url: poster, render_status: "ready", render_seconds: Math.round(Number(body.seconds) || 0), rendered_at: new Date().toISOString(),
      }).eq("question_key", key);
      // Viewers' movies of this animation (landscape) get the video now.
      if (!key.endsWith("|portrait")) {
        await db().from("movie_projects").update({ full_video_url: video, thumbnail_url: poster, status: "complete" })
          .eq("animation_key", key).is("full_video_url", null);
      }
      return json({ ok: true });
    }

    if (body.action === "upload") {
      if (!uid) return json({ error: "sign_in_required" }, 401);
      if (row?.status !== "ready") return json({ error: "not_ready" }, 400);
      const id = crypto.randomUUID();
      return json({
        video: await signedUpload({ folder: "animations", publicId: id, format: "mp4" }),
        poster: await signedUpload({ folder: "animations", publicId: `${id}-poster`, format: "jpg" }),
      });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("animation-studio", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
