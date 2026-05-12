/**
 * Mix Cinematic Audio Edge Function
 * Mixes narration audio with scene background audio
 * Applies audio ducking to keep narration clear
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MixAudioRequest {
  videoUrl: string;
  narrationUrl: string;
  userId: string;
  videoId: string;
  narrationVolume?: number; // 0.0 - 1.0 (default 1.0)
  backgroundVolume?: number; // 0.0 - 1.0 (default 0.3)
  enableDucking?: boolean; // Auto-lower background when narration plays
}

interface MixAudioResponse {
  success: boolean;
  videoUrl?: string;
  videoPath?: string;
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

    const {
      videoUrl,
      narrationUrl,
      userId,
      videoId,
      narrationVolume = 1.0,
      backgroundVolume = 0.3,
      enableDucking = true,
    } = await req.json() as MixAudioRequest;

    console.log('[MixAudio] Starting audio mixing', {
      videoId,
      narrationVolume,
      backgroundVolume,
      enableDucking,
    });

    // Validate input
    if (!videoUrl || !narrationUrl) {
      throw new Error('videoUrl and narrationUrl are required');
    }

    if (!userId || !videoId) {
      throw new Error('userId and videoId are required');
    }

    // Create temp directory
    const tempDir = await Deno.makeTempDir();

    // Download video file
    console.log('[MixAudio] Downloading video...');
    const videoPath = `${tempDir}/input_video.mp4`;
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }
    const videoData = await videoResponse.arrayBuffer();
    await Deno.writeFile(videoPath, new Uint8Array(videoData));

    // Download narration audio
    console.log('[MixAudio] Downloading narration...');
    const narrationPath = `${tempDir}/narration.mp3`;
    const narrationResponse = await fetch(narrationUrl);
    if (!narrationResponse.ok) {
      throw new Error(`Failed to download narration: ${narrationResponse.statusText}`);
    }
    const narrationData = await narrationResponse.arrayBuffer();
    await Deno.writeFile(narrationPath, new Uint8Array(narrationData));

    const outputPath = `${tempDir}/output.mp4`;

    // Build FFmpeg filter for audio mixing
    let audioFilter: string;

    if (enableDucking) {
      // Advanced: Ducking - lower background audio when narration plays
      // This uses sidechaincompress to automatically reduce background volume during speech
      audioFilter = `[0:a]volume=${backgroundVolume}[bg];` +
                    `[1:a]volume=${narrationVolume}[fg];` +
                    `[bg][fg]sidechaincompress=threshold=0.02:ratio=4:attack=200:release=1000[aout]`;
    } else {
      // Simple: Mix both audio tracks with fixed volumes
      audioFilter = `[0:a]volume=${backgroundVolume}[bg];` +
                    `[1:a]volume=${narrationVolume}[fg];` +
                    `[bg][fg]amix=inputs=2:duration=longest[aout]`;
    }

    // FFmpeg command to mix audio
    const ffmpegCommand = [
      'ffmpeg',
      '-i', videoPath,           // Input video (with original audio)
      '-i', narrationPath,       // Input narration audio
      '-filter_complex', audioFilter,
      '-map', '0:v',            // Use video from first input
      '-map', '[aout]',         // Use mixed audio
      '-c:v', 'copy',           // Copy video stream (no re-encoding)
      '-c:a', 'aac',            // Encode audio as AAC
      '-b:a', '192k',           // Audio bitrate
      '-shortest',              // End when shortest stream ends
      outputPath,
    ];

    console.log('[MixAudio] Running FFmpeg', {
      command: ffmpegCommand.join(' '),
    });

    // Execute FFmpeg
    const process = Deno.run({
      cmd: ffmpegCommand,
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code } = await process.status();
    const rawError = await process.stderrOutput();
    const stderr = new TextDecoder().decode(rawError);

    if (code !== 0) {
      console.error('[MixAudio] FFmpeg failed', { code, stderr });
      throw new Error(`FFmpeg failed with code ${code}: ${stderr}`);
    }

    console.log('[MixAudio] FFmpeg completed successfully');

    // Upload mixed video to Supabase Storage
    const videoBuffer = await Deno.readFile(outputPath);
    const storagePath = `cinematic-videos/${userId}/${videoId}/full_video_mixed.mp4`;

    const { error: uploadError } = await supabaseClient.storage
      .from('cinematic-assets')
      .upload(storagePath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload mixed video: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('cinematic-assets')
      .getPublicUrl(storagePath);

    // Cleanup temp files
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch (cleanupError) {
      console.warn('[MixAudio] Cleanup failed', cleanupError);
    }

    console.log('[MixAudio] Audio mixed and uploaded successfully', {
      publicUrl,
    });

    return new Response(
      JSON.stringify({
        success: true,
        videoUrl: publicUrl,
        videoPath: storagePath,
      } as MixAudioResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[MixAudio] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as MixAudioResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
