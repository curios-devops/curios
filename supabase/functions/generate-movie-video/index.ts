// Movie Mode — LTX image-to-video edge function.
//
// PRIMARY: self-hosted LTX-2 19B distilled (audio+video) on RunPod Serverless — ASYNC.
// A warm render takes ~4 min, far beyond the synchronous response window, so this function
// creates a `video_jobs` row, submits the RunPod job with a webhook back to itself, and
// returns { jobId, async: true } immediately. When RunPod finishes it calls the webhook;
// we re-fetch the result from RunPod (never trusting the webhook payload), upload the mp4
// to Storage, and mark the row ready. The client polls the row (see RunPodLTXProvider).
//
// FALLBACK: Wavespeed hosted ltx-2-fast — synchronous (it answers in ~1-2 min). Used when
// RunPod isn't configured, or when the client retries with forceBackend:"wavespeed" after
// a failed/timed-out RunPod job.
//
// Also accepts { warmup: true } — the app pings this when a user opens Movie mode so the
// RunPod worker cold-starts while the storyboard is being written; the endpoint's idle
// timeout (5 min) puts it back to sleep → zero idle GPU cost.
//
// Deployed with --no-verify-jwt so RunPod's webhook can reach us; client branches manually
// require an Authorization header instead, and the webhook branch authenticates by row id +
// matching RunPod job id + re-fetching the result with our own API key.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Body = {
  warmup?: boolean;
  imageUrl?: string;
  prompt?: string;
  duration?: number;
  generateAudio?: boolean;
  seed?: number;
  userId?: string;
  projectId?: string;
  sceneId?: string;
  executeModelCall?: boolean;
  /** "wavespeed" forces the sync fallback (client retry after a RunPod job failure). */
  forceBackend?: string;
};

const BUCKET = "movie-assets";
const WAVESPEED_ENDPOINT =
  "https://api.wavespeed.ai/api/v3/lightricks/ltx-2-fast/image-to-video";

const RUNPOD_API_KEY = Deno.env.get("RUNPOD_API_KEY");
const RUNPOD_ENDPOINT_ID = Deno.env.get("RUNPOD_ENDPOINT_ID");
const runpodConfigured = Boolean(RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID);
const RUNPOD_BASE = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`;
// Hard cap on a single RunPod job so an abandoned/stuck render can't bill forever.
const RUNPOD_JOB_TIMEOUT_MS = Number(Deno.env.get("RUNPOD_JOB_TIMEOUT_MS") || 600000);
// Queued jobs expire after this — if no worker picks it up (capacity crunch), the client
// has long since fallen back to Wavespeed; don't let a stale job grab a GPU later.
const RUNPOD_JOB_TTL_MS = Number(Deno.env.get("RUNPOD_JOB_TTL_MS") || 480000);

// Users see this instead of raw upstream errors (e.g. "Insufficient credits") —
// provider/billing details are an internal matter; full details go to the function logs.
const FRIENDLY_ERROR =
  "Video generation is temporarily unavailable — please try again in a few minutes.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const runpodHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${RUNPOD_API_KEY}`,
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function uploadVideo(
  bytes: Uint8Array,
  userId?: string | null,
  projectId?: string | null,
  sceneId?: string | null,
): Promise<string> {
  const db = admin();
  const storagePath = `${userId || "guest"}/${projectId || "adhoc"}/${sceneId || crypto.randomUUID()}.mp4`;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: "video/mp4", upsert: true });
  if (error) throw new Error(`upload failed: ${error.message}`);
  return db.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// ── RunPod async path ───────────────────────────────────────────────────────────
