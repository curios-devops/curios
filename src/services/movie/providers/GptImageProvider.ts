// Step 5 — Image generation via gpt-image-2 (through the existing fetch-openai edge function).
// 16:9 cinematic stills. The shared style anchor is already baked into each scene's
// imagePrompt by the StoryboardAgent for cross-scene consistency.

import { logger } from '../../../utils/logger';

const IMAGE_MODEL = import.meta.env.VITE_MOVIE_IMAGE_MODEL || 'gpt-image-2';
// 16:9 landscape. gpt-image supports 1536x1024 for wide framing.
const IMAGE_SIZE = '1536x1024';
// Cost lever: 'low' | 'medium' | 'high'. Defaults to 'medium' — the big saver vs 'high'
// (~$0.25→$0.06 per image) with a modest visual hit, fine for short-form swipes.
const IMAGE_QUALITY = import.meta.env.VITE_MOVIE_IMAGE_QUALITY || 'medium';

export class GptImageProvider {
  async generate(imagePrompt: string, opts: { userId?: string } = {}): Promise<string> {
    const endpoint = import.meta.env.VITE_OPENAI_API_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!endpoint || !anonKey) {
      throw new Error('VITE_OPENAI_API_URL or VITE_SUPABASE_ANON_KEY is not configured');
    }

    // gpt-image-2 returns base64; have the edge function upload it to movie-assets and
    // return a hosted public URL (small, persistable, and consumable by Wavespeed).
    const uid = opts.userId || 'guest';
    const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        imageGeneration: true,
        model: IMAGE_MODEL,
        prompt: imagePrompt,
        size: IMAGE_SIZE,
        quality: IMAGE_QUALITY,
        n: 1,
        storageBucket: 'movie-assets',
        storagePath: `${uid}/images/${uuid}.png`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`gpt-image generation failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const url: string | undefined = data.url || data?.openai?.data?.[0]?.url;

    if (!url) {
      logger.error('[Movie/GptImage] No image URL in response', { data });
      throw new Error('gpt-image returned no image URL');
    }

    return url;
  }
}
