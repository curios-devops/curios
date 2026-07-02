// deno-lint-ignore-file no-import-prefix
// Edge Function — premium image-to-video for the Enhance path, on VERTEX AI (service-account
// auth, curios-vertex project). Replaces LTX for the enhanced render. Takes the enhanced
// gpt-image-2 frame + a motion prompt, generates a video, uploads it to movie-assets, and
// returns a hosted public URL — same contract as the LTX provider so the frontend stays thin.
//
// PRIMARY backend = **Gemini Omni Flash** (gemini-omni-flash-preview) via the Vertex
// **Interactions API** at location `global`. It's SYNCHRONOUS: one POST returns
// status:"completed" with the mp4 base64 at steps[type=model_output].content[type=video].data.
// Verified end-to-end (~3.6MB mp4). Body shape: { model, input:[{type:image,data,mime_type},
// {type:text,text}], response_format:{ type:"video", aspect_ratio } } — video params go in
// response_format (NOT config/video_config), and delivery defaults to inline base64.
//
// FALLBACK = Veo 3.1 (predictLongRunning + poll). Selected automatically when GEMINI_OMNI_MODEL
// is set to a `veo-*` id (with GEMINI_OMNI_LOCATION=us-central1).
import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getVertexAccessToken, vertexModelUrl, vertexInteractionsUrl } from "../_shared/vertex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const OMNI_MODEL = Deno.env.get("GEMINI_OMNI_MODEL") || "gemini-omni-flash-preview";
// @ts-ignore
const OMNI_LOCATION = Deno.env.get("GEMINI_OMNI_LOCATION") || "global";
const GEN_TIMEOUT_MS = 280000;
// Veo-fallback polling.
const POLL_INTERVAL_MS = 6000;
const POLL_MAX_ATTEMPTS = 45;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// btoa() overflows the call stack on large buffers — chunk it.
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Omni Interactions response → mp4 base64 (steps[].content[] with a video part).
function extractInteractionsVideo(data: Record<string, unknown>): string | undefined {
  const steps = (data.steps ?? []) as Array<{ content?: Array<Record<string, unknown>> }>;
  for (const step of steps) {
    for (const part of step.content ?? []) {
      const mime = (part.mime_type as string) || "";
      if ((part.type === "video" || mime.startsWith("video/")) && typeof part.data === "string") {
        return part.data;
      }
    }
  }
  const outVideo = data.output_video as { data?: string } | undefined;
  return outVideo?.data;
}

// Veo predictLongRunning response → gcsUri or inline base64.
function extractVeoVideo(response: Record<string, unknown>): { gcsUri?: string; base64?: string } | undefined {
  for (const key of ["videos", "predictions"] as const) {
    const arr = (response[key] ?? []) as Array<Record<string, unknown>>;
    const v = arr[0];
    if (v) {
      const gcsUri = (v.gcsUri || v.uri || v.videoUri) as string | undefined;
      const base64 = v.bytesBase64Encoded as string | undefined;
      if (gcsUri) return { gcsUri };
      if (base64) return { base64 };
    }
  }
  return undefined;
}

// @ts-ignore: Deno.serve is the entry point for Supabase Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { imageUrl, prompt } = body;
    if (!imageUrl || !prompt) {
      return new Response(JSON.stringify({ error: "Missing imageUrl or prompt" }), { status: 400, headers: corsHeaders });
    }

    const model = body.model || OMNI_MODEL;
    const location = body.location || OMNI_LOCATION;
    const aspectRatio = body.aspectRatio || "16:9";
    const useVeo = model.startsWith("veo-");

    const accessToken = await getVertexAccessToken();

    // Fetch the input frame → base64 (both backends animate from this still).
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch input image (${imgRes.status})` }), { status: 400, headers: corsHeaders });
    }
    const imgMime = imgRes.headers.get("content-type") || "image/png";
    const imgBase64 = toBase64(new Uint8Array(await imgRes.arrayBuffer()));

    let bytes: Uint8Array;

    if (!useVeo) {
      // ── Gemini Omni Flash via the Interactions API (synchronous) ──────────────
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GEN_TIMEOUT_MS);
      const res = await fetch(vertexInteractionsUrl(location), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          model,
          input: [
            { type: "image", data: imgBase64, mime_type: imgMime },
            { type: "text", text: prompt },
          ],
          response_format: { type: "video", aspect_ratio: aspectRatio },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const error = await res.text();
        console.error("Omni interactions error:", { status: res.status, error });
        return new Response(JSON.stringify({ error: `Omni video error: ${res.status}`, details: error }), {
          status: res.status,
          headers: corsHeaders,
        });
      }
      const data = await res.json();
      const b64 = extractInteractionsVideo(data);
      if (!b64) {
        console.error("No video in Omni response");
        return new Response(JSON.stringify({ error: "Omni returned no video" }), { status: 502, headers: corsHeaders });
      }
      bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    } else {
      // ── Veo 3.1 fallback via predictLongRunning + poll ────────────────────────
      const startRes = await fetch(`${vertexModelUrl(model, location)}:predictLongRunning`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          instances: [{ prompt, image: { bytesBase64Encoded: imgBase64, mimeType: imgMime } }],
          parameters: { aspectRatio, sampleCount: 1, durationSeconds: body.durationSeconds || 8 },
        }),
      });
      if (!startRes.ok) {
        const error = await startRes.text();
        console.error("Veo predictLongRunning error:", { status: startRes.status, error });
        return new Response(JSON.stringify({ error: `Omni video error: ${startRes.status}`, details: error }), {
          status: startRes.status,
          headers: corsHeaders,
        });
      }
      const operationName = (await startRes.json()).name as string;

      let veo: { gcsUri?: string; base64?: string } | undefined;
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        await delay(POLL_INTERVAL_MS);
        const pollRes = await fetch(`${vertexModelUrl(model, location)}:fetchPredictOperation`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ operationName }),
        });
        if (!pollRes.ok) continue;
        const op = await pollRes.json();
        if (!op.done) continue;
        if (op.error) {
          return new Response(JSON.stringify({ error: `Veo generation failed: ${op.error.message || JSON.stringify(op.error)}` }), { status: 502, headers: corsHeaders });
        }
        veo = extractVeoVideo(op.response || {});
        break;
      }
      if (!veo) {
        return new Response(JSON.stringify({ error: "Veo video timed out or returned no video" }), { status: 504, headers: corsHeaders });
      }
      if (veo.base64) {
        bytes = Uint8Array.from(atob(veo.base64), (c) => c.charCodeAt(0));
      } else {
        const gcsPath = veo.gcsUri!.replace("gs://", "https://storage.googleapis.com/");
        const dl = await fetch(gcsPath, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!dl.ok) throw new Error(`GCS video download failed (${dl.status})`);
        bytes = new Uint8Array(await dl.arrayBuffer());
      }
    }

    // Upload the mp4 to Storage and return a public URL.
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const bucket = body.storageBucket || "movie-assets";
    const path = body.storagePath || `omni/${crypto.randomUUID()}.mp4`;
    const supabase = createClient(supabaseUrl, serviceKey);
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (upErr) {
      console.error("Video upload error:", upErr.message);
      return new Response(JSON.stringify({ error: `Video upload failed: ${upErr.message}` }), { status: 500, headers: corsHeaders });
    }

    const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    return new Response(JSON.stringify({ videoUrl: url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("gemini-omni-video edge function error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