// True only when RunPod can PICK THE JOB UP PROMPTLY — otherwise the caller serves the
// user on Wavespeed (hosted, synchronous) instead of letting the job wait in line.
// We serve on RunPod (cheap self-hosted) when:
//   • a worker is idle/ready        → instant pickup, or
//   • a worker is initializing      → booting (e.g. our warmup ping); picked up shortly, or
//   • the endpoint is fully cold     → FlashBoot cold start from zero (fast now).
// We fall back to Wavespeed when the job would QUEUE:
//   • every worker is busy (running) with none free, or
//   • there's already a queue backlog (jobs.inQueue > 0), or
//   • the throttle stall (all candidate hosts throttled, nothing of ours active).
async function runpodHasCapacity(): Promise<boolean> {
  try {
    const res = await fetch(`${RUNPOD_BASE}/health`, { headers: runpodHeaders });
    const h = await res.json();
    const w = h?.workers ?? {};
    const j = h?.jobs ?? {};

    // A backlog means new jobs wait — serve the user immediately on Wavespeed instead.
    if ((j.inQueue ?? 0) > 0) {
      console.error("RunPod busy (queue backlog) — falling back to Wavespeed");
      return false;
    }

    const availableNow = (w.idle ?? 0) + (w.ready ?? 0) > 0;
    const booting = (w.initializing ?? 0) > 0;
    const anyWorker =
      (w.idle ?? 0) + (w.ready ?? 0) + (w.running ?? 0) + (w.initializing ?? 0) + (w.throttled ?? 0) > 0;
    const cold = !anyWorker; // scaled to zero → FlashBoot cold start

    if (availableNow || booting || cold) return true;

    // Workers exist but all are busy/throttled and none can take the job now → queue.
    console.error("RunPod busy (all workers occupied/throttled) — falling back to Wavespeed");
    return false;
  } catch (err) {
    console.error("RunPod health check failed", String(err));
    return false;
  }
}

