/**
 * Netlify Function: Render Studio Video
 * Handles video rendering using Remotion on the server
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Webpack override (minimal)
const webpackOverride = (config) => config;

export default async (req, context) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { scenes, format, videoId, accentColor } = await req.json();

    // Validate input
    if (!scenes || !Array.isArray(scenes.scenes) || !format || !videoId) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input. Required: scenes, format, videoId' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[Render Video] Starting render', { 
      sceneCount: scenes.scenes.length, 
      format, 
      videoId 
    });

    // Bundle Remotion project
    const remotionRoot = path.resolve(process.cwd(), 'remotion/src/index.ts');
    console.log('[Render Video] Bundling...', { remotionRoot });
    
    const bundleLocation = await bundle({
      entryPoint: remotionRoot,
      webpackOverride,
    });

    console.log('[Render Video] Bundle complete', { bundleLocation });

    // Select composition
    const compositionId = format === 'vertical' ? 'StudioVertical' : 'StudioHorizontal';
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: {
        scenes: scenes.scenes,
        format,
        accentColor: accentColor || '#3b82f6'
      },
    });

    console.log('[Render Video] Composition selected', {
      width: composition.width,
      height: composition.height,
      fps: composition.fps
    });

    // Ensure output directory exists
    const outputDir = path.resolve(process.cwd(), 'public/studio-videos');
    await fs.mkdir(outputDir, { recursive: true });

    // Render video
    const outputPath = path.join(outputDir, `${videoId}.mp4`);
    console.log('[Render Video] Rendering...', { outputPath });

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: {
        scenes: scenes.scenes,
        format,
        accentColor: accentColor || '#3b82f6'
      },
      onProgress: ({ progress }) => {
        if (progress % 0.1 < 0.01) {
          console.log(`[Render Video] Progress: ${(progress * 100).toFixed(1)}%`);
        }
      },
    });

    console.log('[Render Video] Render complete', { outputPath });

    // Get file size
    const stats = await fs.stat(outputPath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

    // Return video URL
    const videoUrl = `/studio-videos/${videoId}.mp4`;
    
    return new Response(JSON.stringify({ 
      success: true,
      videoUrl,
      fileSize: stats.size,
      fileSizeMB: parseFloat(fileSizeMB),
      duration: scenes.duration,
      format
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Render Video] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Video rendering failed',
      details: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: '/api/render-video',
  method: 'POST'
};
