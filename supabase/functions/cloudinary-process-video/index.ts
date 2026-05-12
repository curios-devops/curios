// Cloudinary process video
export {};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const CLOUDINARY_CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME") || "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const CLOUDINARY_API_KEY = Deno.env.get("CLOUDINARY_API_KEY") || "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const CLOUDINARY_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET") || "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const CLOUDINARY_FOLDER = Deno.env.get("CLOUDINARY_FOLDER") || "cinematic/veo";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const GCS_PUBLIC_READ = (Deno.env.get("GCS_PUBLIC_READ") || "false").toLowerCase() === "true";

const CDN_HOST_HINTS = [
  "pexels.com",
  "pixabay.com",
  "googleapis.com",
  "supabase.co",
  "cloudfront.net",
  "akamaihd.net",
  "akamaized.net",
  "samplelib.com",
  "res.cloudinary.com",
];

const BLOCKED_HOST_HINTS = [
  "player.vimeo.com",
  "vimeo.com",
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
];

function parseGcsUri(gcsUri: string): { bucket: string; objectName: string } {
  if (!gcsUri.startsWith("gs://")) {
    throw new Error(`Invalid gcsUri: ${gcsUri}`);
  }

  const path = gcsUri.replace("gs://", "");
  const slashIndex = path.indexOf("/");

  if (slashIndex === -1) {
    throw new Error(`Invalid gcsUri (missing object path): ${gcsUri}`);
  }

  const bucket = path.slice(0, slashIndex);
  const objectName = path.slice(slashIndex + 1);

  if (!bucket || !objectName) {
    throw new Error(`Invalid gcsUri: ${gcsUri}`);
  }

  return { bucket, objectName };
}

function createGcsAuthorizedDownloadUrl(accessToken: string, gcsUri: string): string {
  const { bucket, objectName } = parseGcsUri(gcsUri);
  const endpoint = new URL(
    `https://storage.googleapis.com/download/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}`
  );
  endpoint.searchParams.set("alt", "media");
  endpoint.searchParams.set("access_token", accessToken);
  return endpoint.toString();
}

async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function createCloudinarySignature(params: Record<string, string>): Promise<string> {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return await sha1Hex(`${sorted}${CLOUDINARY_API_SECRET}`);
}

