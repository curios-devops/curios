// Animation (Video page type) — the studio. A model writes the answer as a live stage: a 3D machine
// you can turn and run (three.js) or an animated story (SVG + GSAP) in a motion archetype with its own
// palette (archetypes.ts, prompts.ts). It runs in OpenAI's background mode (Luna, Sol or Astra, _shared/models.ts): `start`
// launches it, the page polls `status` until the page is written. If OpenAI fails, Claude (Haiku, Sonnet or Opus)
// writes it inside this function's background task.
// One animation per question (animations table), so the same question opens at once and is free.
//
// Body { action }:
//   lookup { key }                          → { ready: true, animation } | { ready: false, left }
//   start  { key, question, tier, kind?, lang?, regenerate? } → { status: 'making', preview? } — tier luna|sol|astra (Astra for Pro only);
//          kind 'simulation' asks for a simulation to play with (otherwise a story; the kind of animation is fixed for now,
//          see below). A story is a film in chapters (chapters.ts): the director plans it with the top news and pages
//          (sources.ts) and today's date, and its preview goes back at once; the first chapter is then made in the
//          background. regenerate (signed in) makes it again, MAX_REGENS times per question.
//   chapter { key, i }                      → { cover, seconds, code, done }: chapter i, made the first time anyone asks.
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
import { CRITIC, FIX, MACHINE, PORTRAIT, SIMULATION, STORY } from "./prompts.ts";
import { direct, stageOf } from "./archetypes.ts";
import { briefing, findSources, type Source } from "./sources.ts";
import { askClaude, imageBlock, imageUrlBlock } from "./claude.ts";
import { chapterSeconds, codeFrom, COVER_STYLE, DIRECTOR, pageFor, planFrom, WRITER, type Plan } from "./chapters.ts";
import { signedUpload } from "../_shared/cloudinary.ts";
import { modelsFrom, tierOf, type Tier } from "../_shared/models.ts";
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
const models = () => modelsFrom(env);
const CLAUDE_MS = 120 * 1000; // past this the edge function could be stopped: Claude's fallback is given up

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
  sources: sourcesOf(r), canRegenerate: Number(r.regens ?? 0) < MAX_REGENS,
  chapters: (r.plan as Plan | null)?.chapters.map((c) => ({ cover: c.cover ?? null, made: c.code !== undefined })) ?? null,
});
const sourcesOf = (r: Record<string, unknown>) => ((r.sources ?? []) as Source[]).map(({ title, url, text }) => ({ title, url, snippet: text }));
/** A film can be recorded once all its chapters exist: they are made as viewers ask for them. */
const recordable = (r: Record<string, any>) => !r.plan || (r.plan as Plan).chapters.every((c) => c.code !== undefined);

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
const pageOf = (data: Record<string, any>) => pageFrom(textOf(data));
const pageFrom = (text: string) => {
  const m = text.match(/```html\s*\n([\s\S]*?)```/);
  const html = (m ? m[1] : text).trim();
  return /id=["']manifest["']/.test(html) && html.length > 500 ? html : null;
};

/** OpenAI's background job for a page; its id, or null if it wouldn't start. */
async function openaiJob(tier: Tier, instructions: string, input: string): Promise<string | null> {
  const started = await openai("/responses", {
    method: "POST",
    // Low reasoning: as good a page as medium, a third sooner.
    body: JSON.stringify({ model: models().openai(tier), reasoning: { effort: tier === "luna" ? "none" : "low" }, instructions, input, background: true, store: true, max_output_tokens: 48000, service_tier: TIER() }),
  });
  const job = await started.json().catch(() => null);
  if (!started.ok || !job?.id) console.error("openai start", started.status, JSON.stringify(job).slice(0, 300));
  return started.ok ? job?.id ?? null : null;
}

const claudeId = () => `claude:${crypto.randomUUID()}`;

/** The writer of a page: its model and the id the row keeps, and go() to launch it once the row is saved. */
async function writer(tier: Tier, instructions: string, input: string) {
  const job = await openaiJob(tier, instructions, input);
  if (job) return { model: models().openai(tier), id: job, go: (_key: string) => undefined };
  const claude = models().claude(tier);
  if (!claude) return null;
  const id = claudeId();
  return { model: claude, id, go: (key: string) => background(claudeWrites(key, id, claude, instructions, input)) };
}

/** Claude writes the page here, in the background; the page's `status` just waits. */
async function claudeWrites(key: string, id: string, model: string, instructions: string, input: string) {
  const current = async () => (await db().from("animations").select("*").eq("question_key", key).eq("response_id", id).maybeSingle()).data; // null: regenerated meanwhile
  const text = await askClaude({ apiKey: env("CLAUDE_API_KEY"), model, system: instructions, content: input, maxTokens: 32000, signal: AbortSignal.timeout(CLAUDE_MS) }).catch((e) => { console.error("claude writer", model, e); return ""; });
  const row = await current();
  if (row) await written(key, row, pageFrom(text));
}

/** An OpenAI job failed: Claude takes over with the same brief, if it can. */
async function claudeTakesOver(key: string, row: Record<string, any>, data: Record<string, any>) {
  const model = models().claude(tierOf(row.model));
  const items = model ? await openai(`/responses/${row.response_id}/input_items`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
  const input = items ? textOf({ output: items.data }) : "";
  if (!model || !input || !data.instructions) return written(key, row, null);
  const id = claudeId();
  const { data: mine } = await db().from("animations").update({ response_id: id, model }).eq("question_key", key).eq("response_id", row.response_id).select("question_key");
  if (mine?.length) background(claudeWrites(key, id, model, data.instructions, input));
  return json({ status: "making", cover: row.poster_url ?? null });
}

/** A writer finished. The critic's fixes go out as they are (one round, to stay in time; if they failed, the page the
 *  critic saw does); a story goes past the critic first; 3D machines and simulations aren't shot well by the contact sheet. */
async function written(key: string, row: Record<string, any>, html: string | null) {
  if (row.review?.state === "fixing") return publish(key, html ?? row.html, { ...row.review, state: html ? "fixed" : "fix_failed" });
  if (!html) {
    await db().from("animations").delete().eq("question_key", key); // the next visit can try again
    return json({ status: "failed" });
  }
  if (row.kind !== "story" || key.endsWith("|portrait")) return publish(key, html, null);
  const { error } = await db().from("animations").update({ html, review: { state: "proof", at: Date.now() } }).eq("question_key", key);
  if (error) throw error;
  return proofOf(html, row.style);
}

/** A chapter's cover, which is its first frame (gemini-image: Pruna, OpenAI fallback). */
async function paint(scene: string): Promise<string | null> {
  const res = await fetch(`${env("SUPABASE_URL")}/functions/v1/gemini-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("SUPABASE_ANON_KEY")}` },
    body: JSON.stringify({ prompt: `${scene}\n${COVER_STYLE}`, engine: "pruna", aspectRatio: "16:9", storageBucket: "movie-assets", storagePath: `animations/${crypto.randomUUID()}.png` }),
  }).catch(() => null);
  const data = res?.ok ? await res.json().catch(() => null) : null;
  return typeof data?.url === "string" && data.url.startsWith("http") ? data.url : null;
}

