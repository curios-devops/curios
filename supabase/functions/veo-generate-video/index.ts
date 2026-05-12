/// <reference lib="deno.ns" />

// Supabase Edge Function: Veo Video Generation
// Genera videos usando Google Vertex AI Veo 3.1

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuración de Vertex AI
const PROJECT_ID = "curios-vertex";
const LOCATION = "us-central1";
const MODEL_ID = "veo-3.1-lite-generate-001"; // Using lite version for faster generation

// Service Account credentials desde Supabase Secrets
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const SERVICE_ACCOUNT_EMAIL = Deno.env.get("VERTEX_AI_SERVICE_ACCOUNT_EMAIL");
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const SERVICE_ACCOUNT_PRIVATE_KEY = Deno.env.get("VERTEX_AI_PRIVATE_KEY");

// Supabase configuration
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const SUPABASE_STORAGE_BUCKET = Deno.env.get("SUPABASE_STORAGE_BUCKET") || "videos";

// Storage backend configuration
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const GCS_VIDEO_BUCKET = Deno.env.get("GCS_VIDEO_BUCKET") || Deno.env.get("VERTEX_VIDEO_BUCKET") || "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const GCS_PUBLIC_READ = (Deno.env.get("GCS_PUBLIC_READ") || "false").toLowerCase() === "true";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const VIDEO_STORAGE_BACKEND = (
  Deno.env.get("VIDEO_STORAGE_BACKEND") || (GCS_VIDEO_BUCKET ? "gcs" : "supabase")
).toLowerCase();
const CLOUDINARY_PROCESS_FUNCTION = "cloudinary-process-video";

function isJwtLike(value: string): boolean {
  return value.startsWith("eyJ") && value.split(".").length === 3;
}

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

function encodeGcsObjectPath(objectName: string): string {
  return objectName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function createGcsPublicUrl(bucket: string, objectName: string): string {
  return `https://storage.googleapis.com/${bucket}/${encodeGcsObjectPath(objectName)}`;
}

async function invokeCloudinaryProcessor(payload: {
  sourceUrl: string;
  userId: string;
  accessToken?: string;
  sourceGcsUri?: string;
}): Promise<{
  provider: "cloudinary";
  originalUrl: string;
  playbackUrl: string;
  h264Url: string;
  h265Url: string;
  publicId: string;
  sourceMode?: "gcs_authorized_url" | "public_url";
}> {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL is not configured");
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isJwtLike(SUPABASE_SERVICE_ROLE_KEY)) {
    headers.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  } else if (SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_")) {
    headers.apikey = SUPABASE_SERVICE_ROLE_KEY;
  } else {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY format is invalid");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${CLOUDINARY_PROCESS_FUNCTION}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data?.success) {
    throw new Error(`Cloudinary processor failed: ${data?.error || response.statusText}`);
  }

  if (!data.cloudinary) {
    throw new Error("Cloudinary processor returned no cloudinary payload");
  }

  return data.cloudinary;
}

async function rewriteGcsObject(
  accessToken: string,
  sourceGcsUri: string,
  destinationBucket: string,
  destinationObjectName: string
): Promise<void> {
  const { bucket: sourceBucket, objectName: sourceObjectName } = parseGcsUri(sourceGcsUri);
  const encodedSourceObject = encodeGcsObjectPath(sourceObjectName);
  const encodedDestinationObject = encodeGcsObjectPath(destinationObjectName);

  let rewriteToken: string | undefined;

  do {
    const rewriteUrl = new URL(
      `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(sourceBucket)}/o/${encodedSourceObject}/rewriteTo/b/${encodeURIComponent(destinationBucket)}/o/${encodedDestinationObject}`
    );

    if (rewriteToken) {
      rewriteUrl.searchParams.set("rewriteToken", rewriteToken);
    }

    if (GCS_PUBLIC_READ) {
      rewriteUrl.searchParams.set("destinationPredefinedAcl", "publicRead");
    }

    const rewriteResponse = await fetch(rewriteUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!rewriteResponse.ok) {
      const errorText = await rewriteResponse.text();
      throw new Error(`Failed to rewrite GCS object: ${rewriteResponse.status} ${errorText}`);
    }

    const rewriteResult = await rewriteResponse.json();
    rewriteToken = rewriteResult.done ? undefined : rewriteResult.rewriteToken;
  } while (rewriteToken);
}

