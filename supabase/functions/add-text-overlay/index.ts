/**
 * Add Text Overlay Edge Function
 * Adds text captions/overlays to video using FFmpeg
 * Syncs text with scene timing
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TextSegment {
  text: string;
  startTime: number; // seconds
  endTime: number;   // seconds
  position?: 'top' | 'center' | 'bottom';
  fontSize?: number;
  fontColor?: string;
}

interface TextOverlayRequest {
  videoUrl: string;
  textSegments: TextSegment[];
  userId: string;
  videoId: string;
  fontFamily?: string;
  defaultFontSize?: number;
  defaultPosition?: 'top' | 'center' | 'bottom';
}

interface TextOverlayResponse {
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
      textSegments,
      userId,
      videoId,
      fontFamily = 'Arial',
      defaultFontSize = 48,
      defaultPosition = 'bottom',
    } = await req.json() as TextOverlayRequest;

    console.log('[TextOverlay] Starting text overlay processing', {
      videoId,
      segmentCount: textSegments.length,
    });

    // Validate input
    if (!videoUrl) {
      throw new Error('videoUrl is required');
    }

    if (!textSegments || textSegments.length === 0) {
      throw new Error('textSegments are required');
    }

    if (!userId || !videoId) {
      throw new Error('userId and videoId are required');
    }

    // Create temp directory
    const tempDir = await Deno.makeTempDir();

    // Download video file
    console.log('[TextOverlay] Downloading video...');
    const videoPath = `${tempDir}/input_video.mp4`;
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }
    const videoData = await videoResponse.arrayBuffer();
    await Deno.writeFile(videoPath, new Uint8Array(videoData));

    // Create SRT subtitle file
    const subtitlePath = `${tempDir}/subtitles.srt`;
    const srtContent = generateSRT(textSegments);
    await Deno.writeTextFile(subtitlePath, srtContent);

    console.log('[TextOverlay] Generated SRT file', {
      path: subtitlePath,
      segmentCount: textSegments.length,
    });

    const outputPath = `${tempDir}/output.mp4`;

    // Build subtitle style string
    const position = defaultPosition === 'top' ? 10 :
                    defaultPosition === 'center' ? 50 : 90;

    const subtitleStyle = [
      `FontName=${fontFamily}`,
      `FontSize=${defaultFontSize}`,
      'PrimaryColour=&HFFFFFF',  // White text
      'OutlineColour=&H000000',  // Black outline
      'BackColour=&H80000000',   // Semi-transparent background
      'Bold=1',
      'Outline=2',
      'Shadow=1',
      `Alignment=${defaultPosition === 'top' ? 8 : defaultPosition === 'center' ? 5 : 2}`,
      `MarginV=${position}`,
    ].join(',');

    // FFmpeg command with subtitle overlay
    const ffmpegCommand = [
      'ffmpeg',
      '-i', videoPath,
      '-vf', `subtitles=${subtitlePath}:force_style='${subtitleStyle}'`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'copy',  // Copy audio without re-encoding
      outputPath,
    ];

    console.log('[TextOverlay] Running FFmpeg', {
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
      console.error('[TextOverlay] FFmpeg failed', { code, stderr });
      throw new Error(`FFmpeg failed with code ${code}: ${stderr}`);
    }

    console.log('[TextOverlay] FFmpeg completed successfully');

    // Upload video with text overlay to Supabase Storage
    const videoBuffer = await Deno.readFile(outputPath);
    const storagePath = `cinematic-videos/${userId}/${videoId}/full_video_overlay.mp4`;

    const { error: uploadError } = await supabaseClient.storage
      .from('cinematic-assets')
      .upload(storagePath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload video with overlay: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('cinematic-assets')
      .getPublicUrl(storagePath);

    // Cleanup temp files
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch (cleanupError) {
      console.warn('[TextOverlay] Cleanup failed', cleanupError);
    }

    console.log('[TextOverlay] Text overlay added and uploaded successfully', {
      publicUrl,
    });

    return new Response(
      JSON.stringify({
        success: true,
        videoUrl: publicUrl,
        videoPath: storagePath,
      } as TextOverlayResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[TextOverlay] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as TextOverlayResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Generate SRT (SubRip) subtitle format from text segments
 */
function generateSRT(segments: TextSegment[]): string {
  const lines: string[] = [];

  segments.forEach((segment, index) => {
    // Segment number
    lines.push(`${index + 1}`);

    // Timecodes (format: HH:MM:SS,mmm)
    const startTime = formatSRTTime(segment.startTime);
    const endTime = formatSRTTime(segment.endTime);
    lines.push(`${startTime} --> ${endTime}`);

    // Text content
    lines.push(segment.text);

    // Empty line separator
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Format time in seconds to SRT format (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(millis, 3)}`;
}

/**
 * Pad number with leading zeros
 */
function pad(num: number, length: number): string {
  return num.toString().padStart(length, '0');
}
