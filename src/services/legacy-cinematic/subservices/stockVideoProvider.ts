import { logger } from '../../../utils/logger.ts';
import { PexelsFallbackProvider } from '../providers/PexelsFallbackProvider.ts';
import { PixabayFallbackProvider } from '../providers/PixabayFallbackProvider.ts';

export interface StockGenerationRequest {
  prompt?: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

export interface StockGenerationResult {
  videoUrl: string;
  duration: number;
  width: number;
  height: number;
  generationId: string;
}

interface StockVideoProvider {
  generate(request: StockGenerationRequest): Promise<StockGenerationResult>;
  isAvailable(): boolean;
}

export function createStockVideoProvider(): StockVideoProvider {
  const pexelsProvider = new PexelsFallbackProvider();
  const pixabayProvider = new PixabayFallbackProvider();

  return {
    async generate(request: StockGenerationRequest): Promise<StockGenerationResult> {
      const query = request.prompt?.split('\n')[0]?.trim() || 'cinematic footage';
      const aspectRatio = (request.aspectRatio === '9:16' ? '1:1' : '16:9') as '16:9' | '1:1';

      try {
        const video = await pexelsProvider.getVideo(query, aspectRatio);
        return {
          videoUrl: video.url,
          duration: Math.min(video.duration, 10),
          width: video.width,
          height: video.height,
          generationId: `pexels_${Date.now()}`,
        };
      } catch (pexelsErr) {
        logger.warn('[CinematicService] Stock: Pexels failed, trying Pixabay fallback', {
          query,
          pexelsError: pexelsErr instanceof Error ? pexelsErr.message : String(pexelsErr),
        });

        try {
          const video = await pixabayProvider.getVideo(query, aspectRatio);
          return {
            videoUrl: video.url,
            duration: Math.min(video.duration, 10),
            width: video.width,
            height: video.height,
            generationId: `pixabay_${Date.now()}`,
          };
        } catch (pixabayErr) {
          logger.error('[CinematicService] Stock: Both Pexels and Pixabay failed', {
            query,
            pexelsError: pexelsErr instanceof Error ? pexelsErr.message : String(pexelsErr),
            pixabayError: pixabayErr instanceof Error ? pixabayErr.message : String(pixabayErr),
          });
          throw new Error(`Stock provider chain exhausted (Pexels + Pixabay failed) for query: ${query}`);
        }
      }
    },

    isAvailable(): boolean {
      return pexelsProvider.isAvailable() || pixabayProvider.isAvailable();
    },
  };
}
