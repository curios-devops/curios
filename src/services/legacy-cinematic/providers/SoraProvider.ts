/**
 * OpenAI Sora Provider
 * Wrapper for OpenAI Sora video generation API
 */

import OpenAI from 'openai';
import { VideoGenerationRequest as SoraGenerationRequest, VideoGenerationResult as SoraGenerationResult } from '../types';

export class SoraProvider {
  private client: OpenAI;
  private pollingInterval = 2000; // 2 seconds
  private maxPollingAttempts = 60; // 2 minutes max

  constructor() {
    this.client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    });
  }

  /**
   * Generate a video clip using Sora
   * Returns a URL to the generated video
   */
  async generate(request: SoraGenerationRequest): Promise<SoraGenerationResult> {
    console.log('[Sora] Generating video:', request.prompt.slice(0, 50) + '...');

    try {
      // Start generation
      const videosApi = (this.client as any).videos;
      const generation = await videosApi.generations.create({
        model: 'sora-1.0-turbo',
        prompt: request.prompt,
        size: this.formatAspectRatio(request.aspectRatio),
        duration: request.duration,
        quality: request.quality || 'standard',
      });

      console.log('[Sora] Generation started, ID:', generation.id);

      // Poll for completion
      const result = await this.pollForCompletion(generation.id);

      console.log('[Sora] Video generated:', result.url);

      return {
        videoUrl: result.url,
        duration: result.duration || request.duration,
        width: result.width || this.getWidthFromAspectRatio(request.aspectRatio),
        height: result.height || this.getHeightFromAspectRatio(request.aspectRatio),
        generationId: generation.id,
      };
    } catch (error) {
      console.error('[Sora] Generation failed:', error);
      throw new Error(`Sora generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Poll Sora API until video generation is complete
   */
  private async pollForCompletion(generationId: string): Promise<any> {
    let attempts = 0;

    while (attempts < this.maxPollingAttempts) {
      try {
        const videosApi = (this.client as any).videos;
        const status = await videosApi.generations.retrieve(generationId);

        if (status.status === 'completed' && status.output) {
          return status.output;
        }

        if (status.status === 'failed') {
          throw new Error(
            `Sora generation failed: ${status.error?.message || 'Unknown error'}`
          );
        }

        // Wait before next poll
        await this.sleep(this.pollingInterval);
        attempts++;

        // Log progress every 10 attempts
        if (attempts % 10 === 0) {
          console.log(`[Sora] Still generating... (${attempts * 2}s elapsed)`);
        }
      } catch (error) {
        console.error('[Sora] Polling error:', error);
        throw error;
      }
    }

    throw new Error('Sora generation timeout (exceeded 2 minutes)');
  }

  /**
   * Generate multiple scenes in parallel (batched)
   */
  async generateBatch(
    requests: SoraGenerationRequest[],
    maxParallel: number = 3
  ): Promise<SoraGenerationResult[]> {
    console.log(`[Sora] Generating batch of ${requests.length} videos (${maxParallel} at a time)...`);

    const results: SoraGenerationResult[] = [];

    // Process in batches of maxParallel
    for (let i = 0; i < requests.length; i += maxParallel) {
      const batch = requests.slice(i, i + maxParallel);
      console.log(`[Sora] Processing batch ${Math.floor(i / maxParallel) + 1}/${Math.ceil(requests.length / maxParallel)}`);

      const batchResults = await Promise.all(
        batch.map((req) => this.generate(req))
      );

      results.push(...batchResults);
    }

    console.log(`[Sora] Batch generation complete: ${results.length} videos`);
    return results;
  }

  /**
   * Check if Sora API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test with minimal generation
      await this.generate({
        prompt: 'A simple test scene',
        duration: 2,
        aspectRatio: '16:9',
        quality: 'standard',
      });
      return true;
    } catch (error) {
      console.error('[Sora] Health check failed:', error);
      return false;
    }
  }

  /**
   * Format aspect ratio for Sora API
   */
  private formatAspectRatio(aspectRatio?: string): string {
    // Sora API expects format like "1080x1920" or "1920x1080"
    switch (aspectRatio) {
      case '9:16':
        return '1080x1920'; // Vertical
      case '16:9':
        return '1920x1080'; // Horizontal
      case '1:1':
        return '1080x1080'; // Square
      default:
        return '1920x1080';
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
}
