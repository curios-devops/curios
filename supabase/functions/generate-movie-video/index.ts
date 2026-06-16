// Movie Mode — LTX image-to-video edge function (Wavespeed-backed).
//
// Frontend (RunPodLTXProvider) → this function → Wavespeed LTX-2 image-to-video →
// the resulting mp4 is downloaded and re-uploaded to Supabase Storage `movie-assets`,
// and a public URL is returned.
//
// We use the same hosted Wavespeed API + WAVESPEED_API_KEY that Cinematic already uses
// (cost is pay-per-call, zero idle spend — no self-hosted GPU/volume needed). The
// `executeModelCall` safety gate mirrors generate-cinematic so no spend happens unless
// the caller explicitly opts in.

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET") {
    const warnings: string[] = [];
    if (!Deno.env.get("WAVESPEED_API_KEY")) warnings.push("WAVESPEED_API_KEY not configured");
    return json({ ok: true, backend: "wavespeed:ltx-2-fast/image-to-video", warnings });
  }

  if (req.method !== "POST") {
    return json({ error: "Not found" }, 404);
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return json({ error: "POST body must be valid JSON" }, 400);

  if (!body.imageUrl || !body.prompt) {
    return json({ error: "imageUrl and prompt are required" }, 400);
  }

  const duration = typeof body.duration === "number" ? body.duration : 6;
  const executeModelCall = body.executeModelCall === true;

  // LTX-2 image-to-video has no external-audio input — it can only synthesize its
  // own track via generate_audio. We enable it so each swipe video has sound.
  const requestPayload = {
    image: body.imageUrl,
    prompt: body.prompt,
    duration,
    generate_audio: body.generateAudio ?? false,
    ...(typeof body.seed === "number" ? { seed: body.seed } : {}),
  };

  // Safety gate: prepared-but-not-executed (no spend) unless explicitly enabled.
  if (!executeModelCall) {
    return json({
      executeModelCall: false,
      warning: "Wavespeed call prepared but not executed (executeModelCall=false).",
      requestPayload,
    });
  }

  const apiKey = Deno.env.get("WAVESPEED_API_KEY");
  if (!apiKey) {
    return json({ error: "WAVESPEED_API_KEY is required when executeModelCall=true" }, 500);
  }

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
      return json({ error: `Wavespeed error ${upstream.status}`, details: submitBody }, 502);
    }
  } catch (err) {
    return json({ error: `Wavespeed request failed: ${String(err)}` }, 502);
  }

  // 2) Resolve the video URL — either present immediately or via polling the result URL.
  let videoUrl = extractVideoUrl(submitBody);
  if (!videoUrl) {
    const { pollUrl } = getStatusAndPollUrl(submitBody);
    if (!pollUrl) {
      return json({ error: "Wavespeed returned no result URL", details: submitBody }, 502);
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
          return json({ error: "Wavespeed generation failed", details: pollBody }, 502);
        }
      } catch {
        // transient poll error — keep trying within the budget
      }
    }
    if (!videoUrl) {
      return json({ error: "Wavespeed generation timed out" }, 504);
    }
  }

  // 3) Download the mp4 and re-host it in Supabase Storage for a stable public URL.
  let videoBytes: Uint8Array;
  try {
    const fileRes = await fetch(videoUrl);
    if (!fileRes.ok) {
      return json({ error: `Failed to fetch generated video (${fileRes.status})` }, 502);
    }
    videoBytes = new Uint8Array(await fileRes.arrayBuffer());
  } catch (err) {
    return json({ error: `Failed to download generated video: ${String(err)}` }, 502);
  }

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
    return json({ error: `Failed to upload scene video: ${uploadError.message}` }, 500);
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  return json({
    videoUrl: publicUrlData.publicUrl,
    storagePath,
    duration,
  });
});
