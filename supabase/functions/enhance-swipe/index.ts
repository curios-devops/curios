// deno-lint-ignore-file no-import-prefix
// Edge Function — server-owned "Enhance" job (background via EdgeRuntime.waitUntil, survives
// navigation/reload). Implements the grounded visual pipeline from docs/Movie/enhaced_refactor.md:
//
//   STEP 1  Classifier (Gemini text)  → { category, realism_score 0-100, search queries }
//   STEP 2  Strategy (code)           → REAL (>80) | HYBRID (50-80) | FULL_AI (<50)
//   STEP 3  Image sourcing + grounding
//            REAL    : SerpAPI(+Brave) images → Gemini-vision rank + copyright filter →
//                      gpt-image-2 /images/edits with the best REAL image as input + prompt
//            HYBRID  : same search+rank → Gemini describes the best image → gpt-image-2
//                      /generations with the user scene remixed with that description
//            FULL_AI : no search → gpt-image-2 /generations from the swipe prompt + realism booster
//   STEP 4  Quality gate (Gemini vision realism 0-100) → regenerate once if < 85
//   STEP 5  Video (Gemini Omni Flash, documentary motion prompt) → upload → mark row 'ready'
//
// Substitutions vs the doc: EXA→SerpAPI(+Brave); "AI Detector"→Gemini-vision realism score.
/// <reference types="jsr:@supabase/functions-js@2/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getVertexAccessToken, vertexModelUrl, vertexInteractionsUrl } from "../_shared/vertex.ts";

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
// @ts-ignore
const TEXT_MODEL = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-2.5-flash";
// @ts-ignore
const TEXT_LOCATION = Deno.env.get("GEMINI_TEXT_LOCATION") || "us-central1";
// @ts-ignore
const SERPAPI_API_KEY = Deno.env.get("SERPAPI_API_KEY");
// @ts-ignore
const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");

const IMAGE_SIZE = "1536x1024"; // 16:9
const GOOD_SEARCH_SCORE = 6; // weighted 0-10 threshold to trust a real image
const COPYRIGHT_MAX = 6; // drop images whose copyright_risk exceeds this
const QUALITY_MIN = 85; // STEP 4 realism gate (0-100)

// Doc's realism booster + broadcast-safety guardrails (keeps Omni/Google from later blocking).
const REALISM_BOOSTER =
  "photojournalism, documentary photography, Reuters/AP style, candid shot, natural lighting, " +
  "real texture, subtle imperfections, slight motion blur, unedited photograph, camera sensor noise, " +
  "50mm lens, realistic depth of field, photorealistic";
const SAFETY =
  "Do NOT include real identifiable people or public figures, brand logos, trademarks, readable text or " +
  "watermarks, weapons, gore, or any sensitive/unsafe content. Clean, neutral, broadcast-safe scene " +
  "suitable for automated video generation.";
const VIDEO_RULES =
  "Realistic documentary camera movement only (slow zoom, dolly, gentle pan, 2.5D parallax, rack focus). " +
  "Preserve identity, lighting, textures and composition. No object generation, no facial deformation, " +
  "no camera spins, no added text.";

// Movie Mode style boosters (docs/Movie/moviemode.md) — keep in sync with the client's
// src/services/movie/config/movieModes.ts. 'real' (or absent) keeps the legacy grounded
// photojournalistic pipeline above; stylized modes replace the realism booster and rules.
const MODE_STYLES: Record<string, { image: string; video: string }> = {
  cinematic: {
    image: "cinematic film still, dramatic lighting, anamorphic lens, epic wide composition, movie-grade color grading",
    video: "Dramatic, film-like motion: open up the shot, add atmosphere and scale. Preserve the established cinematic look. No added text.",
  },
  cartoon: {
    image: "2D illustrated cartoon, bold outlines, flat vibrant colors, expressive characters",
    video: "Bouncy, expressive cartoon animation with squash-and-stretch energy. Keep the illustrated style consistent. No added text.",
  },
  pixar: {
    image: "Pixar-like 3D animation, soft rounded shapes, warm cinematic lighting, expressive stylized characters, high-detail render",
    video: "Smooth, character-driven 3D animation with lively secondary motion. Keep the 3D animated style consistent. No added text.",
  },
  lego: {
    image: "LEGO brick world, everything built from LEGO bricks, minifigure characters, glossy plastic textures, playful diorama",
    video: "Stop-motion-style brick animation: minifigures and brick-built parts moving. Keep the LEGO look consistent. No added text.",
  },
  anime: {
    image: "Japanese anime, cel shading, dramatic line work, expressive eyes, dynamic action framing",
    video: "Dynamic anime action: speed lines, dramatic pans, expressive character motion. Keep the anime style consistent. No added text.",
  },
  retro80s: {
    image: "retro 1980s aesthetic, VHS grain, neon palette, synthwave glow, period-accurate styling",
    video: "Retro broadcast motion: analog glitches, neon flicker, synthwave pulse. Keep the 80s look consistent. No added text.",
  },
  meme: {
    image: "exaggerated internet-meme style, comedic exaggeration of the situation while keeping its recognizable context, punchy",
    video: "Comedic, exaggerated motion with punchline timing. Keep the meme energy consistent. No added text.",
  },
};

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

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// ── Gemini helpers (Vertex generateContent) ─────────────────────────────────────
async function geminiJson<T>(parts: unknown[], token: string): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(`${vertexModelUrl(TEXT_MODEL, TEXT_LOCATION)}:generateContent`, 30000, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    });
    if (!res.ok) {
      console.error("gemini generateContent", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    return JSON.parse(text) as T;
  } catch (e) {
    console.error("geminiJson error", e);
    return null;
  }
}