async function uploadBase64ToGcs(
  accessToken: string,
  base64Data: string,
  mimeType: string,
  destinationBucket: string,
  destinationObjectName: string
): Promise<void> {
  const binaryString = atob(base64Data);
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

  const uploadUrl = new URL(`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(destinationBucket)}/o`);
  uploadUrl.searchParams.set("uploadType", "media");
  uploadUrl.searchParams.set("name", destinationObjectName);

  if (GCS_PUBLIC_READ) {
    uploadUrl.searchParams.set("predefinedAcl", "publicRead");
  }

  const uploadResponse = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": mimeType,
    },
    body: bytes,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload base64 video to GCS: ${uploadResponse.status} ${errorText}`);
  }
}

/**
 * Genera un JWT para autenticación con Google OAuth2
 */
async function createJWT(): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  // Encode header y claim
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const claimB64 = btoa(JSON.stringify(claim))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const signatureInput = `${headerB64}.${claimB64}`;

  // Importar private key
  const privateKeyPEM = SERVICE_ACCOUNT_PRIVATE_KEY!
    .replace(/\\n/g, "\n"); // Convertir \n literal a newlines reales

  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPEM
    .substring(
      privateKeyPEM.indexOf(pemHeader) + pemHeader.length,
      privateKeyPEM.indexOf(pemFooter)
    )
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  // Firmar
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${signatureInput}.${signatureB64}`;
}

/**
 * Obtiene access token de Google OAuth2
 */
