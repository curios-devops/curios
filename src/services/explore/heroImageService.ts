// Cold-load hero image for an Explore article.
// Used only when an article has no thumbnail (e.g. a shared link opened fresh, with no
// React Router navigation state). Dedicated SerpApi image search first — Tavily images
// are unreliable — and if that returns nothing, generate one with gpt-image-2 (low).

import { searchSerpApiImages } from '../search/providers/engines/serpApiImages';
import { generateArticleImage } from '../research/regular/agents/imageGenerationService';
import { logger } from '../../utils/logger';

export async function resolveExploreHeroImage(title: string, summary?: string): Promise<string | null> {
  if (!title?.trim()) return null;

  // 1) Dedicated SerpApi image search (self-guarded — returns [] on failure).
  const images = await searchSerpApiImages(title, 6);
  const hit = images.find((i) => i.url && i.url.startsWith('http'));
  if (hit) return hit.url;

  // 2) Fallback: generate with gpt-image-2 (low) — the primary model of generateArticleImage.
  try {
    const gen = await generateArticleImage({
      articleTitle: title,
      articleSummary: summary?.trim() || title,
      quality: 'low',
    });
    return gen.url || null;
  } catch (error) {
    logger.warn('[Explore] hero image generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
