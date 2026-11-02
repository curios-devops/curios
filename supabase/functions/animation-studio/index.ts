// Animation (Video page type) — the studio. A model writes the answer as a live stage: a 3D machine
// you can turn and run (three.js) or an animated story (SVG + GSAP) in a motion archetype with its own
// palette (archetypes.ts, prompts.ts). Writing one takes ~20 s (Luna) to minutes (Sol), so it runs in
// OpenAI's background mode: `start` launches it, the page polls `status` until the page is written.
// One animation per question (animations table), so the same question opens at once and is free.
//
// Body { action }:
//   lookup { key }                          → { ready: true, animation } | { ready: false, left }
//   start  { key, question, tier, kind?, lang?, regenerate? } → { status: 'making' } — tier luna|sol|astra (Astra for Pro only);
//          kind 'simulation' asks for a simulation to play with (otherwise a story; the kind of animation is fixed for now,
//          see below). The writer gets the top news and pages (sources.ts) and today's date; a first picture is made
//          alongside and shows while it writes. regenerate (signed in) makes it again, MAX_REGENS times per question.
//          Daily caps: guest 2 per connection (hashed IP), free 5, Pro 20; GLOBAL_CAP overall.
//   status { key }                          → { status: 'making', cover } | { status: 'proof', proof } | { ready: true, animation } | { status: 'failed' }
//   review { key, sheet }                   → the critic (Luna looks at the contact sheet the viewer's browser took of the
//          stage, proof.ts) approves the story, or sends it back once to its writer: { ready: true, animation } | { status: 'making' }.
//          No sheet (the browser couldn't take one): published unreviewed.
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
// import { CLASSIFY } from "./prompts.ts"; (the second decision, see `start`)
import { COVER, CRITIC, FIX, MACHINE, PORTRAIT, SIMULATION, STORY } from "./prompts.ts";
import { direct, stageOf } from "./archetypes.ts";
import { briefing, findSources, type Source } from "./sources.ts";
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
const MAX_REGENS = 2; // a question can be made again this many times, by anyone (it replaces the shared animation)
const REVIEW_MS = 90 * 1000; // a page nobody's browser got to review (the tab closed) goes out unreviewed rather than never
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
  sources: ((r.sources ?? []) as Source[]).map(({ title, url, text }) => ({ title, url, snippet: text })), canRegenerate: Number(r.regens ?? 0) < MAX_REGENS,
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

// The second decision of the cascade: Decisions picks the video type (classify-intent), and when it is an animation
// this one picks which kind (machine, or a story in an archetype). Off while one look is tuned: every animation is a
// Kurzgesagt story (see `start`). To bring it back, uncomment this, the CLASSIFY import and the call in `start`.
//
// /** The archetypes of the last 3 stories (for variety). */
// async function recentArchetypes(): Promise<string[]> {
//   const { data } = await db().from("animations").select("style").eq("kind", "story").not("question_key", "like", "%|portrait")
//     .order("created_at", { ascending: false }).limit(3);
//   return (data ?? []).map((r: { style: string | null }) => String(r.style ?? "").split(":")[0]);
// }
//
// /** Luna picks the technique (a 3D machine or a story) and the story's archetype; direct() settles it. */
// async function classify(question: string, key: string): Promise<{ kind: "machine" | "story"; style: string; direction?: Direction }> {
//   const res = await openai("/responses", {
//     method: "POST",
//     // json_object mode refuses an input without the word "json" (the instructions do not count).
//     body: JSON.stringify({ model: MODELS.luna(), reasoning: { effort: "none" }, instructions: CLASSIFY, input: `Question (reply in json): ${question}`, text: { format: { type: "json_object" } }, max_output_tokens: 200 }),
//     signal: AbortSignal.timeout(15000),
//   }).catch(() => null);
//   if (!res?.ok) console.error("classify failed", res?.status, (await res?.text().catch(() => "") ?? "").slice(0, 300));
//   const data = res?.ok ? await res.json().catch(() => null) : null;
//   const text = data?.output_text ?? (data?.output ?? []).flatMap((o: Record<string, any>) => o.content ?? []).map((c: Record<string, any>) => c.text ?? "").join("");
//   let out: Record<string, unknown> = {};
//   try { out = JSON.parse(text); } catch { /* → story */ }
//   if (out.kind === "machine") return { kind: "machine", style: "3d" };
//   const direction = direct(out, await recentArchetypes(), key);
//   console.log("animation direction", JSON.stringify({ key, ...direction }));
//   return { kind: "story", style: direction.style, direction };
// }

