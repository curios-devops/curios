// deno-lint-ignore-file no-import-prefix
// Edge Function — server-owned "Enhance" job. Creates an enhanced_videos row, returns its id
// immediately, then finishes the work in the background (EdgeRuntime.waitUntil) so it completes
// and self-persists even if the browser navigates away or reloads:
//   1) premium frame via gpt-image-2 (OpenAI images, OPENAI_API_KEY)
//   2) video via Gemini Omni Flash (Vertex Interactions API, service account)
//   3) upload both to movie-assets, mark the row status='ready' (+ update the movie_scenes row)
// The Home "unseen" carousel then surfaces ready rows with seen_at IS NULL.
import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getVertexAccessToken, vertexInteractionsUrl } from "../_shared/vertex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
// @ts-ignore
const OPENAI_ORG_ID = Deno.env.get("OPENAI_ORG_ID");
// @ts-ignore
const IMAGE_MODEL = Deno.env.get("MOVIE_IMAGE_MODEL") || "gpt-image-2";
// @ts-ignore
const OMNI_MODEL = Deno.env.get("GEMINI_OMNI_MODEL") || "gemini-omni-flash-preview";
// @ts-ignore
const OMNI_LOCATION = Deno.env.get("GEMINI_OMNI_LOCATION") || "global";

function admin() {
  return createClient(
    // @ts-ignore
    Deno.env.get("SUPABASE_URL") ?? "",
    // @ts-ignore
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

// gpt-image-2 → base64 PNG.
async function generateImage(prompt: string): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` };
  if (OPENAI_ORG_ID) headers["OpenAI-Organization"] = OPENAI_ORG_ID;
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers,
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size: "1536x1024", quality: "medium", n: 1 }),
  });
  if (!res.ok) throw new Error(`gpt-image ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("gpt-image returned no image");
  return b64;
}

// Gemini Omni Flash (Interactions API) image→video → base64 mp4.
async function generateVideo(imageB64: string, prompt: string, aspectRatio: string, accessToken: string): Promise<string> {
  const res = await fetch(vertexInteractionsUrl(OMNI_LOCATION), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      model: OMNI_MODEL,
      input: [
        { type: "image", data: imageB64, mime_type: "image/png" },
        { type: "text", text: prompt },
      ],
      response_format: { type: "video", aspect_ratio: aspectRatio },
    }),
  });
  if (!res.ok) throw new Error(`omni ${res.status}: ${await res.text()}`);
  const data = await res.json();
  for (const step of data.steps ?? []) {
    for (const part of step.content ?? []) {
      if ((part.type === "video" || (part.mime_type || "").startsWith("video/")) && typeof part.data === "string") {
        return part.data;
      }
    }
  }
  if (data.output_video?.data) return data.output_video.data;
  throw new Error("omni returned no video");
}

async function runJob(jobId: string, params: {
  userId: string;
  projectId?: string;
  swipeOrder: number;
  imagePrompt: string;
  videoPrompt: string;
  aspectRatio: string;
}) {
  const db = admin();
  try {
    const imageB64 = await generateImage(params.imagePrompt);
    const imagePath = `${params.userId}/enhanced/${jobId}.png`;
    await db.storage.from("movie-assets").upload(imagePath, Uint8Array.from(atob(imageB64), (c) => c.charCodeAt(0)), {
      contentType: "image/png",
      upsert: true,
    });
    const imageUrl = db.storage.from("movie-assets").getPublicUrl(imagePath).data.publicUrl;

    const accessToken = await getVertexAccessToken();
    const videoB64 = await generateVideo(imageB64, params.videoPrompt, params.aspectRatio, accessToken);
    const videoPath = `${params.userId}/enhanced/${jobId}.mp4`;
    await db.storage.from("movie-assets").upload(videoPath, Uint8Array.from(atob(videoB64), (c) => c.charCodeAt(0)), {
      contentType: "video/mp4",
      upsert: true,
    });
    const videoUrl = db.storage.from("movie-assets").getPublicUrl(videoPath).data.publicUrl;

    await db.from("enhanced_videos").update({
      image_url: imageUrl,
      video_url: videoUrl,
      status: "ready",
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);

    // Reflect on the source swipe so re-opening the movie shows the enhanced media.
    if (params.projectId) {
      await db.from("movie_scenes").update({ image_url: imageUrl, video_url: videoUrl, status: "ready" })
        .eq("project_id", params.projectId).eq("scene_order", params.swipeOrder);
    }
  } catch (err) {
    console.error("enhance-swipe job failed:", err);
    await db.from("enhanced_videos").update({
      status: "error",
      error: err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err),
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);
  }
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userId, projectId, title, imagePrompt, videoPrompt } = body;
    const swipeOrder = Number(body.swipeOrder ?? 0);
    const aspectRatio = body.aspectRatio || "16:9";
    if (!userId || !imagePrompt || !videoPrompt) {
      return new Response(JSON.stringify({ error: "Missing userId, imagePrompt or videoPrompt" }), { status: 400, headers: corsHeaders });
    }

    const db = admin();
    const { data: row, error } = await db.from("enhanced_videos").insert({
      user_id: userId,
      project_id: projectId ?? null,
      swipe_order: swipeOrder,
      title: title ?? "",
      image_prompt: imagePrompt,
      video_prompt: videoPrompt,
      status: "processing",
    }).select("id").single();
    if (error) throw error;

    const jobId = row.id as string;
    // Finish in the background so the client can navigate away / reload freely.
    // @ts-ignore EdgeRuntime is provided by the Supabase edge runtime
    EdgeRuntime.waitUntil(runJob(jobId, { userId, projectId, swipeOrder, imagePrompt, videoPrompt, aspectRatio }));

    return new Response(JSON.stringify({ jobId }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("enhance-swipe error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
