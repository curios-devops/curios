// Ask Deeper — Step D: contextual header image.
// Adapts Movie's gpt-image-2 approach (newer than research's DALL-E service).
// A storageBucket is passed so the edge function uploads the PNG and returns a
// hosted http URL (not an inline data URL). That hosted URL is required so the
// image can lead the carousel AND be used as the social-share OG image — a
// data: URL can't be shared to crawlers.

import { logger } from '../../../utils/logger';

const IMAGE_MODEL = import.meta.env.VITE_FASTSEARCH_IMAGE_MODEL || 'gpt-image-2';
// 16:9 landscape header still.
const IMAGE_SIZE = '1536x1024';
// Cost lever: 'low' is plenty for a single contextual header image.
const IMAGE_QUALITY = import.meta.env.VITE_FASTSEARCH_IMAGE_QUALITY || 'low';

/**
 * Build a concise gpt-image prompt that represents the answer's core theme.
 * Avoids text/logos so the image stays clean as a header.
 */
function buildImagePrompt(query: string, summary: string): string {
  const prompt = `Create a single, visually engaging editorial header image that represents the core theme of this topic: "${query}".
Context: ${summary}
Clean, modern editorial illustration style. Balanced composition, soft lighting, clear visual storytelling.
Avoid any text, words, logos, or brand elements.`;
  return prompt.slice(0, 750);
}

/**
 * Generate one contextual header image for an Ask Deeper answer.
 * Returns a hosted/inline image URL, or null on any failure (non-blocking).
 */
export async function generateHeaderImage(
  query: string,
  summary: string
): Promise<string | null> {
  const endpoint = import.meta.env.VITE_OPENAI_API_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!endpoint || !anonKey) {
    logger.warn('FastSearchImage: edge function not configured');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        imageGeneration: true,
        model: IMAGE_MODEL,
        prompt: buildImagePrompt(query, summary),
        size: IMAGE_SIZE,
        quality: IMAGE_QUALITY,
        n: 1,
        // Upload server-side and return a hosted public URL (shareable).
        // Reuse the existing public bucket to avoid new storage infra.
        storageBucket: 'movie-assets',
        storagePath: `fast-search/${crypto.randomUUID()}.png`,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn('FastSearchImage: generation failed', { status: response.status });
      return null;
    }

    const data = await response.json();
    const url: string | undefined = data.url || data?.openai?.data?.[0]?.url;

    if (!url) {
      logger.warn('FastSearchImage: no image URL in response');
      return null;
    }

    return url;
  } catch (error) {
    clearTimeout(timeoutId);
    logger.warn('FastSearchImage: generation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
