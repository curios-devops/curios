/**
 * Google Veo 3.1 Provider
 * Video generation using Vertex AI via Supabase Edge Function
 */

import { VeoVertexProvider } from './VeoVertexProvider';
import { VideoGenerationRequest, VideoGenerationResult } from '../types';
import { logger } from '../../../utils/logger';

export class VeoProvider {
  private veoVertex: VeoVertexProvider;
  private pollingInterval = 15000; // 15 seconds
  private maxPollingAttempts = 6; // 90 seconds max before giving up

  constructor() {
    this.veoVertex = new VeoVertexProvider();
  }

  /**
   * Generate a video clip using Google Veo 3.1 via Vertex AI
   */
  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    logger.info('[Veo] Generating video via Vertex AI', {
      promptPreview: request.prompt.slice(0, 50),
    });

    try {
      // Start video generation
      const { operation } = await this.veoVertex.generate(request);

      logger.info('[Veo] Generation started, polling for completion', { operation });

      // Poll the operation status until the video is ready
      let attempts = 0;
      while (attempts < this.maxPollingAttempts) {
        await this.sleep(this.pollingInterval);

        const status = await this.veoVertex.checkStatus(operation);
        attempts++;

        // Log progress every 2 attempts (30 seconds)
        if (attempts % 2 === 0) {
          logger.debug(`[Veo] Still generating... (${Math.round((attempts * this.pollingInterval) / 1000)}s elapsed)`, {
            message: status.message,
          });
        }

        if (status.done) {
          if (status.error) {
            throw new Error(`Veo generation failed: ${status.error}`);
          }

          // Video is ready - now save it to Supabase storage
          logger.info('[Veo] Video generation complete, saving to storage');

          const userId = 'cinematic_user'; // TODO: Get from auth context
          try {
            const saveResult = await this.veoVertex.saveVideo({
              userId,
              videoBase64: status.videoBase64,
              mimeType: status.mimeType,
              operationName: operation,
            });

            logger.info('[Veo] Video saved successfully', {
              publicUrl: saveResult.publicUrl,
            });

            return {
              videoUrl: saveResult.publicUrl,
              duration: request.duration || 8,
              width: this.getWidthFromAspectRatio(request.aspectRatio),
              height: this.getHeightFromAspectRatio(request.aspectRatio),
              generationId: operation,
            };
          } catch (saveError) {
            if (status.videoBase64) {
              const inlineUrl = this.createInlineVideoUrl(status.videoBase64, status.mimeType);

              logger.warn('[Veo] Save failed, using inline video fallback', {
                operation,
                error: saveError instanceof Error ? saveError.message : String(saveError),
              });

              return {
                videoUrl: inlineUrl,
                duration: request.duration || 8,
                width: this.getWidthFromAspectRatio(request.aspectRatio),
                height: this.getHeightFromAspectRatio(request.aspectRatio),
                generationId: operation,
              };
            }

            if (status.videoUrl) {
              logger.warn('[Veo] Save failed, using raw Veo URL fallback', {
                operation,
                error: saveError instanceof Error ? saveError.message : String(saveError),
              });

              return {
                videoUrl: status.videoUrl,
                duration: request.duration || 8,
                width: this.getWidthFromAspectRatio(request.aspectRatio),
                height: this.getHeightFromAspectRatio(request.aspectRatio),
                generationId: operation,
              };
            }

            throw saveError;
          }
        }
      }

      throw new Error(`Veo generation timeout (exceeded ${(this.maxPollingAttempts * this.pollingInterval) / 1000}s)`);
    } catch (error) {
      logger.error('[Veo] Generation failed', { error });
      throw new Error(`Veo generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  /**
   * Generate multiple videos sequentially
   * Note: This is no longer used - VeoWithFallbackProvider handles batching
   */
  async generateBatch(
    requests: VideoGenerationRequest[]
  ): Promise<VideoGenerationResult[]> {
    logger.info('[Veo] Batch generation called - but should use VeoWithFallbackProvider instead', {
      count: requests.length,
    });

    const results: VideoGenerationResult[] = [];

    // Process sequentially to avoid rate limits
    for (let i = 0; i < requests.length; i++) {
      logger.info(`[Veo] Processing scene ${i + 1}/${requests.length}`);

      const result = await this.generate(requests[i]);
      results.push(result);

      // Wait between requests
      if (i < requests.length - 1) {
        await this.sleep(8000); // 8 second delay
      }
    }

    logger.info('[Veo] Batch generation complete', { count: results.length });
    return results;
  }

  /**
   * Check if Vertex AI is available via edge function
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.veoVertex.healthCheck();
    } catch (error) {
      logger.error('[Veo] Health check failed', { error });
      return false;
    }
  }

  private getWidthFromAspectRatio(aspectRatio?: string): number {
    switch (aspectRatio) {
      case '9:16':
        return 1080;
      case '16:9':
        return 1920;
      case '1:1':
        return 1080;
      default:
        return 1920;
    }
  }

  private getHeightFromAspectRatio(aspectRatio?: string): number {
    switch (aspectRatio) {
      case '9:16':
        return 1920;
      case '16:9':
        return 1080;
      case '1:1':
        return 1080;
      default:
        return 1080;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private createInlineVideoUrl(videoBase64: string, mimeType?: string): string {
    const resolvedMimeType = mimeType || 'video/mp4';
    const binaryString = atob(videoBase64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: resolvedMimeType });
    return URL.createObjectURL(blob);
  }
}
