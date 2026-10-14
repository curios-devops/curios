/**
 * Veo with Pexels Fallback Provider
 * Implements sequential video generation with VEO, falling back to Pexels on failure/timeout
 *
 * Logic:
 * - Process scenes sequentially (one at a time)
 * - Each scene: created -> processing -> completed (30s timeout) OR failed
 * - On failure/timeout: retry once, then fallback to Pexels
 * - Max 2 videos processing at a time
 * - Wait 8 seconds between calls
 */

import { VeoProvider } from './VeoProvider';
import { PexelsFallbackProvider } from './PexelsFallbackProvider';
import { VideoGenerationRequest, VideoGenerationResult } from '../types';
import { logger } from '../../../utils/logger';

interface SceneStatus {
  sceneId: string;
  status: 'created' | 'processing' | 'completed' | 'failed';
  startTime?: number;
  retryCount: number;
  result?: VideoGenerationResult;
  error?: string;
}

export class VeoWithFallbackProvider {
  private veoProvider: VeoProvider;
  private pexelsProvider: PexelsFallbackProvider;

  private readonly TIMEOUT_MS = 120000; // 2 minutes timeout per scene
  private readonly DELAY_BETWEEN_CALLS_MS = 6000; // 6 seconds delay between calls
  private readonly MAX_CONCURRENT = 1; // Sequential to reduce edge pressure
  private readonly MAX_RETRIES = 0; // Single VEO attempt, then fallback
  private readonly MAX_BATCH_WALL_TIME_MS = 240000; // 4 minutes max for all scenes in a batch

  constructor() {
    this.veoProvider = new VeoProvider();
    this.pexelsProvider = new PexelsFallbackProvider();
  }

  /**
   * Generate a single video with VEO, fallback to Pexels on failure
   */
  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const status: SceneStatus = {
      sceneId: request.prompt.slice(0, 30),
      status: 'created',
      retryCount: 0,
    };

    logger.info('[VeoWithFallback] Starting generation', { sceneId: status.sceneId });

    // Try VEO first
    const veoResult = await this.tryVeoWithRetry(request, status);

    if (veoResult) {
      logger.info('[VeoWithFallback] VEO generation successful', { sceneId: status.sceneId });
      return veoResult;
    }

    // Fallback to Pexels
    logger.warn('[VeoWithFallback] VEO failed, falling back to Pexels', {
      sceneId: status.sceneId,
      error: status.error
    });