/** A quick answer that must pass `read`: Luna, then Haiku. */
async function quick<T>(o: { system: string; text: string; image?: string; effort: "none" | "low"; json?: boolean }, read: (answer: string) => T | null): Promise<T | null> {
  const res = await openai("/responses", {
    method: "POST",
    body: JSON.stringify({
      model: models().openai("luna"), reasoning: { effort: o.effort }, instructions: o.system, max_output_tokens: 4000, service_tier: TIER(),
      input: o.image ? [{ role: "user", content: [{ type: "input_text", text: o.text }, { type: "input_image", image_url: o.image, detail: "low" }] }] : o.text,
      ...(o.json ? { text: { format: { type: "json_object" } } } : {}),
    }),
    signal: AbortSignal.timeout(30000),
  }).catch(() => null);
  if (!res?.ok) console.error("luna", res?.status, (await res?.text().catch(() => "") ?? "").slice(0, 200));
  const good = res?.ok ? read(textOf(await res.json().catch(() => ({})))) : null;
  const claude = models().claude("luna");
  if (good || !claude) return good;
  const content = o.image ? [imageUrlBlock(o.image), { type: "text" as const, text: o.text }] : o.text;
  const answer = await askClaude({ apiKey: env("CLAUDE_API_KEY"), model: claude, system: o.system, content, maxTokens: 4000, signal: AbortSignal.timeout(30000) }).catch((e) => { console.error("claude", e); return ""; });
  return read(answer);
}