async function getAccessToken(): Promise<string> {
  const jwt = await createJWT();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Genera un video con Veo 3.1
 */
async function generateVideo(
  accessToken: string,
  prompt: string,
  aspectRatio: string = "16:9"
): Promise<{ operation: string }> {
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predictLongRunning`;

  const requestBody = {
    instances: [{ prompt }],
    parameters: {
      aspectRatio,
      sampleCount: 1,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vertex AI request failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  return { operation: data.name };
}

/**
 * Consulta el status de una operación usando la API oficial de Vertex AI
 * Basado en: https://cloud.google.com/vertex-ai/docs/general/long-running-operations
 */
async function checkOperationStatus(
  accessToken: string,
  operationName: string
): Promise<{ done: boolean; message: string; operationName: string; videoUrl?: string; videoBase64?: string; mimeType?: string; error?: string }> {
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:fetchPredictOperation`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ operationName }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to check operation status: ${error}`);
  }

  const data = await response.json();

  // Log the raw response for debugging
  console.log('[VEO checkStatus] Raw response:', JSON.stringify(data, null, 2));

  // Verificar si la operación está completa según la documentación oficial
  // El campo "done" indica si la operación está completa
  if (data.done) {
    // Verificar si hubo error
    if (data.error) {
      return {
        done: true,
        message: `Video generation failed: ${data.error.message || JSON.stringify(data.error)}`,
        operationName,
        error: data.error.message || JSON.stringify(data.error),
      };
    }

    // Si la operación está completa y no hay error, extraer resultado del video
    if (data.response) {
      const responsePayload = data.response;

      if (responsePayload.videos && responsePayload.videos.length > 0) {
        const video = responsePayload.videos[0];
        const videoUrl = video.gcsUri || video.uri || video.videoUri;
        const videoBase64 = video.bytesBase64Encoded;
        const mimeType = video.mimeType || "video/mp4";

        if (videoUrl) {
          return {
            done: true,
            message: "Video generation completed successfully",
            operationName,
            videoUrl,
            mimeType,
          };
        }

        if (videoBase64) {
          return {
            done: true,
            message: "Video generation completed successfully (inline video bytes)",
            operationName,
            videoBase64,
            mimeType,
          };
        }
      }

      if (responsePayload.predictions && responsePayload.predictions.length > 0) {
        const prediction = responsePayload.predictions[0];
        const videoUrl = prediction.gcsUri || prediction.uri || prediction.videoUri;

        if (videoUrl) {
          return {
            done: true,
            message: "Video generation completed successfully",
            operationName,
            videoUrl,
          };
        }
      }

      if (responsePayload.gcsUri || responsePayload.uri) {
        return {
          done: true,
          message: "Video generation completed successfully",
          operationName,
          videoUrl: responsePayload.gcsUri || responsePayload.uri,
        };
      }

      // Si no encontramos URL, retornar la respuesta completa para debugging
      return {
        done: true,
        message: `Video generation completed but no video URL found. Response: ${JSON.stringify(data.response)}`,
        operationName,
      };
    }

    return {
      done: true,
      message: "Operation completed but no response data found",
      operationName,
    };
  }

  // Operación aún en progreso
  return {
    done: false,
    message: "Video generation in progress. This typically takes 5-15 minutes.",
    operationName,
  };
}

/**
 * DEPRECATED: Use Cloudinary instead to avoid 546 memory errors
 * Descarga un video desde GCS y lo sube a Supabase Storage
 */
async function _saveVideoToStorage(
  accessToken: string,
  gcsUri: string | undefined,
  videoBase64: string | undefined,
  mimeType: string | undefined,
  userId: string
): Promise<{ storagePath: string; publicUrl: string }> {
  let uploadBody: BodyInit;
  const resolvedMimeType = mimeType || "video/mp4";

  if (gcsUri) {
    // Descargar el video desde GCS
    // El gcsUri tiene el formato: gs://bucket-name/path/to/video.mp4
    const gcsPath = gcsUri.replace("gs://", "https://storage.googleapis.com/");

    const videoResponse = await fetch(gcsPath, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!videoResponse.ok) {
      throw new Error(`Failed to download video from GCS: ${videoResponse.statusText}`);
    }

    if (!videoResponse.body) {
      throw new Error("Failed to download video stream from GCS");
    }

    uploadBody = videoResponse.body;
  } else if (videoBase64) {
    const binaryString = atob(videoBase64);
    const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
    uploadBody = bytes;
  } else {
    throw new Error("Either gcsUri or videoBase64 is required to save video");
  }

  // Generar nombre de archivo único
  const timestamp = Date.now();
  const fileName = `veo-${timestamp}.mp4`;
  const storagePath = `videos/${userId}/${fileName}`;

  // Subir a Supabase Storage usando la REST API directamente
  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: (() => {
        const key = SUPABASE_SERVICE_ROLE_KEY || "";

        if (!key) {
          throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
        }

        const baseHeaders: Record<string, string> = {
          "Content-Type": resolvedMimeType,
        };

        if (isJwtLike(key)) {
          baseHeaders.Authorization = `Bearer ${key}`;
          return baseHeaders;
        }

        if (key.startsWith("sb_")) {
          baseHeaders.apikey = key;
          return baseHeaders;
        }

        throw new Error("SUPABASE_SERVICE_ROLE_KEY format is invalid. Expected JWT (eyJ...) or secret key (sb_...)");
      })(),
      body: uploadBody,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Failed to upload to Supabase Storage: ${error}`);
  }

  // Obtener URL pública
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${storagePath}`;

  return {
    storagePath,
    publicUrl,
  };
}

/**
 * DEPRECATED: Use Cloudinary instead to avoid 546 memory errors
 */
async function _saveVideoToGcs(
  accessToken: string,
  gcsUri: string | undefined,
  videoBase64: string | undefined,
  mimeType: string | undefined,
  userId: string
): Promise<{ storagePath: string; publicUrl: string }> {
  if (!GCS_VIDEO_BUCKET) {
    throw new Error("GCS_VIDEO_BUCKET is not configured for gcs backend");
  }

  const resolvedMimeType = mimeType || "video/mp4";
  const timestamp = Date.now();
  const fileName = `veo-${timestamp}.mp4`;
  const objectName = `videos/${userId}/${fileName}`;

  if (gcsUri) {
    await rewriteGcsObject(accessToken, gcsUri, GCS_VIDEO_BUCKET, objectName);
  } else if (videoBase64) {
    await uploadBase64ToGcs(accessToken, videoBase64, resolvedMimeType, GCS_VIDEO_BUCKET, objectName);
  } else {
    throw new Error("Either gcsUri or videoBase64 is required to save to GCS");
  }

  return {
    storagePath: `gs://${GCS_VIDEO_BUCKET}/${objectName}`,
    publicUrl: createGcsPublicUrl(GCS_VIDEO_BUCKET, objectName),
  };
}