    return this.fallbackToPexels(request);
  }

  /**
   * Try VEO generation with retry logic
   */
  private async tryVeoWithRetry(
    request: VideoGenerationRequest,
    status: SceneStatus
  ): Promise<VideoGenerationResult | null> {
    while (status.retryCount <= this.MAX_RETRIES) {
      try {
        status.status = 'processing';
        status.startTime = Date.now();

        logger.info('[VeoWithFallback] Attempting VEO generation', {
          sceneId: status.sceneId,
          attempt: status.retryCount + 1,
          maxRetries: this.MAX_RETRIES + 1,
        });

        // Generate with timeout
        const result = await this.generateWithTimeout(request);

        status.status = 'completed';
        status.result = result;

        return result;
      } catch (error) {
        status.retryCount++;
        status.error = error instanceof Error ? error.message : String(error);

        logger.error('[VeoWithFallback] VEO generation attempt failed', {
          sceneId: status.sceneId,
          attempt: status.retryCount,
          error: status.error,
        });

        if (status.retryCount <= this.MAX_RETRIES) {
          logger.info('[VeoWithFallback] Retrying VEO generation', {
            sceneId: status.sceneId,
            retryNumber: status.retryCount,
          });

          // Wait before retry
          await this.sleep(2000);
        }
      }
    }

    status.status = 'failed';
    return null;
  }

  /**
   * Generate with timeout wrapper
   */
  private async generateWithTimeout(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    return Promise.race([
      this.veoProvider.generate(request),
      this.createTimeout(),
    ]);
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`VEO generation timeout after ${this.TIMEOUT_MS}ms`));
      }, this.TIMEOUT_MS);
    });
  }

  /**
   * Fallback to Pexels video
   */
  private async fallbackToPexels(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    logger.info('[VeoWithFallback] Using Pexels fallback', {
      prompt: request.prompt.slice(0, 50),
    });

    try {
      // Extract search keywords from prompt (simple extraction)
      const searchQuery = this.extractSearchQuery(request.prompt);

      const pexelsVideo = await this.pexelsProvider.getVideo(
        searchQuery,
        request.aspectRatio === '9:16' ? '1:1' : '16:9'
      );

      return {
        videoUrl: pexelsVideo.url,
        duration: Math.min(pexelsVideo.duration, 10), // Cap at 10s
        width: pexelsVideo.width,
        height: pexelsVideo.height,
        generationId: `pexels_${Date.now()}`,
      };
    } catch (error) {
      logger.error('[VeoWithFallback] Pexels fallback also failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Both VEO and Pexels fallback failed');
    }
  }

  /**
   * Extract search query from VEO prompt
   */
  private extractSearchQuery(prompt: string): string {
    // Extract key visual elements from the prompt
    // Simple approach: take first meaningful line or phrase
    const lines = prompt.split('\n').filter(line => line.trim().length > 0);

    if (lines.length > 0) {
      // Remove common prompt prefixes
      const firstLine = lines[0]
        .replace(/^(Opening cinematic shot:|Mind-blowing reveal:|Closing shot:)/i, '')
        .trim();

      // Extract main subject (first 5 words)
      const words = firstLine.split(' ').slice(0, 5).join(' ');
      return words;
    }

    return 'cinematic footage';
  }

  /**
   * Generate batch with sequential processing and queue management
   */
  async generateBatch(requests: VideoGenerationRequest[]): Promise<VideoGenerationResult[]> {
    const batchStartTime = Date.now();

    logger.info('[VeoWithFallback] Starting batch generation', {
      totalScenes: requests.length,
      maxConcurrent: this.MAX_CONCURRENT,
      maxBatchWallTimeMs: this.MAX_BATCH_WALL_TIME_MS,
    });

    const results: VideoGenerationResult[] = new Array(requests.length);

    const remainingBatchMs = () =>
      this.MAX_BATCH_WALL_TIME_MS - (Date.now() - batchStartTime);

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];

      if (remainingBatchMs() <= 0) {
        logger.warn('[VeoWithFallback] Batch wall-time exhausted, forcing fallback for remaining scene', {
          sceneIndex: i,
          totalScenes: requests.length,
          batchWallTimeRemainingMs: remainingBatchMs(),
        });
        results[i] = await this.fallbackToPexels(request);
        continue;
      }

      // Add delay between calls (except for first)
      if (i > 0) {
        const delayMs = Math.min(this.DELAY_BETWEEN_CALLS_MS, Math.max(0, remainingBatchMs()));
        if (delayMs <= 0) {
          logger.warn('[VeoWithFallback] No remaining batch time for delay, forcing fallback', {
            sceneIndex: i,
            batchWallTimeRemainingMs: remainingBatchMs(),
          });
          results[i] = await this.fallbackToPexels(request);
          continue;
        }

        logger.info('[VeoWithFallback] Waiting between calls', {
          delayMs,
        });
        await this.sleep(delayMs);
      }

      // Start generation for this scene
      logger.info('[VeoWithFallback] Starting scene generation', {
        sceneIndex: i,
        totalScenes: requests.length,
        remainingBatchMs: remainingBatchMs(),
        batchWallTimeRemainingMs: remainingBatchMs(),
      });

      try {
        const sceneTimeoutMs = Math.min(
          this.TIMEOUT_MS + 10000,
          Math.max(10000, remainingBatchMs())
        );

        results[i] = await this.withTimeout(
          this.generate(request),
          sceneTimeoutMs,
          `Scene ${i + 1} exceeded timeout budget`
        );

        logger.info('[VeoWithFallback] Scene completed', {
          sceneIndex: i,
          completed: i + 1,
          totalScenes: requests.length,
          batchWallTimeRemainingMs: remainingBatchMs(),
        });
      } catch (error) {
        logger.warn('[VeoWithFallback] Scene timed out/failed, forcing Pexels fallback', {
          sceneIndex: i,
          error: error instanceof Error ? error.message : String(error),
          batchWallTimeRemainingMs: remainingBatchMs(),
        });

        results[i] = await this.fallbackToPexels(request);
      }
    }

    logger.info('[VeoWithFallback] Batch generation complete', {
      totalScenes: results.length,
      successful: results.filter(r => r).length,
    });

    return results;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    const veoHealthy = await this.veoProvider.healthCheck();
    const pexelsAvailable = this.pexelsProvider.isAvailable();

    logger.info('[VeoWithFallback] Health check', {
      veo: veoHealthy,
      pexels: pexelsAvailable,
    });

    // We're healthy if either provider is available
    return veoHealthy || pexelsAvailable;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  }
}