/** Makes chapter i of the film `id`: cover first, so it shows, then its code. The film being regenerated stops it. */
const COVERS_WAIT_MS = 4000; // past the first chapter's code, the film doesn't wait for the rail

async function makeChapter(key: string, id: string, i: number) {
  const read = async () => (await db().from("animations").select("plan").eq("question_key", key).eq("response_id", id).maybeSingle()).data as { plan: Plan } | null;
  // Read again just before writing: another chapter may have landed meanwhile.
  const save = async (change: Partial<Plan["chapters"][number]>, more: Record<string, unknown> = {}, nextCovers: (string | null)[] = []) => {
    const row = await read();
    if (!row) return null;
    row.plan.chapters[i] = { ...row.plan.chapters[i], ...change };
    nextCovers.forEach((cover, k) => { if (cover) row.plan.chapters[k + 1].cover = cover; });
    await db().from("animations").update({ plan: row.plan, html: pageFor(row.plan), ...more }).eq("question_key", key).eq("response_id", id);
    return row.plan;
  };
  const row = await read();
  if (!row) return;
  const c = row.plan.chapters[i];
  // The other covers are painted with the first, for the chapter rail; their code waits for the viewer.
  const nextCovers = i === 0 ? Promise.all(row.plan.chapters.slice(1).map((x) => paint(x.scene))) : null;
  const cover = c.cover ?? await paint(c.scene);
  if (!cover) {
    console.error("no cover", key, i);
    if (i === 0) await db().from("animations").delete().eq("question_key", key).eq("response_id", id); // the next visit can try again
    else await save({ started: 0 });
    return;
  }
  await save({ cover }, i === 0 ? { poster_url: cover } : {});
  const code = await quick({ system: WRITER, text: `Narration: ${c.say}\nSeconds: ${chapterSeconds(c.say)}`, image: cover, effort: "low" }, codeFrom);
  // A cover late for this is painted when its chapter is asked for.
  const painted = nextCovers ? await Promise.race([nextCovers, new Promise<null[]>((r) => setTimeout(() => r([]), COVERS_WAIT_MS))]) : [];
  const plan = await save({ code: code ?? "" }, i === 0 ? { status: "ready", updated_at: new Date().toISOString() } : {}, painted); // no code: it stays a moving cover
  if (plan?.chapters.every((x) => x.code !== undefined)) await requestRender(key);
}

interface Fix { beat?: unknown; problem?: unknown; fix?: unknown }

/** The fast model (Luna, else Haiku) looks at the contact sheet. null: no verdict (the page goes out unreviewed rather than waiting). */
async function critique(sheet: string, html: string): Promise<{ approved: boolean; fixes: Fix[] } | null> {
  const says = (html.match(/"say"\s*:\s*"(?:[^"\\]|\\.)*"/g) ?? []).map((s, i) => `${i + 1}. ${s.replace(/^"say"\s*:\s*/, "")}`).join("\n");
  const text = `Narration by beat (reply in json):\n${says}`;
  const claude = models().claude("luna");
  const answer = await lunaLooks(sheet, text) ?? (claude ? await askClaude({ apiKey: env("CLAUDE_API_KEY"), model: claude, system: CRITIC, content: [imageBlock(sheet), { type: "text", text }], maxTokens: 1500, signal: AbortSignal.timeout(25000) }).catch((e) => { console.error("claude critic", e); return null; }) : null);
  try {
    const out = JSON.parse((answer ?? "").match(/\{[\s\S]*\}/)?.[0] ?? "");
    return { approved: out.approved === true, fixes: Array.isArray(out.fixes) ? out.fixes.slice(0, 6) : [] };
  } catch { return null; }
}