// NOTE: saveVideo, saveVideoToStorage, and saveVideoToGcs functions are deprecated
// We now use Cloudinary directly (invokeCloudinaryProcessor) to avoid 546 memory errors
// Keeping functions below for potential rollback or alternative storage backends

async function _saveVideo(
  accessToken: string,
  gcsUri: string | undefined,
  videoBase64: string | undefined,
  mimeType: string | undefined,
  userId: string
): Promise<{ storagePath: string; publicUrl: string; backend: "gcs" | "supabase" }> {
  if (VIDEO_STORAGE_BACKEND === "gcs") {
    const result = await _saveVideoToGcs(accessToken, gcsUri, videoBase64, mimeType, userId);
    return { ...result, backend: "gcs" };
  }

  const result = await _saveVideoToStorage(accessToken, gcsUri, videoBase64, mimeType, userId);
  return { ...result, backend: "supabase" };
}

// Main handler
// @ts-ignore: Deno.serve is available in Supabase Edge Functions runtime
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validar secrets
    if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
      throw new Error(
        "Service Account credentials not configured. Set VERTEX_AI_SERVICE_ACCOUNT_EMAIL and VERTEX_AI_PRIVATE_KEY secrets."
      );
    }

    // Parse request - handle empty body gracefully
    let body;
    try {
      body = await req.json();
    } catch (_jsonError) {
      // Si el body está vacío o no es JSON válido (ej: health checks)
      return new Response(
        JSON.stringify({
          success: false,
          error: "Request body must be valid JSON with 'action' field"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { action, prompt, aspectRatio, operationName, gcsUri, videoBase64, mimeType, userId } = body;

    // Get access token
    const accessToken = await getAccessToken();

    let result;

    if (action === "generate") {
      // Validar prompt
      if (!prompt || typeof prompt !== "string") {
        throw new Error("Invalid prompt. Must be a non-empty string.");
      }

      // Generar video
      result = await generateVideo(accessToken, prompt, aspectRatio);

      return new Response(
        JSON.stringify({
          success: true,
          operation: result.operation,
          message: "Video generation started. Use 'check' action to poll status.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else if (action === "check") {
      // Consultar status
      if (!operationName) {
        throw new Error("operationName is required for 'check' action");
      }

      result = await checkOperationStatus(accessToken, operationName);

      return new Response(
        JSON.stringify({
          success: true,
          ...result,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else if (action === "save") {
      // Save video URL via Cloudinary (no direct file storage to prevent 546 errors)
      if (!userId) {
        throw new Error("userId is required for 'save' action");
      }

      let resolvedGcsUri = gcsUri as string | undefined;
      let resolvedVideoBase64 = videoBase64 as string | undefined;
      let resolvedMimeType = mimeType as string | undefined;
      let sourceUrl: string | undefined;

      // Step 1: Get video URL from operation if not provided
      if (!resolvedGcsUri && !resolvedVideoBase64 && operationName) {
        const operationStatus = await checkOperationStatus(accessToken, operationName);
        if (!operationStatus.done) {
          return new Response(
            JSON.stringify({
              success: true,
              pending: true,
              operationName,
              message: "Operation is still processing; retry save later",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
        if (operationStatus.error) {
          throw new Error(`Operation completed with error: ${operationStatus.error}`);
        }

        resolvedGcsUri = operationStatus.videoUrl;
        resolvedVideoBase64 = operationStatus.videoBase64;
        resolvedMimeType = operationStatus.mimeType;
      }

      if (!resolvedGcsUri && !resolvedVideoBase64) {
        throw new Error("gcsUri, videoBase64, or operationName (with completed output) is required for 'save' action");
      }

      // Step 2: Convert GCS URI to public URL (temporary, for Cloudinary to fetch)
      if (resolvedGcsUri) {
        const gcsPath = resolvedGcsUri.replace("gs://", "https://storage.googleapis.com/");
        sourceUrl = gcsPath;
      } else if (resolvedVideoBase64) {
        // For base64, create a data URL (Cloudinary can't fetch this, will need different approach)
        sourceUrl = `data:${resolvedMimeType || 'video/mp4'};base64,${resolvedVideoBase64}`;
      }

      if (!sourceUrl) {
        throw new Error("Could not determine source URL for video");
      }

      // Step 3: SKIP Supabase Storage entirely - go directly to Cloudinary
      // This prevents 546 memory errors from downloading/uploading large files
      console.log('[VEO Save] Skipping Supabase Storage, using Cloudinary directly to prevent 546 errors');

      let cloudinary: {
        provider: "cloudinary";
        originalUrl: string;
        playbackUrl: string;
        h264Url: string;
        h265Url: string;
        publicId: string;
        sourceMode?: "gcs_authorized_url" | "public_url";
      };

      try {
        cloudinary = await invokeCloudinaryProcessor({
          sourceUrl,
          userId,
          accessToken,
          sourceGcsUri: resolvedGcsUri,
        });

        console.log('[VEO Save] Video uploaded to Cloudinary successfully', {
          playbackUrl: cloudinary.playbackUrl,
          publicId: cloudinary.publicId,
        });

        // Return Cloudinary URLs directly (no Supabase storage path needed)
        return new Response(
          JSON.stringify({
            success: true,
            message: "Video saved to Cloudinary successfully",
            backend: "cloudinary",
            cloudinary,
            storagePath: cloudinary.publicId, // Cloudinary public ID as "path"
            publicUrl: cloudinary.playbackUrl,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (cloudinaryError) {
        // If Cloudinary fails, return the GCS URL as fallback (no storage in Supabase)
        console.error('[VEO Save] Cloudinary upload failed, using GCS URL fallback', {
          error: cloudinaryError instanceof Error ? cloudinaryError.message : cloudinaryError,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Video available via GCS URL (Cloudinary upload failed)",
            backend: "gcs_fallback",
            cloudinary: null,
            storagePath: resolvedGcsUri || "inline_video",
            publicUrl: sourceUrl,
            warning: "Cloudinary optimization failed, using source URL",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    } else {
      throw new Error(`Unknown action: ${action}. Use 'generate', 'check', or 'save'.`);
    }
  } catch (error) {
    console.error("Error in veo-generate-video:", error);

    // Enhanced error logging for debugging
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error,
      timestamp: new Date().toISOString(),
    };

    console.error("Detailed error info:", JSON.stringify(errorDetails, null, 2));

    // Check for common configuration issues
    if (!SERVICE_ACCOUNT_EMAIL) {
      console.error("MISSING: VERTEX_AI_SERVICE_ACCOUNT_EMAIL secret");
    }
    if (!SERVICE_ACCOUNT_PRIVATE_KEY) {
      console.error("MISSING: VERTEX_AI_PRIVATE_KEY secret");
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        // Include error details for debugging (only in development, controlled by env var)
        // @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
        details: Deno.env.get("ENVIRONMENT") === 'development' ? errorDetails : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