function buildCloudinaryTransformedUrl(options: {
  cloudName: string;
  publicId: string;
  format?: string;
  transformation: string;
}): string {
  const { cloudName, publicId, format, transformation } = options;
  const extension = format || "mp4";
  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformation}/${publicId}.${extension}`;
}

function formatDurationSeconds(value: number): string {
  // Allow 0 for start offsets, but ensure positive durations
  if (value === 0) return '0';
  return Math.max(0.1, value).toFixed(2).replace(/\.00$/, '');
}

function toCloudinaryLayerPublicId(publicId: string): string {
  return publicId.replace(/\//g, ':');
}

function splitTextIntoLines(text: string, maxCharsPerLine: number = 45, maxLines = 12): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, maxLines);
}

function buildTimedCaptionLayers(text: string, durationSeconds?: number): string | undefined {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return undefined;

  const lines = splitTextIntoLines(cleaned, 45, 4);
  if (lines.length === 0) return undefined;

  if (lines.length > 4) {
    const overflow = lines.slice(3).join(' ');
    lines.splice(3, lines.length - 3, overflow);
  }

  const firstBlock = lines.slice(2, 4);
  const secondBlock = lines.slice(0, 2);
  const layers: string[] = [];

  const totalDuration = typeof durationSeconds === 'number' && Number.isFinite(durationSeconds)
    ? Math.max(durationSeconds, 0.1)
    : undefined;
  const halfDuration = totalDuration ? totalDuration / 2 : undefined;
  const timingGap = totalDuration ? Math.min(0.12, Math.max(0.04, totalDuration * 0.02)) : 0;
  const firstStart = 0;
  const firstDuration = totalDuration ? Math.max(0.2, (halfDuration || totalDuration) - timingGap) : undefined;
  const secondStart = totalDuration && halfDuration ? Math.min(totalDuration, halfDuration + timingGap) : undefined;
  const secondDuration = totalDuration && secondStart !== undefined
    ? Math.max(0.2, totalDuration - secondStart)
    : undefined;

  const renderBlock = (
    blockLines: string[],
    gravity: 'north' | 'south',
    yOffset: number,
    blockIndex: number,
    start?: number,
    duration?: number
  ) => {
    if (blockLines.length === 0) return;

    const multiLineText = blockLines.join('\n');
    const encoded = encodeURIComponent(multiLineText)
      .replace(/%2C/gi, '%252C')
      .replace(/%2F/gi, '%252F')
      .replace(/%3F/gi, '%253F')
      .replace(/%23/gi, '%2523');

    const timing =
      start !== undefined && duration !== undefined
        ? `,so_${formatDurationSeconds(start)},du_${formatDurationSeconds(duration)}`
        : '';
    const layer = `l_text:Arial_22_bold_line_spacing_8_stroke:${encoded},co_white,g_${gravity},y_${yOffset}${timing},fl_layer_apply`;

    // @ts-ignore: Deno console is available
    console.log(`[buildTimedCaptionLayers] Block ${blockIndex}: g_${gravity}, y=${yOffset}, text="${multiLineText.substring(0, 30)}..."`);

    layers.push(layer);
  };

  // Block 1 higher (top area), block 2 lower (bottom area)
  renderBlock(firstBlock, 'north', 160, 0, firstStart, firstDuration);
  renderBlock(secondBlock, 'south', 140, 1, secondStart, secondDuration);

  return layers.join('/');
}

function hostMatchesHint(hostname: string, hints: string[]): boolean {
  return hints.some((hint) => hostname === hint || hostname.endsWith(`.${hint}`));
}

function getUrlHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLikelyCdnSource(url: string): boolean {
  const hostname = getUrlHostname(url);
  if (!hostname) return false;
  return hostMatchesHint(hostname, CDN_HOST_HINTS);
}

function isLikelyBlockedSource(url: string): boolean {
  const hostname = getUrlHostname(url);
  if (!hostname) return true;
  return hostMatchesHint(hostname, BLOCKED_HOST_HINTS);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

type CloudinaryUploadResult = {
  public_id: string;
  format?: string;
  secure_url?: string;
  duration?: number | string;
};

async function uploadToCloudinary(params: {
  fileValue: string;
  publicId: string;
  timestamp: string;
}): Promise<CloudinaryUploadResult> {
  const { fileValue, publicId, timestamp } = params;

  const signParams: Record<string, string> = {
    folder: CLOUDINARY_FOLDER,
    overwrite: "true",
    public_id: publicId,
    timestamp,
  };

  const signature = await createCloudinarySignature(signParams);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

  const uploadBody = new URLSearchParams({
    file: fileValue,
    folder: CLOUDINARY_FOLDER,
    overwrite: "true",
    public_id: publicId,
    timestamp,
    api_key: CLOUDINARY_API_KEY,
    signature,
  });

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: uploadBody.toString(),
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Cloudinary upload failed (${uploadResponse.status}): ${errorText}`);
  }

  return await uploadResponse.json() as CloudinaryUploadResult;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error("Cloudinary credentials not configured");
    }

    const body = await req.json();
    const { sourceUrl, sourceBase64, sourceMimeType, userId, accessToken, sourceGcsUri, targetDurationSeconds, narrationAudioUrl, narrationText } = body as {
      sourceUrl?: string;
      sourceBase64?: string;
      sourceMimeType?: string;
      userId?: string;
      accessToken?: string;
      sourceGcsUri?: string;
      targetDurationSeconds?: number;
      narrationAudioUrl?: string;
      narrationText?: string;
    };

    if ((!sourceUrl || typeof sourceUrl !== "string") && (!sourceBase64 || typeof sourceBase64 !== "string")) {
      throw new Error("Either sourceUrl or sourceBase64 is required");
    }

    if (!userId || typeof userId !== "string") {
      throw new Error("userId is required");
    }

    const sourceForCloudinary =
      !GCS_PUBLIC_READ && sourceGcsUri && accessToken
        ? createGcsAuthorizedDownloadUrl(accessToken, sourceGcsUri)
        : sourceUrl;

    const sourceDataUrlFromClient =
      sourceBase64 && sourceBase64.trim().length > 0
        ? `data:${sourceMimeType || "video/mp4"};base64,${sourceBase64.trim()}`
        : undefined;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    // Don't include CLOUDINARY_FOLDER in publicId - it's added via the folder parameter
    const publicId = `${userId}/veo_${Date.now()}`;

    let uploaded: CloudinaryUploadResult;
    if (sourceDataUrlFromClient) {
      uploaded = await uploadToCloudinary({
        fileValue: sourceDataUrlFromClient,
        publicId,
        timestamp,
      });
    } else {
      if (!sourceForCloudinary || typeof sourceForCloudinary !== "string") {
        throw new Error("Could not resolve source URL for upload");
      }

      if (!isLikelyCdnSource(sourceForCloudinary) && isLikelyBlockedSource(sourceForCloudinary)) {
        throw new Error(
          "Source URL is likely blocked for server-side fetch/upload. Provide sourceBase64 from client or use a direct CDN URL (Pexels/Pixabay/Supabase/GCS)."
        );
      }

      try {
        uploaded = await uploadToCloudinary({
          fileValue: sourceForCloudinary,
          publicId,
          timestamp,
        });
      } catch (sourceUploadError) {
      const message = sourceUploadError instanceof Error ? sourceUploadError.message : String(sourceUploadError);
      const shouldRetryWithFetchedBytes =
        typeof sourceForCloudinary === "string" &&
        sourceForCloudinary.startsWith("http") &&
        (message.includes("Error in loading") || message.includes("403") || message.includes("401"));

      if (!shouldRetryWithFetchedBytes) {
        throw sourceUploadError;
      }

      const sourceFetchResponse = await fetch(sourceForCloudinary, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CuriosAI/1.0)",
          "Accept": "video/*,*/*;q=0.8",
        },
      });

      if (!sourceFetchResponse.ok) {
        throw new Error(`Source fetch failed (${sourceFetchResponse.status}) before Cloudinary upload fallback`);
      }

      const sourceBytes = new Uint8Array(await sourceFetchResponse.arrayBuffer());
      const sourceMimeType = sourceFetchResponse.headers.get("content-type") || "video/mp4";
      const sourceDataUrl = `data:${sourceMimeType};base64,${bytesToBase64(sourceBytes)}`;

      uploaded = await uploadToCloudinary({
        fileValue: sourceDataUrl,
        publicId,
        timestamp,
      });
    }
    }
    const uploadedPublicId = uploaded.public_id as string;
    const uploadedFormat = (uploaded.format as string) || "mp4";
    const originalUrl = (uploaded.secure_url as string) || sourceUrl;
    const uploadedDurationSeconds = Number(uploaded.duration || 0);

    const normalizedTargetDuration =
      typeof targetDurationSeconds === "number" && Number.isFinite(targetDurationSeconds) && targetDurationSeconds > 0
        ? targetDurationSeconds
        : undefined;

    let narrationAudioPublicId: string | undefined;
    let narrationAudioDurationSeconds: number | undefined;
    if (typeof narrationAudioUrl === "string" && narrationAudioUrl.trim().length > 0) {
      // Don't include CLOUDINARY_FOLDER in publicId - it's added via the folder parameter
      const audioPublicId = `${userId}/audio_${Date.now()}`;
      const uploadedAudio = await uploadToCloudinary({
        fileValue: narrationAudioUrl,
        publicId: audioPublicId,
        timestamp,
      });
      narrationAudioPublicId = uploadedAudio.public_id as string;
      const parsedAudioDuration = Number(uploadedAudio.duration || 0);
      narrationAudioDurationSeconds = Number.isFinite(parsedAudioDuration) && parsedAudioDuration > 0
        ? parsedAudioDuration
        : undefined;
    }

    const syncDurationSeconds = narrationAudioDurationSeconds
      ? narrationAudioDurationSeconds + 0.3
      : normalizedTargetDuration;

    const durationTransform = syncDurationSeconds
      ? uploadedDurationSeconds < syncDurationSeconds
        ? (() => {
            const loopCount = Math.floor(syncDurationSeconds / uploadedDurationSeconds);
            return `e_loop:${loopCount},so_0,du_${formatDurationSeconds(syncDurationSeconds)}`;
          })()
        : `so_0,du_${formatDurationSeconds(syncDurationSeconds)}`
      : undefined;

    const audioOverlayTransform = narrationAudioPublicId
      ? `e_volume:30/l_video:${toCloudinaryLayerPublicId(narrationAudioPublicId)},fl_layer_apply,so_0`
      : undefined;

    const captionOverlayTransform =
      typeof narrationText === "string" && narrationText.trim().length > 0
        ? buildTimedCaptionLayers(narrationText, syncDurationSeconds || uploadedDurationSeconds)
        : undefined;

    const fadeInTransform = "e_fade:200";
    const fadeOutTransform = syncDurationSeconds
      ? `e_fade:200,so_${formatDurationSeconds(Math.max(syncDurationSeconds - 0.2, 0))}`
      : undefined;

    const h264Transform = [
      durationTransform,
      audioOverlayTransform,
      captionOverlayTransform,
      fadeInTransform,
      fadeOutTransform,
      "f_mp4,vc_h264,br_2000k,q_auto:good",
    ]
      .filter(Boolean)
      .join("/");

    const h265Transform = [
      durationTransform,
      audioOverlayTransform,
      captionOverlayTransform,
      fadeInTransform,
      fadeOutTransform,
      "f_mp4,vc_h265,br_1200k,q_auto:good",
    ]
      .filter(Boolean)
      .join("/");

    const h264Url = buildCloudinaryTransformedUrl({
      cloudName: CLOUDINARY_CLOUD_NAME,
      publicId: uploadedPublicId,
      format: uploadedFormat,
      transformation: h264Transform,
    });

    const h265Url = buildCloudinaryTransformedUrl({
      cloudName: CLOUDINARY_CLOUD_NAME,
      publicId: uploadedPublicId,
      format: uploadedFormat,
      transformation: h265Transform,
    });

    // @ts-ignore: Deno console is available
    console.log(`[Cloudinary] h264 URL: ${h264Url}`);
    // @ts-ignore: Deno console is available
    console.log(`[Cloudinary] Caption transform part: ${captionOverlayTransform?.substring(0, 200)}...`);

    const durationMode = !syncDurationSeconds
      ? "none"
      : uploadedDurationSeconds > syncDurationSeconds
        ? "trim"
        : uploadedDurationSeconds < syncDurationSeconds
          ? "extend_loop"
          : "none";

    const cloudinary = {
      provider: "cloudinary" as const,
      originalUrl,
      playbackUrl: h264Url,
      h264Url,
      h265Url,
      publicId: uploadedPublicId,
      sourceMode: !GCS_PUBLIC_READ && sourceGcsUri && accessToken ? "gcs_authorized_url" : "public_url",
      sourceDurationSeconds: uploadedDurationSeconds || undefined,
      targetDurationSeconds: syncDurationSeconds,
      durationMode,
      audioMixed: !!narrationAudioPublicId,
      narrationAudioPublicId,
    };

    return new Response(
      JSON.stringify({
        success: true,
        cloudinary,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});