interface Classification { category: string; realism_score: number; queries: string[] }

async function classify(question: string, token: string): Promise<Classification> {
  const prompt = `Classify this query for a grounded explainer video and return JSON only.
Query: "${question}"
Return: {"category": one of [BREAKING_NEWS,CURRENT_EVENTS,HISTORICAL,SCIENCE,EDUCATION,ABSTRACT,FICTION,ENTERTAINMENT],
"realism_score": 0-100 (0=artistic, 100=photojournalistic),
"queries": [5 photojournalistic image-search queries, Reuters/AP/documentary/editorial style]}`;
  const r = await geminiJson<Classification>([{ text: prompt }], token);
  if (!r || typeof r.realism_score !== "number") {
    return { category: "EDUCATION", realism_score: 55, queries: [question] };
  }
  if (!Array.isArray(r.queries) || r.queries.length === 0) r.queries = [question];
  return r;
}

interface ImageAnalysis {
  url: string; score: number; copyright: number; description: string;
}

async function analyzeImage(url: string, question: string, token: string): Promise<ImageAnalysis | null> {
  try {
    const img = await fetchWithTimeout(url, 15000);
    if (!img.ok) return null;
    const mime = img.headers.get("content-type") || "image/jpeg";
    if (!mime.startsWith("image/")) return null;
    const buf = new Uint8Array(await img.arrayBuffer());
    if (buf.length > 8_000_000) return null; // skip oversized
    const b64 = toBase64(buf);
    const prompt = `Judge THIS real image as a factual visual anchor for the query: "${question}".
Return JSON only: {"realism":0-10,"resolution":0-10,"composition":0-10,"face_quality":0-10,"freshness":0-10,
"copyright_risk":0-10 (watermark/logo/stock overlay = high),
"description":"literal detailed description of what is actually shown (subject, setting, camera, lighting, colors, style)"}`;
    const a = await geminiJson<{
      realism: number; resolution: number; composition: number; face_quality: number; freshness: number;
      copyright_risk: number; description: string;
    }>([{ inlineData: { mimeType: mime, data: b64 } }, { text: prompt }], token);
    if (!a) return null;
    const score = 0.4 * (a.realism ?? 0) + 0.2 * (a.resolution ?? 0) + 0.2 * (a.composition ?? 0)
      + 0.1 * (a.face_quality ?? 0) + 0.1 * (a.freshness ?? 0);
    return { url, score, copyright: a.copyright_risk ?? 0, description: a.description ?? "" };
  } catch (e) {
    console.error("analyzeImage error", e);
    return null;
  }
}

async function searchImages(query: string): Promise<string[]> {
  if (SERPAPI_API_KEY) {
    try {
      const u = new URL("https://serpapi.com/search");
      u.searchParams.set("engine", "google_images_light");
      u.searchParams.set("q", query);
      u.searchParams.set("hl", "en");
      u.searchParams.set("gl", "us");
      u.searchParams.set("api_key", SERPAPI_API_KEY);
      const r = await fetchWithTimeout(u.toString(), 15000);
      if (r.ok) {
        const d = await r.json();
        const imgs = (d.images_results ?? []).map((x: { original?: string }) => x.original).filter(Boolean);
        if (imgs.length) return imgs.slice(0, 3);
      }
    } catch (e) { console.error("serpapi images", e); }
  }
  if (BRAVE_API_KEY) {
    try {
      const r = await fetchWithTimeout(
        `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=5&safesearch=strict&country=us`,
        15000,
        { headers: { "X-Subscription-Token": BRAVE_API_KEY, Accept: "application/json" } },
      );
      if (r.ok) {
        const d = await r.json();
        const imgs = (d.results ?? []).map((x: { properties?: { url?: string }; thumbnail?: { src?: string } }) =>
          x?.properties?.url || x?.thumbnail?.src).filter(Boolean);
        if (imgs.length) return imgs.slice(0, 3);
      }
    } catch (e) { console.error("brave images", e); }
  }
  return [];
}