const textOf = (data: Record<string, any>) => String(data.output_text ?? (data.output ?? []).flatMap((o: Record<string, any>) => o.content ?? []).map((c: Record<string, any>) => c.text ?? "").join(""));
const pageOf = (data: Record<string, any>) => {
  const text = textOf(data);
  const m = text.match(/```html\s*\n([\s\S]*?)```/);
  const html = (m ? m[1] : text).trim();
  return /id=["']manifest["']/.test(html) && html.length > 500 ? html : null;
};

/** The first picture (gemini-image: Nano Banana, gpt-image-2 fallback). */
async function makeCover(question: string): Promise<string | null> {
  const res = await fetch(`${env("SUPABASE_URL")}/functions/v1/gemini-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("SUPABASE_ANON_KEY")}` },
    body: JSON.stringify({ prompt: COVER(question), aspectRatio: "16:9", storageBucket: "movie-assets", storagePath: `animations/${crypto.randomUUID()}.png` }),
  }).catch(() => null);
  const data = res?.ok ? await res.json().catch(() => null) : null;
  return typeof data?.url === "string" && data.url.startsWith("http") ? data.url : null;
}

interface Fix { beat?: unknown; problem?: unknown; fix?: unknown }

/** Luna looks at the contact sheet. null: no verdict (the page goes out unreviewed rather than waiting). */
async function critique(sheet: string, html: string): Promise<{ approved: boolean; fixes: Fix[] } | null> {
  const says = (html.match(/"say"\s*:\s*"(?:[^"\\]|\\.)*"/g) ?? []).map((s, i) => `${i + 1}. ${s.replace(/^"say"\s*:\s*/, "")}`).join("\n");
  const res = await openai("/responses", {
    method: "POST",
    body: JSON.stringify({
      model: MODELS.luna(), reasoning: { effort: "none" }, instructions: CRITIC, text: { format: { type: "json_object" } }, max_output_tokens: 900,
      input: [{ role: "user", content: [{ type: "input_text", text: `Narration by beat (reply in json):\n${says}` }, { type: "input_image", image_url: sheet, detail: "high" }] }],
    }),
    signal: AbortSignal.timeout(25000),
  }).catch(() => null);
  if (!res?.ok) { console.error("critic failed", res?.status, (await res?.text().catch(() => "") ?? "").slice(0, 300)); return null; }
  try {
    const out = JSON.parse(textOf(await res.json()));
    return { approved: out.approved === true, fixes: Array.isArray(out.fixes) ? out.fixes.slice(0, 6) : [] };
  } catch { return null; }
}

/** The page goes out: ready for everyone, and its cloud recording starts. */
async function publish(key: string, html: string, review: Record<string, unknown> | null) {
  const { data: saved, error } = await db().from("animations").update({ status: "ready", html, review, updated_at: new Date().toISOString() }).eq("question_key", key).select("*").single();
  if (error) throw error;
  background(requestRender(key));
  return json({ ready: true, animation: toAnimation(saved) });
}

