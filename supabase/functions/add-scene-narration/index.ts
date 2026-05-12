// Supabase Edge Function: Add Scene Narration
// Combines scene video with TTS narration audio and text overlay

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const SUPABASE_STORAGE_BUCKET = Deno.env.get("SUPABASE_STORAGE_BUCKET") || "videos";

interface TextOverlayConfig {
  text: string;
  position?: "top" | "bottom" | "center";
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
}

interface AddNarrationRequest {
  videoUrl: string;
  narrationAudio: string; // base64 encoded
  textOverlay?: TextOverlayConfig;
  userId: string;
  sceneId: string;
}

/**
 * Downloads a file from URL to temp directory
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file from ${url}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  // @ts-ignore: Deno.writeFile is available in Deno runtime
  await Deno.writeFile(destPath, new Uint8Array(arrayBuffer));
}

/**
 * Uploads a file to Supabase Storage
 */
async function uploadToStorage(
  filePath: string,
  storagePath: string,
  contentType: string
): Promise<string> {
  // @ts-ignore: Deno.readFile is available in Deno runtime
  const fileData = await Deno.readFile(filePath);

  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: fileData,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Failed to upload to Supabase Storage: ${error}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${storagePath}`;
}

/**
 * Combines video with narration audio and text overlay using FFmpeg
 */
async function addNarrationToScene(request: AddNarrationRequest): Promise<string> {
  const { videoUrl, narrationAudio, textOverlay, userId, sceneId } = request;

  // Create temp directory
  const tempDir = `/tmp/narration-${Date.now()}`;
  // @ts-ignore: Deno.mkdir is available in Deno runtime
  await Deno.mkdir(tempDir, { recursive: true });

  try {
    // Download video
    const videoPath = `${tempDir}/input.mp4`;
    await downloadFile(videoUrl, videoPath);

    // Decode and save narration audio
    const audioPath = `${tempDir}/narration.mp3`;
    const audioData = Uint8Array.from(atob(narrationAudio), (c) => c.charCodeAt(0));
    // @ts-ignore: Deno.writeFile is available in Deno runtime
    await Deno.writeFile(audioPath, audioData);

    // Output path
    const outputPath = `${tempDir}/output.mp4`;

    // Build FFmpeg command
    const ffmpegArgs = [
      "ffmpeg",
      "-i", videoPath,
      "-i", audioPath,
    ];

    // Add text overlay filter if provided
    if (textOverlay) {
      const { text, position = "bottom", fontSize = 48, fontColor = "white", backgroundColor = "black@0.7" } = textOverlay;

      // Calculate Y position
      let yPos = "h-100"; // bottom
      if (position === "top") {
        yPos = "50";
      } else if (position === "center") {
        yPos = "(h-text_h)/2";
      }

      const textFilter = `drawtext=text='${text.replace(/'/g, "\\'")}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=${yPos}:box=1:boxcolor=${backgroundColor}:boxborderw=10`;

      ffmpegArgs.push(
        "-vf", textFilter,
        "-map", "0:v:0", // video from first input
        "-map", "1:a:0", // audio from second input
      );
    } else {
      // No text overlay, just combine video + audio
      ffmpegArgs.push(
        "-map", "0:v:0",
        "-map", "1:a:0",
      );
    }

    // Add output settings
    ffmpegArgs.push(
      "-c:v", "libx264",
      "-preset", "fast",
      "-c:a", "aac",
      "-shortest", // End when shortest stream ends
      "-y", // Overwrite output
      outputPath,
    );

    console.log(`Running FFmpeg:`, ffmpegArgs.join(" "));

    // Run FFmpeg
    // @ts-ignore: Deno.Command is available in Deno runtime
    const command = new Deno.Command(ffmpegArgs[0], {
      args: ffmpegArgs.slice(1),
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await command.output();

    if (code !== 0) {
      const errorOutput = new TextDecoder().decode(stderr);
      console.error("FFmpeg error:", errorOutput);
      throw new Error(`FFmpeg failed with code ${code}: ${errorOutput}`);
    }

    // Upload enhanced video to storage
    const timestamp = Date.now();
    const storagePath = `videos/${userId}/scenes/${sceneId}-enhanced-${timestamp}.mp4`;
    const publicUrl = await uploadToStorage(outputPath, storagePath, "video/mp4");

    console.log(`Scene narration added successfully: ${publicUrl}`);

    return publicUrl;
  } finally {
    // Cleanup temp files
    try {
      // @ts-ignore: Deno.remove is available in Deno runtime
      await Deno.remove(tempDir, { recursive: true });
    } catch (error) {
      console.warn("Failed to cleanup temp directory:", error);
    }
  }
}

// Main handler
// @ts-ignore: Deno.serve is available in Supabase Edge Functions runtime
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate environment
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }

    // Parse request
    const request: AddNarrationRequest = await req.json();

    // Validate required fields
    if (!request.videoUrl) {
      throw new Error("videoUrl is required");
    }
    if (!request.narrationAudio) {
      throw new Error("narrationAudio (base64) is required");
    }
    if (!request.userId) {
      throw new Error("userId is required");
    }
    if (!request.sceneId) {
      throw new Error("sceneId is required");
    }

    // Process video
    const enhancedVideoUrl = await addNarrationToScene(request);

    return new Response(
      JSON.stringify({
        success: true,
        videoUrl: enhancedVideoUrl,
        message: "Scene narration added successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in add-scene-narration:", error);

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