async function lunaLooks(sheet: string, text: string): Promise<string | null> {
  const res = await openai("/responses", {
    method: "POST",
    body: JSON.stringify({
      model: models().openai("luna"), reasoning: { effort: "none" }, instructions: CRITIC, text: { format: { type: "json_object" } }, max_output_tokens: 900,
      input: [{ role: "user", content: [{ type: "input_text", text }, { type: "input_image", image_url: sheet, detail: "high" }] }],
    }),
    signal: AbortSignal.timeout(25000),
  }).catch(() => null);
  if (!res?.ok) { console.error("critic failed", res?.status, (await res?.text().catch(() => "") ?? "").slice(0, 300)); return null; }
  return textOf(await res.json());
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
      if (row?.status === "ready" && (!row.render_status || retry) && recordable(row)) background(requestRender(key));
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
      // A story goes to the fast tier whatever the question: seconds instead of 1-8 minutes.
      const tier: Tier = story || body.tier === "luna" ? "luna" : body.tier === "astra" && await isPro(uid) ? "astra" : "sol";
      // The second decision of the cascade is off (see above): every animation is a Kurzgesagt story.
      // const { kind, style, direction } = body.kind === "simulation" ? { kind: "simulation", style: "sim", direction: undefined } : await classify(question, key);
      const direction = story ? direct({ archetype: "kurzgesagt", confidence: 100 }, [], key) : undefined;
      const kind = (story ? "story" : "simulation") as "story" | "machine" | "simulation", style = direction?.style ?? "sim";
      const sources = story ? await findSources(question, { exa: env("EXA_API_KEY"), brave: env("BRAVE_API_KEY") }) : [];
      // The viewer's chosen (or browser) language, for a question that shows none of its own.
      const lang = typeof body.lang === "string" && /^[a-z]{2,3}(-[A-Za-z]{2})?$/.test(body.lang) ? body.lang : "en";
      const reset = {
        sources, review: null, regens: Number(row?.regens ?? 0) + (regenerate ? 1 : 0),
        video_url: null, poster_url: null, render_status: null, render_requested_at: null, rendered_at: null,
        user_id: uid, creator_ip_hash: uid ? null : await ipHash(req), created_at: new Date().toISOString(),
      };
      const forget = async () => {
        // The old page's job, its portrait version and this viewer's copy of its video go; other viewers keep the movie they saved.
        if (!regenerate) return;
        if (row?.status === "making" && String(row.response_id).startsWith("resp")) void openai(`/responses/${row.response_id}/cancel`, { method: "POST" }).catch(() => undefined);
        await db().from("animations").delete().eq("question_key", `${key}|portrait`);
        await db().from("movie_projects").update({ full_video_url: null, thumbnail_url: null, status: "rendering" }).eq("animation_key", key).eq("user_id", uid);
      };
      if (story) {
        const plan = await quick({
          system: DIRECTOR, effort: "none", json: true,
          text: `${briefing(question, sources)}\n\nLANGUAGE: the question's own; when it shows none clearly, the language with code "${lang}". TODAY: ${new Date().toISOString().slice(0, 10)}. Reply in json.`,
        }, planFrom);
        if (!plan) return json({ error: "start_failed" }, 502);
        const id = `chapters:${crypto.randomUUID()}`;
        const { error } = await db().from("animations").upsert({ question_key: key, question, kind, style, model: models().openai("luna"), status: "making", response_id: id, html: null, plan, ...reset }, { onConflict: "question_key" });
        if (error) throw error;
        await forget();
        background(makeChapter(key, id, 0));
        return json({ status: "making", kind, style, preview: { ...plan, chapters: plan.chapters.map(({ label }) => ({ label })), sources: sources.map(({ title, url, text }) => ({ title, url, snippet: text })) } });
      }
      const page = await writer(tier, `${kind === "simulation" ? SIMULATION : kind === "machine" ? MACHINE : STORY(direction!.archetype, direction!.palette)}
LANGUAGE: the question's own; when it shows none clearly (a name, a single word, a link), the language with code "${lang}".
TODAY: ${new Date().toISOString().slice(0, 10)}.`, briefing(question, sources));
      if (!page) return json({ error: "start_failed" }, 502);
      const { error } = await db().from("animations").upsert({ question_key: key, question, kind, style, model: page.model, status: "making", response_id: page.id, html: null, plan: null, ...reset }, { onConflict: "question_key" });
      if (error) throw error;
      page.go(key);
      await forget();
      return json({ status: "making", kind, style });
    }

    if (body.action === "chapter") {
      const c = (row?.plan as Plan | null)?.chapters?.[Number(body.i)];
      if (!c) return json({ error: "no_chapter" }, 400);
      if (c.code === undefined && Date.now() - Number(c.started ?? 0) > 60 * 1000) {
        c.started = Date.now();
        await db().from("animations").update({ plan: row.plan }).eq("question_key", key).eq("response_id", row.response_id);
        background(makeChapter(key, row.response_id, Number(body.i)));
      }
      return json({ cover: c.cover ?? null, seconds: chapterSeconds(c.say), code: c.code ?? null, done: c.code !== undefined });
    }

    if (body.action === "portrait") {
      if (row?.status === "ready") return json({ ready: true, animation: toAnimation(row) });
      if (row?.status === "making" && !stale) return json({ status: "making" });
      if (!key.endsWith("|portrait")) return json({ error: "portrait key required" }, 400);
      const { data: base } = await db().from("animations").select("*").eq("question_key", key.slice(0, -"|portrait".length)).maybeSingle();
      if (base?.status !== "ready" || !base.html) return json({ error: "not_ready" }, 400);
      const page = await writer(tierOf(base.model), PORTRAIT, base.html);
      if (!page) return json({ error: "start_failed" }, 502);
      const { error } = await db().from("animations").upsert({
        question_key: key, question: base.question, kind: base.kind, style: base.style, model: page.model, status: "making",
        response_id: page.id, html: null, user_id: uid, creator_ip_hash: uid ? null : await ipHash(req), created_at: new Date().toISOString(),
      }, { onConflict: "question_key" });
      if (error) throw error;
      page.go(key);
      return json({ status: "making" });
    }

    if (body.action === "status") {
      if (!row) return json({ status: "failed" });
      if (row.status === "ready") return json({ ready: true, animation: toAnimation(row) });
      if (stale || row.status === "failed") return json({ status: "failed" });
      const making = { status: "making", cover: row.poster_url ?? null };
      if (String(row.response_id).startsWith("chapters:")) return json(making); // makeChapter reports
      if (row.review?.state === "proof" || row.review?.state === "reviewing") {
        if (Date.now() - Number(row.review.at) > REVIEW_MS) return publish(key, row.html, { state: "unreviewed" });
        return row.review.state === "proof" ? proofOf(row.html, row.style) : json(making);
      }
      if (String(row.response_id).startsWith("claude:")) return json(making); // Claude took over: claudeWrites reports
      const res = await openai(`/responses/${row.response_id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) return json(making); // a hiccup: ask again
      if (data.status === "queued" || data.status === "in_progress") return json(making);
      const html = data.status === "completed" ? pageOf(data) : null;
      if (html) return written(key, row, html);
      console.error("animation failed", data.status, data.incomplete_details ?? data.error ?? "no page");
      return claudeTakesOver(key, row, data);
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
      const page = await writer(tierOf(row.model), FIX, `${row.html}\n\nFIXES:\n${JSON.stringify(verdict.fixes)}`);
      if (!page) return publish(key, row.html, { state: "fix_failed", fixes: verdict.fixes });
      await db().from("animations").update({ response_id: page.id, model: page.model, review: { state: "fixing", fixes: verdict.fixes } }).eq("question_key", key);
      page.go(key);
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