/** The written page, for the viewer's browser to take the critic's contact sheet. */
const proofOf = (html: string, style: unknown) => json({ status: "proof", proof: { html, stage: stageOf(style) } });

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
      const regenerate = body.regenerate === true;
      if (regenerate) {
        if (!uid) return json({ error: "sign_in_required" }, 429);
        if (Number(row?.regens ?? 0) >= MAX_REGENS) return json({ error: "regen_limit" }, 429);
      } else {
        if (row?.status === "ready") return json({ ready: true, animation: toAnimation(row) });
        if (row?.status === "making" && !stale) return json({ status: "making" });
      }
      const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
      if (!question) return json({ error: "question required" }, 400);
      if (await left(req, uid) <= 0) return json({ error: uid ? "daily_limit" : "sign_in_required" }, 429);
      const story = body.kind !== "simulation";
      // A story is Luna's whatever the question: 20 s instead of 1-8 minutes with Sol, for half a cent, and good with sources.
      const tier = story || body.tier === "luna" ? "luna" : body.tier === "astra" && await isPro(uid) ? "astra" : "sol";
      // The second decision of the cascade is off (see above): every animation is a Kurzgesagt story.
      // const { kind, style, direction } = body.kind === "simulation" ? { kind: "simulation", style: "sim", direction: undefined } : await classify(question, key);
      const direction = story ? direct({ archetype: "kurzgesagt", confidence: 100 }, [], key) : undefined;
      const kind = (story ? "story" : "simulation") as "story" | "machine" | "simulation", style = direction?.style ?? "sim";
      const cover = story ? makeCover(question) : null; // already painting while the writer starts
      const sources = story ? await findSources(question, env("TAVILY_API_KEY")) : [];
      // The viewer's chosen (or browser) language, for a question that shows none of its own.
      const lang = typeof body.lang === "string" && /^[a-z]{2,3}(-[A-Za-z]{2})?$/.test(body.lang) ? body.lang : "en";
      // Low reasoning: as good a page as medium, a third sooner.
      const effort = tier === "luna" ? "none" : "low";
      const started = await openai("/responses", {
        method: "POST",
        body: JSON.stringify({
          model: MODELS[tier](), reasoning: { effort }, instructions: `${kind === "simulation" ? SIMULATION : kind === "machine" ? MACHINE : STORY(direction!.archetype, direction!.palette)}
LANGUAGE: the question's own; when it shows none clearly (a name, a single word, a link), the language with code "${lang}".
TODAY: ${new Date().toISOString().slice(0, 10)}.`,
          input: briefing(question, sources), background: true, store: true, max_output_tokens: 48000, service_tier: TIER(),
        }),
      });
      const job = await started.json().catch(() => null);
      if (!started.ok || !job?.id) { console.error("openai start", started.status, JSON.stringify(job).slice(0, 300)); return json({ error: "start_failed" }, 502); }
      const fields = {
        question_key: key, question, kind, style, model: MODELS[tier](), status: "making", response_id: job.id, html: null,
        user_id: uid, creator_ip_hash: uid ? null : await ipHash(req), created_at: new Date().toISOString(),
        sources, review: null, regens: Number(row?.regens ?? 0) + (regenerate ? 1 : 0),
        video_url: null, poster_url: null, render_status: null, render_requested_at: null, rendered_at: null,
      };
      const { error } = await db().from("animations").upsert(fields, { onConflict: "question_key" });
      if (error) throw error;
      if (regenerate) {
        // The old page's job, its portrait version and this viewer's copy of its video go; other viewers keep the movie they saved.
        if (row?.status === "making" && row.response_id) void openai(`/responses/${row.response_id}/cancel`, { method: "POST" }).catch(() => undefined);
        await db().from("animations").delete().eq("question_key", `${key}|portrait`);
        await db().from("movie_projects").update({ full_video_url: null, thumbnail_url: null, status: "rendering" }).eq("animation_key", key).eq("user_id", uid);
      }
      if (cover) background(cover.then((url) => (url ? db().from("animations").update({ poster_url: url }).eq("question_key", key).eq("response_id", job.id) : null)));
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
      const making = { status: "making", cover: row.poster_url ?? null };
      if (row.review?.state === "proof" || row.review?.state === "reviewing") {
        if (Date.now() - Number(row.review.at) > REVIEW_MS) return publish(key, row.html, { state: "unreviewed" });
        return row.review.state === "proof" ? proofOf(row.html, row.style) : json(making);
      }
      const res = await openai(`/responses/${row.response_id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) return json(making); // a hiccup: ask again
      if (data.status === "queued" || data.status === "in_progress") return json(making);
      const html = data.status === "completed" ? pageOf(data) : null;
      // The writer's fixes go out as they are (one round, to stay in time); if they failed, the page the critic saw does.
      if (row.review?.state === "fixing") return publish(key, html ?? row.html, { ...row.review, state: html ? "fixed" : "fix_failed" });
      if (!html) {
        console.error("animation failed", data.status, data.incomplete_details ?? data.error ?? "no page");
        await db().from("animations").delete().eq("question_key", key); // the next visit can try again
        return json({ status: "failed" });
      }
      // Stories go past the critic first; 3D machines and simulations aren't shot well by the contact sheet.
      if (row.kind !== "story" || key.endsWith("|portrait")) return publish(key, html, null);
      const { error } = await db().from("animations").update({ html, review: { state: "proof", at: Date.now() } }).eq("question_key", key);
      if (error) throw error;
      return proofOf(html, row.style);
    }

    if (body.action === "review") {
      if (row?.status === "ready") return json({ ready: true, animation: toAnimation(row) });
      // One viewer's browser reviews it; any other just keeps waiting.
      const { data: mine } = await db().from("animations").update({ review: { state: "reviewing", at: Date.now() } }).eq("question_key", key).eq("review->>state", "proof").select("question_key");
      if (!mine?.length) return json({ status: "making" });
      const sheet = typeof body.sheet === "string" && body.sheet.startsWith("data:image/jpeg;base64,") && body.sheet.length < 3e6 ? body.sheet : null;
      const verdict = sheet ? await critique(sheet, row.html) : null;
      console.log("animation review", JSON.stringify({ key, verdict }));
      if (!verdict) return publish(key, row.html, { state: "unreviewed" });
      if (verdict.approved || !verdict.fixes.length) return publish(key, row.html, { state: "approved" });
      const started = await openai("/responses", {
        method: "POST",
        body: JSON.stringify({
          model: row.model, reasoning: { effort: "low" }, previous_response_id: row.response_id, instructions: FIX, input: JSON.stringify(verdict.fixes),
          background: true, store: true, max_output_tokens: 48000, service_tier: TIER(),
        }),
      });
      const job = await started.json().catch(() => null);
      if (!started.ok || !job?.id) {
        console.error("openai fix", started.status, JSON.stringify(job).slice(0, 300));
        return publish(key, row.html, { state: "fix_failed", fixes: verdict.fixes });
      }
      await db().from("animations").update({ response_id: job.id, review: { state: "fixing", fixes: verdict.fixes } }).eq("question_key", key);
      return json({ status: "making" });
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
