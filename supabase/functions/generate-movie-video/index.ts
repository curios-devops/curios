// Movie Mode — LTX image-to-video edge function.
//
// PRIMARY: self-hosted LTX-2 19B distilled (audio+video) on RunPod Serverless — enabled
// when RUNPOD_API_KEY + RUNPOD_ENDPOINT_ID secrets are set (see runpod/ltx-worker/README).
// FALLBACK: Wavespeed hosted ltx-2-fast — used when RunPod is not configured, errors, or
// exceeds its time budget (job gets cancelled so we don't pay for an unused render).
//
// Also accepts { warmup: true } — the app pings this when a user opens Movie mode so the
// RunPod worker cold-starts (loads weights) while the storyboard is still being written.
// The worker then sleeps via the endpoint's idle timeout (5 min) → zero idle GPU cost.
//
// The resulting mp4 is uploaded to Supabase Storage `movie-assets` and a public URL is
// returned. The `executeModelCall` safety gate mirrors generate-cinematic so no generation
// spend happens unless the caller explicitly opts in.

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
};

const BUCKET = "movie-assets";
const WAVESPEED_ENDPOINT =
  "https://api.wavespeed.ai/api/v3/lightricks/ltx-2-fast/image-to-video";

const RUNPOD_API_KEY = Deno.env.get("RUNPOD_API_KEY");
const RUNPOD_ENDPOINT_ID = Deno.env.get("RUNPOD_ENDPOINT_ID");
const runpodConfigured = Boolean(RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID);
const RUNPOD_BASE = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`;
// Two-tier budget (measured on L40S: a warm 6s render ≈ 4 min; a cold start adds minutes):
// - IN_QUEUE longer than RUNPOD_QUEUE_MS → no warm worker; bail fast so the Wavespeed
//   fallback still fits inside the edge function's wall clock.
// - Once IN_PROGRESS, allow up to RUNPOD_EXEC_MS total before cancelling.
const RUNPOD_QUEUE_MS = Number(Deno.env.get("RUNPOD_QUEUE_MS") || 60000);
const RUNPOD_EXEC_MS = Number(Deno.env.get("RUNPOD_EXEC_MS") || 300000);

// Users see this instead of raw upstream errors (e.g. "Insufficient credits") —
// provider/billing details are an internal matter; full details go to the function logs.
const FRIENDLY_ERROR =
  "Video generation is temporarily unavailable — please try again in a few minutes.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const runpodHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${RUNPOD_API_KEY}`,
};

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── RunPod (primary) ────────────────────────────────────────────────────────────
// Returns the mp4 bytes, or null on any failure/timeout (caller falls back to Wavespeed).
async function tryRunPod(body: Body): Promise<Uint8Array | null> {
  let jobId: string | undefined;
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
      }),
    });
    const submitBody = await submit.json().catch(() => null);
    if (!submit.ok || !submitBody?.id) {
      console.error("RunPod submit failed", submit.status, JSON.stringify(submitBody).slice(0, 300));
      return null;
    }
    jobId = submitBody.id as string;

    const startedAt = Date.now();
    let sawProgress = false;
    while (true) {
      const elapsed = Date.now() - startedAt;
      // Still queued past the queue budget → cold endpoint; fall back while there is
      // still time for Wavespeed. Executing past the exec budget → cancel and fall back.
      if (!sawProgress && elapsed > RUNPOD_QUEUE_MS) break;
      if (elapsed > RUNPOD_EXEC_MS) break;

      await sleep(3000);
      const res = await fetch(`${RUNPOD_BASE}/status/${jobId}`, { headers: runpodHeaders });
      const status = await res.json().catch(() => null);
      const state = status?.status as string | undefined;
      if (state === "IN_PROGRESS") sawProgress = true;

      if (state === "COMPLETED") {
        const b64 = status?.output?.video_base64;
        if (typeof b64 === "string" && b64.length > 0) return base64ToBytes(b64);
        console.error("RunPod completed without video", JSON.stringify(status?.output ?? {}).slice(0, 300));
        return null;
      }
      if (state === "FAILED" || state === "CANCELLED" || state === "TIMED_OUT") {
        console.error("RunPod job did not complete", state, JSON.stringify(status?.output ?? {}).slice(0, 300));
        return null;
      }
      // IN_QUEUE / IN_PROGRESS → keep polling within the budget.
    }

    // Over budget — cancel so the abandoned job stops billing, then fall back.
    console.error("RunPod over time budget — cancelling and falling back to Wavespeed", { jobId });
    fetch(`${RUNPOD_BASE}/cancel/${jobId}`, { method: "POST", headers: runpodHeaders }).catch(() => undefined);
    return null;
  } catch (err) {
    console.error("RunPod request failed", String(err));
    if (jobId) {
      fetch(`${RUNPOD_BASE}/cancel/${jobId}`, { method: "POST", headers: runpodHeaders }).catch(() => undefined);
    }
    return null;
  }
}

// ── Wavespeed (fallback) helpers ───────────────────────────────────────────────
// Pull a video URL out of the various shapes Wavespeed returns (submit + poll result).
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

// Returns mp4 bytes or a Response (error to bubble straight to the client).
async function tryWavespeed(body: Body, duration: number): Promise<Uint8Array | Response> {
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

  // 1) Submit the image-to-video job.
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

  // 2) Resolve the video URL — either present immediately or via polling the result URL.
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

  // 3) Download the mp4.
  try {
    const fileRes = await fetch(videoUrl);
    if (!fileRes.ok) {
      console.error("Failed to fetch generated video", fileRes.status);
      return json({ error: FRIENDLY_ERROR }, 502);
    }
    return new Uint8Array(await fileRes.arrayBuffer());
  } catch (err) {
    console.error("Failed to download generated video", String(err));
    return json({ error: FRIENDLY_ERROR }, 502);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET") {
    const warnings: string[] = [];
    if (!Deno.env.get("WAVESPEED_API_KEY")) warnings.push("WAVESPEED_API_KEY not configured");
    if (!runpodConfigured) warnings.push("RunPod not configured (Wavespeed-only mode)");
    return json({
      ok: true,
      backend: runpodConfigured
        ? "runpod:ltx-2-distilled (fallback wavespeed:ltx-2-fast)"
        : "wavespeed:ltx-2-fast/image-to-video",
      warnings,
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Not found" }, 404);
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return json({ error: "POST body must be valid JSON" }, 400);

  // Warm-up ping — fire the RunPod worker so weights load while the user's movie is still
  // in the research/storyboard phase. Fire-and-forget: we submit and return immediately.
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

  // ── Generate: RunPod primary → Wavespeed fallback ────────────────────────────
  let backend = "wavespeed";
  let videoBytes: Uint8Array | null = null;

  if (runpodConfigured) {
    videoBytes = await tryRunPod(body);
    if (videoBytes) backend = "runpod";
  }

  if (!videoBytes) {
    const result = await tryWavespeed(body, duration);
    if (result instanceof Response) return result;
    videoBytes = result;
  }

  // ── Upload to Supabase Storage for a stable public URL ───────────────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const folder = body.userId || "guest";
  const project = body.projectId || "adhoc";
  const scene = body.sceneId || crypto.randomUUID();
  const storagePath = `${folder}/${project}/${scene}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, videoBytes, { contentType: "video/mp4", upsert: true });

  if (uploadError) {
    console.error("Failed to upload scene video", uploadError.message);
    return json({ error: FRIENDLY_ERROR }, 500);
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  return json({
    videoUrl: publicUrlData.publicUrl,
    storagePath,
    duration,
    backend,
  });
});
