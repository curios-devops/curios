/**
 * Netlify Function: Render Video Chunk
 * Renders a single video chunk using Remotion and uploads to Supabase Storage
 * 
 * This function is called by the ChunkedRenderer for each video chunk.
 * It uses @remotion/renderer to create MP4 files and stores them in Supabase.
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createClient } from '@supabase/supabase-js';
import chromium from '@sparticuz/chromium';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

// Note: __filename and __dirname are provided by Netlify's esbuild bundler

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Render Chunk] Missing Supabase credentials');
}

const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Webpack override (minimal)
const webpackOverride = (config) => config;

export const handler = async (event, context) => {
  // Set up environment for @sparticuz/chromium
  // This tells Chrome where to find shared libraries
  process.env.HOME = '/tmp';
  process.env.FONTCONFIG_PATH = '/tmp';
  
  console.log('[Render Chunk] Handler invoked', { 
    method: event.httpMethod,
    hasSupabase: !!supabase,
    supabaseUrl,
    hasServiceKey: !!supabaseServiceKey
  });

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const startTime = Date.now();

  try {
    console.log('[Render Chunk] Parsing request body...');
    const { chunk, format, videoId, accentColor, options } = JSON.parse(event.body);
    console.log('[Render Chunk] Request parsed successfully', { chunkId: chunk?.id });

    // Validate input
    if (!chunk || !chunk.id || !chunk.scenes || !format || !videoId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Invalid input. Required: chunk (with id and scenes), format, videoId' 
        })
      };
    }

    // Validate Supabase is configured
    if (!supabase) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Supabase not configured. Set SUPABASE_SERVICE_ROLE_KEY environment variable.' 
        })
      };
    }

    console.log('[Render Chunk] Starting render', { 
      chunkId: chunk.id,
      sceneCount: chunk.scenes.length,
      format,
      videoId,
      duration: chunk.duration
    });

    // Bundle Remotion project (this will be cached by Remotion)
    const remotionRoot = path.resolve(process.cwd(), 'remotion/src/index.ts');
    console.log('[Render Chunk] Bundling...', { remotionRoot });
    
    const bundleLocation = await bundle({
      entryPoint: remotionRoot,
      webpackOverride,
    });

    console.log('[Render Chunk] Bundle complete', { bundleLocation });

    // Select chunk composition
    const compositionId = `chunk_${chunk.id}`;
    
    // Get composition dimensions
    const dimensions = format === 'vertical'
      ? { width: 1080, height: 1920 } // 9:16 for mobile
      : { width: 1920, height: 1080 }; // 16:9 for desktop

    // Calculate duration in frames (30 FPS)
    const durationInFrames = Math.ceil(chunk.duration * 30);

    console.log('[Render Chunk] Composition config', {
      compositionId,
      dimensions,
      durationInFrames,
      fps: 30
    });

    // Use /tmp for output (writable in Netlify Functions)
    const outputDir = '/tmp/remotion-videos';
    await fs.mkdir(outputDir, { recursive: true });

    // Generate output filename
    const filename = `chunk_${chunk.id}_${videoId}.mp4`;
    const outputPath = path.join(outputDir, filename);
    
    console.log('[Render Chunk] Rendering chunk...', { outputPath });

    // Use @sparticuz/chromium - maintained fork for serverless (AWS Lambda/Netlify)
    // Set font path for Chrome (required for text rendering)
    await chromium.font(
      'https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf'
    );
    
    // Get Chrome executable path (automatically extracts to /tmp with libraries)
    const browserExecutable = await chromium.executablePath();
    console.log('[Render Chunk] Chrome path:', browserExecutable);

    // Render the chunk using StudioChunk composition
    await renderMedia({
      composition: {
        id: 'StudioChunk',
        width: dimensions.width,
        height: dimensions.height,
        fps: 30,
        durationInFrames,
      },
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: {
        chunkId: chunk.id,
        chunkIndex: parseInt(chunk.id.replace('chunk_', '')) || 0,
        startFrame: 0,
        endFrame: durationInFrames,
        scenes: chunk.scenes.map((scene, index) => ({
          ...scene,
          index,
          startFrame: scene.from || 0,
          durationInFrames: (scene.to || scene.duration * 30) - (scene.from || 0)
        })),
        format,
        accentColor: accentColor || '#3b82f6'
      },
      // Quality settings from options
      crf: options?.quality === 'high' ? 18 : options?.quality === 'fast' ? 28 : 23,
      // Use chrome-aws-lambda executable
      browserExecutable,
      // Increase timeout for browser connection (default is 25s, we need more)
      timeoutInMilliseconds: 120000, // 2 minutes total timeout
      chromiumOptions: {
        // Use chrome-aws-lambda recommended args for serverless
        args: chromium.args
      },
      onProgress: ({ progress }) => {
        if (progress % 0.2 < 0.01) { // Log every 20%
          console.log(`[Render Chunk] Render progress: ${(progress * 100).toFixed(1)}%`);
        }
      },
    });

    const renderTime = Date.now() - startTime;
    console.log('[Render Chunk] Render complete', { 
      outputPath, 
      renderTime: `${renderTime}ms` 
    });

    // Get file stats
    const fileStats = await fs.stat(outputPath);
    const fileSizeBytes = fileStats.size;
    const fileSizeMB = (fileSizeBytes / 1024 / 1024).toFixed(2);

    console.log('[Render Chunk] File size', { 
      bytes: fileSizeBytes, 
      mb: fileSizeMB 
    });

    // Upload to Supabase Storage
    console.log('[Render Chunk] Uploading to Supabase...', { filename });
    
    const fileBuffer = await fs.readFile(outputPath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('studio-videos')
      .upload(filename, fileBuffer, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: true // Overwrite if exists
      });

    if (uploadError) {
      console.error('[Render Chunk] Upload error', uploadError);
      throw new Error(`Failed to upload to Supabase: ${uploadError.message}`);
    }

    console.log('[Render Chunk] Upload complete', { path: uploadData.path });

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('studio-videos')
      .getPublicUrl(filename);

    console.log('[Render Chunk] Public URL', { publicUrl });

    // Clean up local file
    try {
      await fs.unlink(outputPath);
      console.log('[Render Chunk] Local file cleaned up');
    } catch (cleanupError) {
      console.warn('[Render Chunk] Failed to clean up local file', cleanupError);
    }

    // Return success response
    const totalTime = Date.now() - startTime;
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        chunkId: chunk.id,
        chunkUrl: publicUrl,
        renderTime: totalTime,
        fileSize: fileSizeBytes,
        filename,
        format,
        dimensions
      })
    };

  } catch (error) {
    console.error('[Render Chunk] ERROR DETAILS:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    
    const totalTime = Date.now() - startTime;
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message,
        errorType: error.name,
        errorCode: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        renderTime: totalTime
      })
    };
  }
};

// Export config for Netlify
export const config = {
  path: "/render-chunk",
  // Allow longer execution time for video rendering
  timeout: 300, // 5 minutes (Netlify Pro allows up to 26 seconds, adjust as needed)
};
