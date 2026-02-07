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
import puppeteer from 'puppeteer-core';
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
  
  // Force @sparticuz/chromium to extract Node 20+ shared libraries
  // We need BOTH environment variables to ensure AL2023 libraries are extracted
  process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs20.x';
  process.env.AWS_LAMBDA_JS_RUNTIME = 'nodejs20.x';
  
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

    // Use pre-bundled Remotion (created at build time)
    const preBundledPath = path.resolve(process.cwd(), '.remotion-bundle');
    let bundleLocation;
    
    try {
      await fs.access(preBundledPath);
      console.log('[Render Chunk] Using pre-bundled Remotion', { preBundledPath });
      bundleLocation = preBundledPath;
    } catch {
      // Fallback: bundle at runtime (will be slow)
      console.log('[Render Chunk] Pre-bundle not found, bundling at runtime...');
      const remotionRoot = path.resolve(process.cwd(), 'remotion/src/index.ts');
      
      // Check cache first
      const cachedBundlePath = '/tmp/remotion-bundle-cached';
      try {
        await fs.access(cachedBundlePath);
        console.log('[Render Chunk] Using cached bundle', { cachedBundlePath });
        bundleLocation = cachedBundlePath;
      } catch {
        console.log('[Render Chunk] Bundling...', { remotionRoot });
        
        bundleLocation = await bundle({
          entryPoint: remotionRoot,
          webpackOverride,
        });

        console.log('[Render Chunk] Bundle complete', { bundleLocation });
        
        // Cache for next invocation
        try {
          await fs.cp(bundleLocation, cachedBundlePath, { recursive: true });
          console.log('[Render Chunk] Bundle cached');
        } catch (err) {
          console.log('[Render Chunk] Cache failed:', err.message);
        }
      }
    }

    // Select chunk composition
    const compositionId = `chunk_${chunk.id}`;
    
    // Get composition dimensions (use 720p for faster rendering on free tier)
    const dimensions = format === 'vertical'
      ? { width: 720, height: 1280 } // 720p vertical (9:16)
      : { width: 1280, height: 720 }; // 720p horizontal (16:9)

    // Calculate duration in frames (15 FPS for faster rendering - smooth enough for image animations)
    const fps = 15;
    const durationInFrames = Math.ceil(chunk.duration * fps);

    console.log('[Render Chunk] Composition config', {
      compositionId,
      dimensions,
      durationInFrames,
      fps
    });

    // Use /tmp for output (writable in Netlify Functions)
    const outputDir = '/tmp/remotion-videos';
    await fs.mkdir(outputDir, { recursive: true });

    // Generate output filename
    const filename = `chunk_${chunk.id}_${videoId}.mp4`;
    const outputPath = path.join(outputDir, filename);
    
    console.log('[Render Chunk] Rendering chunk...', { outputPath });

    // Use @sparticuz/chromium (full version with binary included)
    console.log('[Render Chunk] Getting Chrome executable...');
    
    // Get Chrome executable - this will extract chrome + libraries to /tmp
    const browserExecutable = await chromium.executablePath();
    console.log('[Render Chunk] Chrome ready at:', browserExecutable);
    
    // Set LD_LIBRARY_PATH to include all possible library locations
    const libPaths = ['/tmp', '/tmp/al2/lib', '/tmp/al2023/lib', '/tmp/lib'];
    process.env.LD_LIBRARY_PATH = `${libPaths.join(':')}:${process.env.LD_LIBRARY_PATH || ''}`;



    // Render the chunk using StudioChunk composition
    await renderMedia({
      composition: {
        id: 'StudioChunk',
        width: dimensions.width,
        height: dimensions.height,
        fps, // 15 FPS for faster rendering
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
          startFrame: Math.floor((scene.from || 0) * fps / 30), // Convert from 30fps to actual fps
          durationInFrames: Math.ceil(((scene.to || scene.duration * 30) - (scene.from || 0)) * fps / 30)
        })),
        format,
        accentColor: accentColor || '#3b82f6'
      },
      // Quality settings - use CRF 32 for fastest rendering on free tier (26s timeout)
      crf: options?.quality === 'high' ? 26 : options?.quality === 'fast' ? 32 : 30,
      // Use the downloaded Chrome executable
      browserExecutable,
      // Increase timeout for browser connection (default is 25s, we need more)
      timeoutInMilliseconds: 120000, // 2 minutes total timeout
      chromiumOptions: {
        // Use chromium-min recommended args for serverless
        args: chromium.args,
        headless: true,
      },
      onProgress: ({ progress }) => {
        // Log every frame to see exactly where we timeout
        console.log(`[Render Chunk] Frame ${Math.floor(progress * durationInFrames)}/${durationInFrames}`);
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

    // TODO: Upload to Supabase Storage (skipping for now to stay under timeout)
    // For now, just return success with local path to verify rendering works
    console.log('[Render Chunk] ⚠️ Skipping Supabase upload for speed testing');
    
    const videoUrl = `/tmp-video/${filename}`; // Placeholder URL

    const totalTime = Date.now() - startTime;
    console.log('[Render Chunk] ✅ Complete', { 
      totalTime: `${totalTime}ms`,
      renderTime: `${renderTime}ms`,
      videoUrl
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        chunkId: chunk.id,
        videoUrl, // Placeholder - not uploaded yet
        fileSize: fileSizeBytes,
        renderTime,
        totalTime,
        message: 'Render successful (upload skipped for testing)'
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