// Create a job row + submit to RunPod with a webhook; respond immediately.
// Returns null when RunPod can't take the job — the caller falls back to Wavespeed.
async function startRunPodJob(body: Body): Promise<Response | null> {
  if (!(await runpodHasCapacity())) {
    console.error("RunPod capacity stall (all workers throttled) — falling back to Wavespeed");
    return null;
  }
  const db = admin();
  const { data: row, error } = await db
    .from("video_jobs")
    .insert({
      user_id: body.userId ?? null,
      project_id: body.projectId ?? null,
      scene_id: body.sceneId ?? null,
      status: "processing",
    })
    .select("id")
    .single();
  if (error || !row) {
    console.error("video_jobs insert failed", error?.message);
    return null; // let Wavespeed carry it
  }
  const rowId = row.id as string;

  const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-movie-video?job=${rowId}`;
  try {
    const submit = await fetch(`${RUNPOD_BASE}/run`, {
      method: "POST",
      headers: runpodHeaders,
      body: JSON.stringify({
        input: {
          image_url: body.imageUrl,
          prompt: body.prompt,
          duration: body.duration,
          ...(typeof body.seed === "number" ? { seed: body.seed } : {}),
        },
        webhook: webhookUrl,
        policy: { executionTimeout: RUNPOD_JOB_TIMEOUT_MS, ttl: RUNPOD_JOB_TTL_MS },
      }),
    });
    const submitBody = await submit.json().catch(() => null);
    if (!submit.ok || !submitBody?.id) {
      console.error("RunPod submit failed", submit.status, JSON.stringify(submitBody).slice(0, 300));
      await db.from("video_jobs").update({ status: "error", error: "runpod submit failed", updated_at: new Date().toISOString() }).eq("id", rowId);
      return null; // let Wavespeed carry it
    }
    await db.from("video_jobs").update({ runpod_job_id: submitBody.id, updated_at: new Date().toISOString() }).eq("id", rowId);
    return json({ jobId: rowId, async: true, backend: "runpod" }, 202);
  } catch (err) {
    console.error("RunPod submit threw", String(err));
    await db.from("video_jobs").update({ status: "error", error: "runpod submit failed", updated_at: new Date().toISOString() }).eq("id", rowId);
    return null; // let Wavespeed carry it
  }
}

// Webhook from RunPod when the job finishes. Auth: unguessable row id in the URL, the
// payload's job id must match the row, and we re-fetch the result with our own API key.
async function handleWebhook(rowId: string, req: Request): Promise<Response> {
  const payload = await req.json().catch(() => null);
  const runpodJobId = payload?.id as string | undefined;

  const db = admin();
  const { data: row } = await db.from("video_jobs").select("*").eq("id", rowId).maybeSingle();
  if (!row) return json({ error: "unknown job" }, 404);
  if (row.status !== "processing") return json({ ok: true }); // duplicate webhook — idempotent
  if (!runpodJobId || runpodJobId !== row.runpod_job_id) {
    console.error("webhook job mismatch", { rowId, runpodJobId });
    return json({ error: "job mismatch" }, 403);
  }

  const fail = async (msg: string) => {
    console.error("runpod job failed", { rowId, msg: msg.slice(0, 300) });
    await db.from("video_jobs").update({ status: "error", error: msg.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", rowId);
    return json({ ok: true });
  };

  try {
    const res = await fetch(`${RUNPOD_BASE}/status/${runpodJobId}`, { headers: runpodHeaders });
    const status = await res.json().catch(() => null);
    if (status?.status !== "COMPLETED") return await fail(`runpod status ${status?.status}`);
    const b64 = status?.output?.video_base64;
    if (typeof b64 !== "string" || !b64) return await fail(status?.output?.error || "no video in output");

    const videoUrl = await uploadVideo(base64ToBytes(b64), row.user_id, row.project_id, row.scene_id);
    await db.from("video_jobs").update({ status: "ready", video_url: videoUrl, updated_at: new Date().toISOString() }).eq("id", rowId);
    return json({ ok: true, videoUrl });
  } catch (err) {
    return await fail(String(err));
  }
}

// ── Wavespeed (sync fallback) ───────────────────────────────────────────────────
function extractVideoUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const fromOutputs = (val: unknown): string | null =>
    Array.isArray(val) && val.length > 0 && typeof val[0] === "string" ? (val[0] as string) : null;

  if (typeof record.videoUrl === "string" && record.videoUrl) return record.videoUrl;
  const direct = fromOutputs(record.outputs);
  if (direct) return direct;

  const data = record.data;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    if (typeof nested.videoUrl === "string" && nested.videoUrl) return nested.videoUrl;
    const nestedOut = fromOutputs(nested.outputs);
    if (nestedOut) return nestedOut;
  }
  return null;
}

function getStatusAndPollUrl(payload: unknown): { status?: string; pollUrl?: string } {
  if (!payload || typeof payload !== "object") return {};
  const data = (payload as Record<string, unknown>).data;
  if (!data || typeof data !== "object") return {};
  const d = data as Record<string, unknown>;
  const status = typeof d.status === "string" ? d.status : undefined;
  const urls = d.urls as Record<string, unknown> | undefined;
  const pollUrl = urls && typeof urls.get === "string" ? (urls.get as string) : undefined;
  return { status, pollUrl };
}

async function runWavespeed(body: Body, duration: number): Promise<Response> {
  const apiKey = Deno.env.get("WAVESPEED_API_KEY");
  if (!apiKey) {
    return json({ error: "WAVESPEED_API_KEY is required when executeModelCall=true" }, 500);
  }

  // LTX-2 image-to-video has no external-audio input — it can only synthesize its
  // own track via generate_audio. We enable it so each swipe video has sound.
  const requestPayload = {
    image: body.imageUrl,
    prompt: body.prompt,
    duration,
    generate_audio: body.generateAudio ?? false,
    ...(typeof body.seed === "number" ? { seed: body.seed } : {}),
  };

  let submitBody: unknown;
  try {
    const upstream = await fetch(WAVESPEED_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(requestPayload),
    });
    const text = await upstream.text();
    try {
      submitBody = JSON.parse(text);
    } catch {
      submitBody = text;
    }
    if (!upstream.ok) {
      console.error("Wavespeed submit failed", upstream.status, JSON.stringify(submitBody).slice(0, 500));
      return json({ error: FRIENDLY_ERROR }, 502);
    }
  } catch (err) {
    console.error("Wavespeed request failed", String(err));
    return json({ error: FRIENDLY_ERROR }, 502);
  }

  let videoUrl = extractVideoUrl(submitBody);
  if (!videoUrl) {
    const { pollUrl } = getStatusAndPollUrl(submitBody);
    if (!pollUrl) {
      console.error("Wavespeed returned no result URL", JSON.stringify(submitBody).slice(0, 500));
      return json({ error: FRIENDLY_ERROR }, 502);
    }
    // LTX-2-fast typically finishes in seconds; budget ~120s of polling to be safe.
    for (let i = 0; i < 60 && !videoUrl; i++) {
      await sleep(2000);
      try {
        const poll = await fetch(pollUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
        const pollBody = await poll.json().catch(() => null);
        const { status } = getStatusAndPollUrl(pollBody);
        videoUrl = extractVideoUrl(pollBody);
        if (status === "failed") {
          console.error("Wavespeed generation failed", JSON.stringify(pollBody).slice(0, 500));
          return json({ error: FRIENDLY_ERROR }, 502);
        }
      } catch {
        // transient poll error — keep trying within the budget
      }
    }
    if (!videoUrl) {
      console.error("Wavespeed generation timed out");
      return json({ error: FRIENDLY_ERROR }, 504);
    }
  }

  try {
    const fileRes = await fetch(videoUrl);
    if (!fileRes.ok) {
      console.error("Failed to fetch generated video", fileRes.status);
      return json({ error: FRIENDLY_ERROR }, 502);
    }
    const bytes = new Uint8Array(await fileRes.arrayBuffer());
    const publicUrl = await uploadVideo(bytes, body.userId, body.projectId, body.sceneId);
    return json({ videoUrl: publicUrl, duration, backend: "wavespeed" });
  } catch (err) {
    console.error("Failed to store generated video", String(err));
    return json({ error: FRIENDLY_ERROR }, 502);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const webhookJobId = url.searchParams.get("job");

  if (req.method === "GET") {
    const warnings: string[] = [];
    if (!Deno.env.get("WAVESPEED_API_KEY")) warnings.push("WAVESPEED_API_KEY not configured");
    if (!runpodConfigured) warnings.push("RunPod not configured (Wavespeed-only mode)");
    return json({
      ok: true,
      backend: runpodConfigured
        ? "runpod:ltx-2-distilled async (fallback wavespeed:ltx-2-fast)"
        : "wavespeed:ltx-2-fast/image-to-video",
      warnings,
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Not found" }, 404);
  }

  // RunPod webhook — no Supabase JWT (deployed with --no-verify-jwt); authenticated by
  // row id + runpod job id match + re-fetching the result with our own API key.
  if (webhookJobId) {
    return await handleWebhook(webhookJobId, req);
  }

  // Every other branch is client-facing: require an Authorization header (supabase-js
  // always sends one), since JWT verification is disabled at the platform level.
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401);
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return json({ error: "POST body must be valid JSON" }, 400);

  // Warm-up ping — start a RunPod worker so weights load while the user's movie is still
  // in the research/storyboard phase.
  if (body.warmup === true) {
    if (!runpodConfigured) return json({ ok: true, warmed: false, reason: "runpod not configured" });
    try {
      const res = await fetch(`${RUNPOD_BASE}/run`, {
        method: "POST",
        headers: runpodHeaders,
        body: JSON.stringify({ input: { warmup: true } }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) console.error("RunPod warmup submit failed", res.status);
      return json({ ok: res.ok, warmed: res.ok, jobId: data?.id });
    } catch (err) {
      console.error("RunPod warmup failed", String(err));
      return json({ ok: false, warmed: false });
    }
  }

  if (!body.imageUrl || !body.prompt) {
    return json({ error: "imageUrl and prompt are required" }, 400);
  }

  const duration = typeof body.duration === "number" ? body.duration : 6;
  const executeModelCall = body.executeModelCall === true;

  // Safety gate: prepared-but-not-executed (no spend) unless explicitly enabled.
  if (!executeModelCall) {
    return json({
      executeModelCall: false,
      warning: "Video call prepared but not executed (executeModelCall=false).",
      backend: runpodConfigured ? "runpod" : "wavespeed",
    });
  }

  if (runpodConfigured && body.forceBackend !== "wavespeed") {
    const started = await startRunPodJob(body);
    if (started) return started;
    // No capacity / submit failure → serve the user via Wavespeed right now.
  }
  return await runWavespeed(body, duration);
});
