/**
 * Stitch Cinematic Video Edge Function
 * Stitches multiple scene videos into one complete video with transitions
 * Uses FFmpeg for video processing
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StitchRequest {
  scenes: SceneVideo[];
  transitionType?: 'fade' | 'dissolve' | 'wipe' | 'none';
  transitionDuration?: number;
  userId: string;
  videoId: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

interface SceneVideo {
  id: string;
  videoUrl: string;
  duration: number;
  order: number;
}

interface StitchResponse {
  success: boolean;
  videoUrl?: string;
  videoPath?: string;
  duration?: number;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { scenes, transitionType = 'dissolve', transitionDuration = 0.5, userId, videoId, aspectRatio = '16:9' } =
      await req.json() as StitchRequest;

    console.log('[StitchVideo] Starting video stitching', {
      sceneCount: scenes.length,
      transitionType,
      videoId,
    });

    // Validate input
    if (!scenes || scenes.length === 0) {
      throw new Error('No scenes provided for stitching');
    }

    if (!userId || !videoId) {
      throw new Error('userId and videoId are required');
    }

    // Sort scenes by order
    const sortedScenes = [...scenes].sort((a, b) => a.order - b.order);

    // Download all scene videos to temp directory
    const tempDir = await Deno.makeTempDir();
    const videoFiles: string[] = [];

    for (let i = 0; i < sortedScenes.length; i++) {
      const scene = sortedScenes[i];
      const filePath = `${tempDir}/scene_${i}.mp4`;

      console.log(`[StitchVideo] Downloading scene ${i + 1}/${sortedScenes.length}`, {
        sceneId: scene.id,
        url: scene.videoUrl,
      });

      // Download video file
      const response = await fetch(scene.videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download scene ${scene.id}: ${response.statusText}`);
      }

      const videoData = await response.arrayBuffer();
      await Deno.writeFile(filePath, new Uint8Array(videoData));
      videoFiles.push(filePath);
    }

    // Create FFmpeg concat file
    const concatFilePath = `${tempDir}/concat.txt`;
    const concatContent = videoFiles.map((file) => `file '${file}'`).join('\n');
    await Deno.writeTextFile(concatFilePath, concatContent);

    const outputPath = `${tempDir}/output.mp4`;

    // Build FFmpeg command based on transition type
    let ffmpegCommand: string[];

    if (transitionType === 'none' || sortedScenes.length === 1) {
      // Simple concatenation without transitions
      ffmpegCommand = [
        'ffmpeg',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFilePath,
        '-c', 'copy',
        outputPath,
      ];
    } else {
      // Complex filter with transitions
      const filterComplex = buildTransitionFilter(
        sortedScenes.length,
        transitionType,
        transitionDuration
      );

      const inputArgs: string[] = [];
      for (const file of videoFiles) {
        inputArgs.push('-i', file);
      }

      ffmpegCommand = [
        'ffmpeg',
        ...inputArgs,
        '-filter_complex', filterComplex,
        '-map', '[vout]',
        '-map', '0:a?', // Audio from first video
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        outputPath,
      ];
    }

    console.log('[StitchVideo] Running FFmpeg', {
      command: ffmpegCommand.join(' '),
    });

    // Execute FFmpeg
    const process = Deno.run({
      cmd: ffmpegCommand,
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code } = await process.status();
    const rawOutput = await process.output();
    const rawError = await process.stderrOutput();

    const stdout = new TextDecoder().decode(rawOutput);
    const stderr = new TextDecoder().decode(rawError);

    if (code !== 0) {
      console.error('[StitchVideo] FFmpeg failed', { code, stderr });
      throw new Error(`FFmpeg failed with code ${code}: ${stderr}`);
    }

    console.log('[StitchVideo] FFmpeg completed successfully');

    // Upload stitched video to Supabase Storage
    const videoBuffer = await Deno.readFile(outputPath);
    const storagePath = `cinematic-videos/${userId}/${videoId}/full_video.mp4`;

    const { error: uploadError } = await supabaseClient.storage
      .from('cinematic-assets')
      .upload(storagePath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload stitched video: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('cinematic-assets')
      .getPublicUrl(storagePath);

    // Calculate total duration
    const totalDuration = sortedScenes.reduce((sum, scene) => sum + scene.duration, 0);

    // Cleanup temp files
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch (cleanupError) {
      console.warn('[StitchVideo] Cleanup failed', cleanupError);
    }

    console.log('[StitchVideo] Video stitched and uploaded successfully', {
      publicUrl,
      duration: totalDuration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        videoUrl: publicUrl,
        videoPath: storagePath,
        duration: totalDuration,
      } as StitchResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[StitchVideo] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as StitchResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Build FFmpeg filter complex for transitions
 */
function buildTransitionFilter(
  sceneCount: number,
  transitionType: string,
  duration: number
): string {
  if (sceneCount === 1) {
    return '[0:v]copy[vout]';
  }

  const filters: string[] = [];
  let currentLabel = '0:v';

  for (let i = 1; i < sceneCount; i++) {
    const nextInput = `${i}:v`;
    const outputLabel = i === sceneCount - 1 ? 'vout' : `v${i}`;

    // xfade filter for transitions
    const transition = transitionType === 'fade' ? 'fade' :
                      transitionType === 'dissolve' ? 'dissolve' :
                      transitionType === 'wipe' ? 'wipeleft' : 'fade';

    filters.push(
      `[${currentLabel}][${nextInput}]xfade=transition=${transition}:duration=${duration}:offset=0[${outputLabel}]`
    );

    currentLabel = outputLabel;
  }

  return filters.join(';');
}
