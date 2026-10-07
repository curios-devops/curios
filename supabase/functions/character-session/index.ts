// Character (Vivix A1) session broker. The Vivix API key never reaches the
// browser: this function creates / closes live full-body character sessions
// and returns only the per-session credentials (control WebSocket + TRTC room).
//
// POST { action: "create", imageUrl, description, voiceId?, instructions? }
// POST { action: "close", sessionId }
// POST { action: "anam-token", avatarId, voiceId } → { sessionToken }  (half-body mode:
//   Anam renders + speaks only the text we send — its own LLM is disabled)
// POST { action: "describe", imageUrl } → { description, gender, age, vibe }
//   (vision pass for uploaded / generated characters: Vivix needs a scene
//    description, and gender/age/vibe pick a matching voice client-side)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API = "https://api.vivix.ai/v1";
// Hard caps (cost control): a conversation lasts at most 3 minutes and closes
// early when the user goes idle or the page disconnects.
const MAX_DURATION_SECONDS = 180;
const IDLE_TIMEOUT_SECONDS = 90; // backstop: the page itself pauses after 60 s idle
const DISCONNECTED_TIMEOUT_SECONDS = 20;
const DEFAULT_VOICE = "cgSgspJ2msm6clMCkdW9"; // ElevenLabs "Jessica"
// Our own ElevenLabs account, latest low-latency model (85 languages) for live talk.
const TTS_MODEL = "eleven_v4_turbo";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function vivix(path: string, body: unknown) {
  // @ts-ignore Deno global
  const key = Deno.env.get("VIVIX_API_KEY");
  if (!key) throw new Error("VIVIX_API_KEY not configured");
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code !== 0) throw new Error(data.message || `Vivix HTTP ${res.status}`);
  return data.data;
}

async function describeImage(imageUrl: string) {
  // @ts-ignore Deno global
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-6-luna",
      reasoning: { effort: "low" },
      max_output_tokens: 800,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: 'Describe this image for a full-body animated presenter. Return ONLY JSON: {"description": "one or two English sentences: who the person or character is, clothing, hair, and the setting", "gender": "female" | "male" | "neutral", "age": "child" | "young" | "middle_aged" | "old", "vibe": "one or two words, e.g. playful, calm, energetic, professional"}' },
          { type: "input_image", image_url: imageUrl },
        ],
      }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${res.status}`);
  const text: string = data.output_text ??
    (data.output ?? []).flatMap((o: { content?: Array<{ text?: string }> }) => o.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
  return {
    description: typeof parsed.description === "string" ? parsed.description : "A friendly presenter",
    gender: ["female", "male", "neutral"].includes(parsed.gender) ? parsed.gender : "neutral",
    age: ["child", "young", "middle_aged", "old"].includes(parsed.age) ? parsed.age : "young",
    vibe: typeof parsed.vibe === "string" ? parsed.vibe : "friendly",
  };
}

// @ts-ignore Deno global
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();

    if (body.action === "close") {
      if (typeof body.sessionId !== "string" || !body.sessionId) return json({ error: "sessionId required" }, 400);
      const result = await vivix(`realtime-avatar/sessions/${encodeURIComponent(body.sessionId)}/close`, {});
      return json({ status: result.status });
    }

    if (body.action === "anam-token") {
      // @ts-ignore Deno global
      const anamKey = (Deno.env.get("ANAM_API_KEY") || "").replace(/\s+/g, "");
      if (!anamKey) throw new Error("ANAM_API_KEY not configured");
      if (typeof body.avatarId !== "string" || typeof body.voiceId !== "string") return json({ error: "avatarId and voiceId required" }, 400);
      const t0 = Date.now();
      const res = await fetch("https://api.anam.ai/v1/auth/session-token", {
        method: "POST",
        headers: { Authorization: `Bearer ${anamKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personaConfig: {
            name: "Curios Character",
            avatarId: body.avatarId,
            voiceId: body.voiceId,
            llmId: "CUSTOMER_CLIENT_V1", // we drive the words; Anam only renders + speaks
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.sessionToken) throw new Error(data?.message || data?.error || `Anam HTTP ${res.status}`);
      return json({ sessionToken: data.sessionToken, timing: { anamTokenMs: Date.now() - t0 } });
    }

    if (body.action === "describe") {
      if (typeof body.imageUrl !== "string" || !/^https:\/\//.test(body.imageUrl)) return json({ error: "imageUrl (https) required" }, 400);
      return json(await describeImage(body.imageUrl));
    }

    if (body.action === "create") {
      const { imageUrl, description, voiceId, instructions } = body;
      if (typeof imageUrl !== "string" || !/^https:\/\//.test(imageUrl)) return json({ error: "imageUrl (https) required" }, 400);

      const t0 = Date.now();
      const session = await vivix("realtime-avatar/sessions", {
        model: "vivix-a1-stream",
        output: { aspect_ratio: "9:16", resolution: "720p" },
        avatars: [
          {
            avatar_id: "host",
            ...(typeof instructions === "string" && instructions ? { instructions } : {}),
            visual: {
              source_images: [
                {
                  source_image_id: "portrait",
                  url: imageUrl,
                  media_type: imageUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
                  description: typeof description === "string" && description ? description : "A friendly presenter",
                },
              ],
            },
          },
        ],
        pipeline_config: {
          tts_config: {
            tts_provider: "elevenlabs",
            tts_model_id: TTS_MODEL,
            tts_voice_id: typeof voiceId === "string" && voiceId ? voiceId : DEFAULT_VOICE,
            // @ts-ignore Deno global
            ...(Deno.env.get("ELEVENLAB_API_KEY") ? { tts_api_key: Deno.env.get("ELEVENLAB_API_KEY") } : {}),
          },
        },
        max_duration_seconds: MAX_DURATION_SECONDS,
        auto_close: {
          disconnected_timeout_seconds: DISCONNECTED_TIMEOUT_SECONDS,
          interaction_idle_timeout_seconds: IDLE_TIMEOUT_SECONDS,
        },
        recording_mode: "off",
      });

      const vivixCreateMs = Date.now() - t0;
      return json({
        timing: { vivixCreateMs },
        sessionId: session.session_id,
        expiresAt: session.expires_at ?? null,
        control: session.control,
        trtc: session.delivery?.media?.trtc ?? null,
      });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("character-session failed", e);
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