// ── gpt-image-2 ─────────────────────────────────────────────────────────────────
function openaiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${OPENAI_API_KEY}`, ...extra };
  if (OPENAI_ORG_ID) h["OpenAI-Organization"] = OPENAI_ORG_ID;
  return h;
}

async function generateImageFromText(prompt: string): Promise<string> {
  const res = await fetchWithTimeout("https://api.openai.com/v1/images/generations", 90000, {
    method: "POST",
    headers: openaiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size: IMAGE_SIZE, quality: "medium", n: 1 }),
  });
  if (!res.ok) throw new Error(`gpt-image generations ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const b64 = (await res.json())?.data?.[0]?.b64_json;
  if (!b64) throw new Error("gpt-image generations returned no image");
  return b64;
}

// Pipeline A: real photo as input reference (/images/edits).
async function generateImageFromReference(imageUrl: string, prompt: string): Promise<string> {
  const ref = await fetchWithTimeout(imageUrl, 15000);
  if (!ref.ok) throw new Error(`reference image fetch ${ref.status}`);
  const mime = ref.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await ref.arrayBuffer());
  const form = new FormData();
  form.append("model", IMAGE_MODEL);
  form.append("prompt", prompt);
  form.append("size", IMAGE_SIZE);
  form.append("quality", "medium");
  form.append("n", "1");
  form.append("image", new Blob([bytes], { type: mime }), "reference.png");
  const res = await fetchWithTimeout("https://api.openai.com/v1/images/edits", 120000, {
    method: "POST",
    headers: openaiHeaders(), // let fetch set multipart boundary
    body: form,
  });
  if (!res.ok) throw new Error(`gpt-image edits ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const b64 = (await res.json())?.data?.[0]?.b64_json;
  if (!b64) throw new Error("gpt-image edits returned no image");
  return b64;
}

async function qualityRealism(imageB64: string, question: string, token: string): Promise<number> {
  const a = await geminiJson<{ realism: number }>(
    [
      { inlineData: { mimeType: "image/png", data: imageB64 } },
      { text: `Rate the photorealism of THIS AI-generated image for "${question}" (skin/eyes/hands/texture/lighting/background). Return JSON only: {"realism":0-100}` },
    ],
    token,
  );
  return typeof a?.realism === "number" ? a.realism : 100; // don't block on analyzer failure
}

// ── Gemini Omni Flash (Interactions API) image→video ────────────────────────────
async function generateVideo(imageB64: string, prompt: string, aspectRatio: string, token: string, rules: string = VIDEO_RULES): Promise<string> {
  const res = await fetchWithTimeout(vertexInteractionsUrl(OMNI_LOCATION), 280000, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model: OMNI_MODEL,
      input: [
        { type: "image", data: imageB64, mime_type: "image/png" },
        { type: "text", text: `${prompt}\n\n${rules}` },
      ],
      response_format: { type: "video", aspect_ratio: aspectRatio },
    }),
  });
  if (!res.ok) throw new Error(`omni ${res.status}: ${(await res.text()).slice(0, 200)}`);
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

interface JobParams {
  userId: string;
  projectId?: string;
  swipeOrder: number;
  question: string;
  imagePrompt: string;
  videoPrompt: string;
  aspectRatio: string;
  /** Movie Mode ("Watch as…"). real/absent → legacy grounded pipeline; else stylized. */
  mode?: string;
}

async function runJob(jobId: string, p: JobParams) {
  const db = admin();
  try {
    const token = await getVertexAccessToken();
    const modeStyle = p.mode && p.mode !== "real" ? MODE_STYLES[p.mode] : undefined;

    // STEP 1 + 2 — classify → strategy. A stylized mode overrides the realism-driven
    // pipeline choice: cinematic still grounds loosely on a real photo (HYBRID); the
    // fully stylized modes skip real-image grounding entirely (FULL_AI).
    const cls = await classify(p.question || p.imagePrompt, token);
    let pipeline = cls.realism_score > 80 ? "REAL" : cls.realism_score >= 50 ? "HYBRID" : "FULL_AI";
    if (modeStyle) pipeline = p.mode === "cinematic" ? "HYBRID" : "FULL_AI";
    console.log("[enhance]", { jobId, realism: cls.realism_score, pipeline, mode: p.mode ?? "real" });

    // STEP 3 — build the base image prompt (+ optional real-image grounding).
    const booster = modeStyle ? modeStyle.image : REALISM_BOOSTER;
    let imagePrompt = `${p.imagePrompt}. ${booster}. ${SAFETY}`;
    let best: ImageAnalysis | null = null;

    if (pipeline !== "FULL_AI") {
      const urls = await searchImages(cls.queries[0] || p.question);
      const analyses = (await Promise.all(urls.map((u) => analyzeImage(u, p.question, token))))
        .filter((a): a is ImageAnalysis => !!a && a.copyright <= COPYRIGHT_MAX);
      analyses.sort((a, b) => b.score - a.score);
      best = analyses[0] ?? null;
    }

    let imageB64: string;
    if (pipeline === "REAL" && best && best.score >= GOOD_SEARCH_SCORE) {
      // A — regenerate from the REAL image as input.
      const prompt = `Recreate this real scene faithfully for "${p.question}". Keep the real subject and layout. ${REALISM_BOOSTER}. ${SAFETY}`;
      imagePrompt = prompt;
      imageB64 = await generateImageFromReference(best.url, prompt);
    } else if (pipeline === "HYBRID" && best && best.score >= GOOD_SEARCH_SCORE) {
      // B — remix the user scene with a description of the real image.
      imagePrompt = modeStyle
        ? `Create an image in this style: ${modeStyle.image}.\nSCENE: ${p.imagePrompt}\nREFERENCE (real photo of the subject, for identity only — restyle it fully): ${best.description}\n${SAFETY}`
        : `Create a highly realistic image.\nSCENE: ${p.imagePrompt}\nREFERENCE (real photo of the subject): ${best.description}\n${REALISM_BOOSTER}. ${SAFETY}`;
      imageB64 = await generateImageFromText(imagePrompt);
    } else {
      // C — full AI (or no usable real image found).
      imageB64 = await generateImageFromText(imagePrompt);
    }

    // STEP 4 — realism gate (one retry). Only meaningful for photorealistic output;
    // stylized modes are SUPPOSED to look non-photographic, so they skip it.
    if (!modeStyle) {
      const realism = await qualityRealism(imageB64, p.question, token);
      if (realism < QUALITY_MIN) {
        console.log("[enhance] realism gate retry", { jobId, realism });
        imageB64 = await generateImageFromText(`${imagePrompt} Maximize photorealism; remove any AI artifacts, plastic skin, warped hands or unnatural lighting.`);
      }
    }

    // Upload the frame.
    const imagePath = `${p.userId}/enhanced/${jobId}.png`;
    await db.storage.from("movie-assets").upload(imagePath, Uint8Array.from(atob(imageB64), (c) => c.charCodeAt(0)), {
      contentType: "image/png",
      upsert: true,
    });
    const imageUrl = db.storage.from("movie-assets").getPublicUrl(imagePath).data.publicUrl;

    // Publish the enhanced frame right away (status stays 'processing') so the movie page
    // can replace the swipe's image while the video still renders.
    await db.from("enhanced_videos").update({ image_url: imageUrl, updated_at: new Date().toISOString() }).eq("id", jobId);

    // STEP 5 — video. Stylized modes swap the documentary rules for their own
    // style-preserving motion rules (the doc rules would fight the art style).
    const videoB64 = await generateVideo(imageB64, p.videoPrompt, p.aspectRatio, token, modeStyle?.video ?? VIDEO_RULES);
    const videoPath = `${p.userId}/enhanced/${jobId}.mp4`;
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

    // Enhance can be kicked before the movie has persisted; the client attaches the
    // project id to our row once it saves. Re-read it so the scene still gets replaced.
    const { data: rowNow } = await db.from("enhanced_videos").select("project_id").eq("id", jobId).single();
    const projectId = (rowNow?.project_id as string | null) ?? p.projectId;
    if (projectId) {
      await db.from("movie_scenes").update({ image_url: imageUrl, video_url: videoUrl, status: "ready", enhanced: true })
        .eq("project_id", projectId).eq("scene_order", p.swipeOrder);
      // If the enhanced swipe is the CORE one, the project's primary video (share page /
      // Discover feed) must follow the replacement too.
      const { data: scene } = await db.from("movie_scenes").select("is_core")
        .eq("project_id", projectId).eq("scene_order", p.swipeOrder).maybeSingle();
      if (scene?.is_core) {
        await db.from("movie_projects").update({ full_video_url: videoUrl, thumbnail_url: imageUrl })
          .eq("id", projectId);
      }
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
    const question = body.question || title || "";
    const swipeOrder = Number(body.swipeOrder ?? 0);
    const aspectRatio = body.aspectRatio || "16:9";
    const mode = typeof body.mode === "string" ? body.mode.toLowerCase().trim() : undefined;
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
    // @ts-ignore EdgeRuntime is provided by the Supabase edge runtime
    EdgeRuntime.waitUntil(runJob(jobId, { userId, projectId, swipeOrder, question, imagePrompt, videoPrompt, aspectRatio, mode }));

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
