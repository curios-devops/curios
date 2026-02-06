/**
 * Chunked Renderer Service
 * Renders video chunks in parallel for serverless-friendly generation
 */

import { logger } from '../../../utils/logger';
import { VideoChunk } from './chunkPlanner';

export interface RenderOptions {
  accentColor?: string;
  quality?: 'fast' | 'balanced' | 'high';
  maxParallelChunks?: number;
}

export interface ChunkRenderResult {
  chunkId: string;
  chunkIndex: number;
  chunkUrl: string | null; // null in preview mode, URL string in production
  status: 'complete' | 'rendering' | 'failed' | 'pending';
  error?: string;
  renderTime?: number; // milliseconds
  fileSize?: number; // bytes
}

export interface RenderProgress {
  total: number;
  completed: number;
  inProgress: number;
  failed: number;
  pending: number;
  percentComplete: number;
}

export class ChunkedRenderer {
  private maxParallelChunks: number;
  private renderingChunks: Set<string>;
  private completedChunks: Set<string>;
  private failedChunks: Set<string>;
  private productionMode: boolean;

  constructor(maxParallelChunks: number = 3, productionMode: boolean = false) {
    this.maxParallelChunks = maxParallelChunks;
    this.renderingChunks = new Set();
    this.completedChunks = new Set();
    this.failedChunks = new Set();
    this.productionMode = productionMode || import.meta.env.VITE_ENABLE_PRODUCTION_RENDERING === 'true';
    
    if (this.productionMode) {
      logger.info('[Chunked Renderer] Production mode ENABLED - will render real videos');
    } else {
      logger.info('[Chunked Renderer] Preview mode - simulating rendering without video files');
    }
  }

