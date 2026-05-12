type Clip = {
  publicId: string;
  transform?: string;
};

type ModelName = "none" | "ltx-2-fast" | "wan";

type GenerateBody = {
  clips?: Clip[];
  format?: string;
  normalize?: string;
  cloudName?: string;
  model?: ModelName;
  executeModelCall?: boolean;
  prompt?: string;
  duration?: number;
  generate_audio?: boolean;
  action?: "concat" | "model" | "both";
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getWavespeedEndpoint(model: ModelName) {
  if (model === "ltx-2-fast") {
    return "https://api.wavespeed.ai/api/v3/lightricks/ltx-2-fast/text-to-video";
  }

  if (model === "wan") {
    return "https://api.wavespeed.ai/api/v3/wan/wan-2.1/text-to-video";
  }

  return null;
}

function buildWavespeedPayload(body: GenerateBody) {
  return {
    duration: typeof body.duration === "number" ? body.duration : 8,
    generate_audio: typeof body.generate_audio === "boolean" ? body.generate_audio : true,
    prompt: body.prompt ?? "Cinematic shot with dynamic movement and rich lighting.",
  };
}

function extractWavespeedVideoUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;

  if (typeof record.videoUrl === "string" && record.videoUrl.length > 0) {
    return record.videoUrl;
  }

  if (Array.isArray(record.outputs) && record.outputs.length > 0 && typeof record.outputs[0] === "string") {
    return record.outputs[0];
  }

  const nestedData = record.data;
  if (nestedData && typeof nestedData === "object") {
    const nested = nestedData as Record<string, unknown>;
    if (typeof nested.videoUrl === "string" && nested.videoUrl.length > 0) {
      return nested.videoUrl;
    }
    if (Array.isArray(nested.outputs) && nested.outputs.length > 0 && typeof nested.outputs[0] === "string") {
      return nested.outputs[0];
    }
  }

  return null;
}

function buildCloudinaryConcatUrl(
  cloudName: string,
  clips: Clip[],
  normalize = "c_fill,w_1280,h_720",
  format = "mp4",
) {
  if (!clips || clips.length === 0) throw new Error("clips required");

  // base transform applied before layer splice operations
  const baseTransform = encodeURIComponent(normalize);

  // For each clip we create a layer with the normalized transform and fl_splice
  const layerParts = clips
    .map((c) => `l_video:${encodeURIComponent(c.publicId)},${encodeURIComponent(normalize)},fl_splice`)
    .join("/");

  // The final public id part can be arbitrary for a spliced result; Cloudinary expects a resource at the end.
  // We'll use 'spliced_result' as a harmless placeholder public id — replace if you want a signed/uploaded id.
  const finalPublicId = "spliced_result";

  // quality and format flags
  const qualityAndFormat = `f_${encodeURIComponent(format)},q_auto:good`;

  const url = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/video/upload/${baseTransform}/${layerParts}/${qualityAndFormat}/${finalPublicId}.${encodeURIComponent(format)}`;

  return url;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/health") {
      const warnings = [] as string[];
      if (!Deno.env.get("WAVESPEED_API_KEY")) warnings.push("WAVESPEED_API_KEY not configured");
      if (!Deno.env.get("CLOUDINARY_CLOUD_NAME")) warnings.push("CLOUDINARY_CLOUD_NAME not configured");
      warnings.push("Wavespeed calls are disabled by default. Send executeModelCall=true to enable network calls.");
      return jsonResponse({ ok: true, warnings });
    }

    if (req.method === "POST") {
      const body = (await req.json().catch(() => null)) as GenerateBody | null;
      if (!body) {
        return jsonResponse({ error: "POST body must be valid JSON" }, 400);
      }
      const warnings: string[] = [];
      if (!Deno.env.get("WAVESPEED_API_KEY")) warnings.push("WAVESPEED_API_KEY not configured on the function (set in Supabase dashboard)");

      const action = body.action ?? "both";
      const wantsModel = action === "model" || action === "both";
      const wantsConcat = action === "concat" || action === "both";

      let concatUrl: string | null = null;
      if (wantsConcat) {
        if (!Array.isArray(body.clips) || body.clips.length === 0) {
          return jsonResponse({ error: 'When action includes concat, body.clips must be a non-empty array' }, 400);
        }

        const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME") || body.cloudName;
        if (!cloudName) {
          return jsonResponse({ error: "CLOUDINARY_CLOUD_NAME is required as env var or body.cloudName" }, 500);
        }

        const normalize = Deno.env.get("CLOUDINARY_NORMALIZE") || body.normalize || "c_fill,w_1280,h_720";
        const format = (body.format as string) || "mp4";
        concatUrl = buildCloudinaryConcatUrl(cloudName, body.clips, normalize, format);
      }

      const model: ModelName = body.model ?? "none";
      const executeModelCall = body.executeModelCall === true;
      const endpoint = wantsModel ? getWavespeedEndpoint(model) : null;
      const wavespeedPayload = endpoint ? buildWavespeedPayload(body) : null;

      let wavespeed: {
        model: ModelName;
        endpoint: string | null;
        executeModelCall: boolean;
        requestPayload: Record<string, unknown> | null;
        videoUrl?: string;
        response?: unknown;
      } = {
        model,
        endpoint,
        executeModelCall,
        requestPayload: wavespeedPayload,
      };

      if (endpoint && !executeModelCall) {
        warnings.push("Wavespeed call prepared but not executed (executeModelCall=false). This is expected for your current Pexels/Pixabay/VEO-first testing flow.");
      }

      if (endpoint && executeModelCall) {
        const apiKey = Deno.env.get("WAVESPEED_API_KEY");
        if (!apiKey) {
          return jsonResponse({ error: "WAVESPEED_API_KEY is required when executeModelCall=true", warnings, wavespeed }, 500);
        }

        const upstream = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(wavespeedPayload),
        });

        const upstreamText = await upstream.text();
        let upstreamBody: unknown = upstreamText;
        try {
          upstreamBody = JSON.parse(upstreamText);
        } catch {
          upstreamBody = upstreamText;
        }

        const videoUrl = extractWavespeedVideoUrl(upstreamBody);

        wavespeed = {
          ...wavespeed,
          response: {
            status: upstream.status,
            ok: upstream.ok,
            body: upstreamBody,
          },
          videoUrl: videoUrl ?? undefined,
        };
      }

      return jsonResponse({
        url: concatUrl,
        warnings,
        wavespeed,
      });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
