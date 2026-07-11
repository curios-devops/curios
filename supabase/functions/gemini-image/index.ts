// deno-lint-ignore-file no-import-prefix
// Edge Function — image generation via Gemini "Nano Banana 2 Lite" (gemini-3.1-flash-lite-image)
// on VERTEX AI (service-account auth, curios-vertex project). The cheap/fast default for Movie
// swipe frames. Billed via Vertex, so it avoids the AI-Studio free-tier limit and the leaked
// API-key block. Uploads the returned base64 image to Storage and returns a hosted public URL.
import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getVertexAccessToken, vertexModelUrl } from "../_shared/vertex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const IMAGE_MODEL = Deno.env.get("GEMINI_IMAGE_MODEL") || "gemini-3.1-flash-lite-image";
// @ts-ignore
const IMAGE_LOCATION = Deno.env.get("GEMINI_IMAGE_LOCATION") || "global";
// Fallback when Vertex is exhausted/unavailable after retries — a pricier frame beats a
// broken one. Quality "low" (~$0.016) keeps the fallback cheap for default swipe frames.
// @ts-ignore
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
// @ts-ignore
const FALLBACK_IMAGE_MODEL = Deno.env.get("MOVIE_IMAGE_MODEL") || "gpt-image-2";
const TIMEOUT_MS = 60000;

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Fetch a reference photo and return { mime, data } base64, or null on any failure. */
async function fetchReference(url: string): Promise<{ mime: string; data: string } | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!r.ok) return null;
    const mime = r.headers.get("content-type") || "image/jpeg";
    if (!mime.startsWith("image/")) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.length > 8_000_000) return null;
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return { mime, data: btoa(binary) };
  } catch {
    return null;
  }
}

/** OpenAI gpt-image-2 fallback: /generations (prompt-only) or /edits (with reference). */
async function openaiFallback(
  prompt: string,
  aspectRatio: string,
  reference: { mime: string; data: string } | null,
): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  const size = aspectRatio === "16:9" ? "1536x1024" : aspectRatio === "9:16" ? "1024x1536" : "1024x1024";
  try {
    let res: Response;
    if (reference) {
      const form = new FormData();
      form.append("model", FALLBACK_IMAGE_MODEL);
      form.append("prompt", prompt);
      form.append("size", size);
      form.append("quality", "low");
      form.append("n", "1");
      form.append("image", new Blob([b64ToBytes(reference.data).buffer as ArrayBuffer], { type: reference.mime }), "reference.png");
      res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: form,
      });
    } else {
      res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: FALLBACK_IMAGE_MODEL, prompt, size, quality: "low", n: 1 }),
      });
    }
    if (!res.ok) {
      console.error("openai image fallback failed", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const b64 = (await res.json())?.data?.[0]?.b64_json;
    return typeof b64 === "string" && b64 ? b64 : null;
  } catch (err) {
    console.error("openai image fallback threw", String(err));
    return null;
  }
}

// Pull the first inline image (base64) out of a generateContent response, tolerating
// both camelCase (inlineData) and snake_case (inline_data) part shapes.
function extractImageBase64(data: Record<string, unknown>): string | undefined {
  const candidates = (data.candidates ?? []) as Array<Record<string, unknown>>;
  for (const candidate of candidates) {
    const content = candidate.content as { parts?: Array<Record<string, unknown>> } | undefined;
    for (const part of content?.parts ?? []) {
      const inline = (part.inlineData ?? part.inline_data) as { data?: string } | undefined;
      if (inline?.data) return inline.data;
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
    const prompt: string = body.prompt;
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400, headers: corsHeaders });
    }

    const accessToken = await getVertexAccessToken();

    // gemini-3.1-flash-lite-image is served from the Vertex `global` location. Overridable
    // per-request (model/location) for probing without redeploying.
    const model = body.model || IMAGE_MODEL;
    const location = body.location || IMAGE_LOCATION;

    // Optional grounding: a real photo as input (Pipeline A "REAL") — image part FIRST,
    // then the text instruction, per the verified Vertex Express reference.
    const reference = body.referenceImageUrl ? await fetchReference(body.referenceImageUrl) : null;
    const parts: Array<Record<string, unknown>> = [];
    if (reference) parts.push({ inline_data: { mime_type: reference.mime, data: reference.data } });
    parts.push({ text: prompt });

    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: body.aspectRatio || "16:9" },
      },
    });

    // Rate-limit 429s (RESOURCE_EXHAUSTED without `limit: 0`) are transient — retry with
    // backoff instead of failing the frame. A `limit: 0` body means no quota at all: no retry.
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 2000));
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      response = await fetch(`${vertexModelUrl(model, location)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: requestBody,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.status !== 429) break;
      const peek = await response.clone().text();
      if (peek.includes('"limit": 0') || peek.includes('"limit":0')) break; // no quota — retrying is useless
      console.warn(`Vertex image 429 (attempt ${attempt + 1}/3) — backing off`);
    }

    let b64: string | undefined;
    if (response && response.ok) {
      const data = await response.json();
      b64 = extractImageBase64(data);
      if (!b64) console.error("No image data in Vertex response");
    } else {
      const error = response ? await response.text() : "no response";
      console.error("Vertex image API error:", { status: response?.status, error });
    }

    // Vertex exhausted/failed/refused → gpt-image-2 fallback rather than failing the frame.
    if (!b64) {
      console.warn("Falling back to OpenAI", FALLBACK_IMAGE_MODEL);
      const fb = await openaiFallback(prompt, body.aspectRatio || "16:9", reference);
      if (fb) b64 = fb;
    }
    if (!b64) {
      return new Response(JSON.stringify({ error: "Image generation failed on both providers" }), {
        status: 502,
        headers: corsHeaders,
      });
    }

    // Upload server-side (service role → works for guests) and return a public URL.
    if (body.storageBucket) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const path = body.storagePath || `ai-images/${crypto.randomUUID()}.png`;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const supabase = createClient(supabaseUrl, serviceKey);
      const { error: upErr } = await supabase.storage
        .from(body.storageBucket)
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (upErr) {
        console.error("Image storage upload error:", upErr.message);
        return new Response(JSON.stringify({ error: `Image upload failed: ${upErr.message}` }), { status: 500, headers: corsHeaders });
      }
      const url = supabase.storage.from(body.storageBucket).getPublicUrl(path).data.publicUrl;
      return new Response(JSON.stringify({ url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ url: `data:image/png;base64,${b64}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gemini-image edge function error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