  /**
   * Render all chunks with parallel processing
   */
  async renderChunks(
    chunks: VideoChunk[],
    format: 'vertical' | 'horizontal',
    videoId: string,
    options: RenderOptions = {},
    onChunkComplete?: (result: ChunkRenderResult, progress: RenderProgress) => void
  ): Promise<ChunkRenderResult[]> {
    logger.info('[Chunked Renderer] Starting chunk rendering', {
      totalChunks: chunks.length,
      maxParallel: this.maxParallelChunks,
      format,
      videoId
    });

    const results: ChunkRenderResult[] = [];
    const renderOrder = this.getRenderOrder(chunks);

    // Reset state
    this.renderingChunks.clear();
    this.completedChunks.clear();
    this.failedChunks.clear();

    // Render chunks in batches
    for (let i = 0; i < renderOrder.length; i += this.maxParallelChunks) {
      const batch = renderOrder.slice(i, i + this.maxParallelChunks);
      
      logger.info('[Chunked Renderer] Rendering batch', {
        batchNumber: Math.floor(i / this.maxParallelChunks) + 1,
        chunkIndices: batch
      });

      const batchPromises = batch.map(chunkIndex => {
        const chunk = chunks[chunkIndex];
        this.renderingChunks.add(chunk.id);

        return this.renderChunk(chunk, format, videoId, options)
          .then(result => {
            this.renderingChunks.delete(chunk.id);
            this.completedChunks.add(chunk.id);

            const progress = this.getProgress(chunks.length);
            onChunkComplete?.(result, progress);

            return result;
          })
          .catch(error => {
            this.renderingChunks.delete(chunk.id);
            this.failedChunks.add(chunk.id);

            const failedResult: ChunkRenderResult = {
              chunkId: chunk.id,
              chunkIndex: chunk.index,
              chunkUrl: '',
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            };

            const progress = this.getProgress(chunks.length);
            onChunkComplete?.(failedResult, progress);

            return failedResult;
          });
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    logger.info('[Chunked Renderer] All chunks processed', {
      total: chunks.length,
      completed: this.completedChunks.size,
      failed: this.failedChunks.size
    });

    return results;
  }

  /**
   * Render a single chunk
   * In preview mode, this simulates rendering
   * In production, this would call Netlify function or Remotion Lambda
   */
  private async renderChunk(
    chunk: VideoChunk,
    format: 'vertical' | 'horizontal',
    videoId: string,
    options: RenderOptions
  ): Promise<ChunkRenderResult> {
    const startTime = Date.now();

    logger.info('[Chunked Renderer] Rendering chunk', {
      chunkId: chunk.id,
      chunkIndex: chunk.index,
      duration: chunk.duration.toFixed(2),
      sceneCount: chunk.scenes.length,
      priority: chunk.priority
    });

    try {
      // Choose rendering mode: Production (real videos) or Preview (simulation)
      const chunkUrl = this.productionMode
        ? await this.renderChunkProduction(chunk, format, videoId, options)
        : await this.simulateChunkRendering(chunk, format, videoId, options);

      const renderTime = Date.now() - startTime;

      logger.info('[Chunked Renderer] Chunk complete', {
        chunkId: chunk.id,
        renderTime: `${renderTime}ms`,
        chunkUrl: chunkUrl ? chunkUrl.substring(0, 80) : 'null (preview mode)',
        mode: this.productionMode ? 'PRODUCTION' : 'PREVIEW'
      });

      return {
        chunkId: chunk.id,
        chunkIndex: chunk.index,
        chunkUrl,
        status: 'complete',
        renderTime,
        fileSize: Math.floor(chunk.duration * 1024 * 500) // Estimate ~500KB per second
      };

    } catch (error) {
      const renderTime = Date.now() - startTime;

      logger.error('[Chunked Renderer] Chunk render failed', {
        chunkId: chunk.id,
        renderTime: `${renderTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Simulate chunk rendering (PREVIEW MODE)
   * In production, this would call:
   * - Netlify function: /functions/render-chunk
   * - OR Remotion Lambda for cloud rendering
   * 
   * NOTE: Returns null in preview mode to avoid CSP violations
   * The player should handle null URLs gracefully
   */
  private async simulateChunkRendering(
    chunk: VideoChunk,
    _format: 'vertical' | 'horizontal',
    videoId: string,
    _options: RenderOptions
  ): Promise<string | null> {
    // Simulate network latency and rendering time
    const baseRenderTime = chunk.duration * 500; // 500ms per second of video
    const variability = Math.random() * 1000; // +0-1s random
    const totalTime = baseRenderTime + variability;

    await this.delay(totalTime);

    // In preview mode, return null (no actual video file)
    // In production, this would be a Supabase Storage URL like:
    // https://gpfccicfqynahflehpqo.supabase.co/storage/v1/object/public/videos/chunk_${chunk.id}_${videoId}.mp4
    
    logger.info('[Chunked Renderer] Preview mode: No video file generated', {
      chunkId: chunk.id,
      videoId,
      note: 'Set PREVIEW_MODE=false for actual rendering'
    });

    return null; // No video URL in preview mode
  }

  /**
   * Render chunk in production mode (REAL VIDEO GENERATION)
   * Calls Netlify function to render chunk with Remotion and upload to Supabase
   */
  private async renderChunkProduction(
    chunk: VideoChunk,
    format: 'vertical' | 'horizontal',
    videoId: string,
    options: RenderOptions
  ): Promise<string | null> {
    logger.info('[Chunked Renderer] Production render starting', {
      chunkId: chunk.id,
      format,
      videoId,
      netlifyFunction: '/.netlify/functions/render-chunk'
    });

    try {
      // Call Netlify function to render chunk
      const response = await fetch('/.netlify/functions/render-chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chunk,
          format,
          videoId,
          accentColor: options.accentColor || '#3b82f6',
          options: {
            quality: options.quality || 'balanced'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        logger.error('[Chunked Renderer] Render function error', {
          status: response.status,
          statusText: response.statusText,
          errorMessage: errorData.error,
          errorType: errorData.errorType,
          errorCode: errorData.errorCode,
          stack: errorData.stack
        });
        throw new Error(`Render function failed (${response.status}): ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.chunkUrl) {
        throw new Error(`Render failed: ${data.error || 'No chunk URL returned'}`);
      }

      logger.info('[Chunked Renderer] Production render complete', {
        chunkId: chunk.id,
        chunkUrl: data.chunkUrl,
        renderTime: data.renderTime,
        fileSize: `${(data.fileSize / 1024 / 1024).toFixed(2)}MB`
      });

      return data.chunkUrl;

    } catch (error) {
      logger.error('[Chunked Renderer] Production render failed', {
        chunkId: chunk.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get render order prioritizing high-priority chunks
   */
  private getRenderOrder(chunks: VideoChunk[]): number[] {
    const prioritized = chunks.map((chunk, index) => ({
      index,
      priority: chunk.priority,
      hasImages: chunk.scenes.some(s => !!s.imageUrl)
    }));

    // Sort: high priority first, then chunks with images, then by index
    prioritized.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      if (a.hasImages && !b.hasImages) return -1;
      if (!a.hasImages && b.hasImages) return 1;
      return a.index - b.index;
    });

    return prioritized.map(p => p.index);
  }

  /**
   * Get current rendering progress
   */
  getProgress(totalChunks: number): RenderProgress {
    const completed = this.completedChunks.size;
    const inProgress = this.renderingChunks.size;
    const failed = this.failedChunks.size;
    const pending = totalChunks - completed - inProgress - failed;

    return {
      total: totalChunks,
      completed,
      inProgress,
      failed,
      pending,
      percentComplete: (completed / totalChunks) * 100
    };
  }

  /**
   * Reset renderer state
   */
  reset(): void {
    this.renderingChunks.clear();
    this.completedChunks.clear();
    this.failedChunks.clear();
  }

  /**
   * Check if all chunks are complete
   */
  isComplete(totalChunks: number): boolean {
    return this.completedChunks.size === totalChunks;
  }

  /**
   * Get failed chunk IDs
   */
  getFailedChunks(): string[] {
    return Array.from(this.failedChunks);
  }

  /**
   * Retry failed chunks
   */
  async retryFailedChunks(
    chunks: VideoChunk[],
    format: 'vertical' | 'horizontal',
    videoId: string,
    options: RenderOptions = {}
  ): Promise<ChunkRenderResult[]> {
    const failedChunkIds = this.getFailedChunks();
    
    if (failedChunkIds.length === 0) {
      logger.info('[Chunked Renderer] No failed chunks to retry');
      return [];
    }

    logger.info('[Chunked Renderer] Retrying failed chunks', {
      count: failedChunkIds.length,
      chunkIds: failedChunkIds
    });

    const failedChunks = chunks.filter(c => failedChunkIds.includes(c.id));
    
    // Clear failed status before retry
    failedChunkIds.forEach(id => this.failedChunks.delete(id));

    return this.renderChunks(failedChunks, format, videoId, options);
  }

  /**
   * Get estimated time remaining
   */
  getEstimatedTimeRemaining(
    chunks: VideoChunk[],
    averageRenderTime: number // ms per chunk
  ): number {
    const remaining = chunks.length - this.completedChunks.size - this.failedChunks.size;
    const parallelBatches = Math.ceil(remaining / this.maxParallelChunks);
    
    return parallelBatches * averageRenderTime;
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate render statistics
   */
  getRenderStatistics(results: ChunkRenderResult[]): {
    totalChunks: number;
    successful: number;
    failed: number;
    totalRenderTime: number;
    avgRenderTime: number;
    totalFileSize: number;
  } {
    const successful = results.filter(r => r.status === 'complete');
    const failed = results.filter(r => r.status === 'failed');

    return {
      totalChunks: results.length,
      successful: successful.length,
      failed: failed.length,
      totalRenderTime: successful.reduce((sum, r) => sum + (r.renderTime || 0), 0),
      avgRenderTime: successful.reduce((sum, r) => sum + (r.renderTime || 0), 0) / successful.length,
      totalFileSize: successful.reduce((sum, r) => sum + (r.fileSize || 0), 0)
    };
  }
}
