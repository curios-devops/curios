/**
 * Chunk Planner Service
 * Splits video scenes into renderable chunks (5-10s each)
 * Respects sentence boundaries to avoid mid-sentence cuts
 */

import { logger } from '../../../utils/logger';
import { SceneStructure, VideoScene } from '../types';

export interface VideoChunk {
  id: string;              // chunk_0, chunk_1, etc.
  index: number;           // 0, 1, 2...
  startTime: number;       // seconds
  endTime: number;         // seconds
  startFrame: number;      // 30 FPS
  endFrame: number;        // 30 FPS
  duration: number;        // seconds
  scenes: VideoScene[];    // Scenes included in this chunk
  priority: 'high' | 'normal'; // For render ordering
}

export interface SplitPoint {
  frame: number;
  sceneIndex: number;
  isSentenceBoundary: boolean;
  confidence: number; // 0-1 (1 = perfect split)
}

export interface ChunkPlan {
  chunks: VideoChunk[];
  totalChunks: number;
  totalDuration: number;
  averageChunkDuration: number;
  sentenceBoundaryCompliance: number; // % of chunks that split at sentence boundaries
}

export class ChunkPlanner {
  private readonly fps = 30; // Frames per second
  private readonly targetChunkDuration: number; // seconds

  constructor(targetChunkDuration: number = 3) {
    // Default to 3 seconds for Netlify free tier (10s timeout)
    // 3s video renders in ~6-9s (fits in 10s timeout)
    this.targetChunkDuration = targetChunkDuration;
  }

  /**
   * Plan chunks from scene structure
   * Main entry point
   */
  planChunks(sceneStructure: SceneStructure): ChunkPlan {
    logger.info('[Chunk Planner] Planning chunks', {
      sceneCount: sceneStructure.scenes.length,
      totalDuration: sceneStructure.duration,
      targetChunkDuration: this.targetChunkDuration
    });

    const chunks = this.splitIntoChunks(sceneStructure);
    const compliance = this.calculateSentenceBoundaryCompliance(chunks);

    const plan: ChunkPlan = {
      chunks,
      totalChunks: chunks.length,
      totalDuration: sceneStructure.duration,
      averageChunkDuration: sceneStructure.duration / chunks.length,
      sentenceBoundaryCompliance: compliance
    };

    logger.info('[Chunk Planner] Plan complete', {
      totalChunks: plan.totalChunks,
      avgDuration: plan.averageChunkDuration.toFixed(2),
      sentenceCompliance: `${(compliance * 100).toFixed(0)}%`
    });

    return plan;
  }

  /**
   * Split scenes into chunks respecting sentence boundaries
   */
  private splitIntoChunks(sceneStructure: SceneStructure): VideoChunk[] {
    const chunks: VideoChunk[] = [];
    let currentChunkScenes: VideoScene[] = [];
    let currentChunkStartFrame = 0;
    let currentChunkDuration = 0;

    for (let i = 0; i < sceneStructure.scenes.length; i++) {
      const scene = sceneStructure.scenes[i];
      const sceneDuration = (scene.to - scene.from) / this.fps;

      // Check if adding this scene would exceed target duration
      if (currentChunkDuration + sceneDuration > this.targetChunkDuration && currentChunkScenes.length > 0) {
        // Check if we should finalize chunk here
        if (this.shouldSplitHere(scene, currentChunkScenes)) {
          // Finalize current chunk
          chunks.push(this.createChunk(
            chunks.length,
            currentChunkStartFrame,
            currentChunkScenes
          ));

          // Start new chunk
          currentChunkScenes = [scene];
          currentChunkStartFrame = scene.from;
          currentChunkDuration = sceneDuration;
        } else {
          // Include this scene in current chunk to avoid bad split
          currentChunkScenes.push(scene);
          currentChunkDuration += sceneDuration;
        }
      } else {
        // Add scene to current chunk
        currentChunkScenes.push(scene);
        currentChunkDuration += sceneDuration;
      }
    }

    // Add final chunk
    if (currentChunkScenes.length > 0) {
      chunks.push(this.createChunk(
        chunks.length,
        currentChunkStartFrame,
        currentChunkScenes
      ));
    }

    // Assign priorities
    return this.assignChunkPriorities(chunks);
  }

  /**
   * Determine if we should split at this point
   */
  private shouldSplitHere(scene: VideoScene, currentChunkScenes: VideoScene[]): boolean {
    // Always split if current chunk is getting too long (>5 seconds for free tier)
    const currentDuration = currentChunkScenes.reduce(
      (sum, s) => sum + (s.to - s.from) / this.fps,
      0
    );

    if (currentDuration > 5) {
      return true; // Force split (keep under 10s timeout)
    }

    // Check if last scene in current chunk ends with sentence boundary
    const lastScene = currentChunkScenes[currentChunkScenes.length - 1];
    if (this.isSentenceBoundary(lastScene.text)) {
      return true; // Good split point
    }

    // If new scene starts a new chapter, split here
    if (scene.chapter && lastScene.chapter !== scene.chapter) {
      return true;
    }

    // If scene style changes significantly, consider splitting
    if (this.isStyleTransition(lastScene.style, scene.style)) {
      return true;
    }

    // Don't split (include scene in current chunk)
    return false;
  }

  /**
   * Check if text ends with sentence-ending punctuation
   */
  private isSentenceBoundary(text: string): boolean {
    const trimmed = text.trim();
    return /[.!?]\s*$/.test(trimmed);
  }

  /**
   * Check if there's a significant style transition
   */
  private isStyleTransition(fromStyle: VideoScene['style'], toStyle: VideoScene['style']): boolean {
    // Hook -> Explain: Good split
    if (fromStyle === 'hook' && toStyle === 'explain') return true;
    
    // Explain -> Takeaway: Good split
    if (fromStyle === 'explain' && toStyle === 'takeaway') return true;
    
    // Takeaway -> Outro: Good split
    if (fromStyle === 'takeaway' && toStyle === 'outro') return true;

    return false;
  }

  /**
   * Create a video chunk from scenes
   */
  private createChunk(
    index: number,
    startFrame: number,
    scenes: VideoScene[]
  ): VideoChunk {
    const endFrame = scenes[scenes.length - 1].to;
    const duration = (endFrame - startFrame) / this.fps;

    return {
      id: `chunk_${index}`,
      index,
      startTime: startFrame / this.fps,
      endTime: endFrame / this.fps,
      startFrame,
      endFrame,
      duration,
      scenes,
      priority: 'normal' // Will be assigned later
    };
  }

  /**
   * Assign priorities to chunks for rendering order
   */
  private assignChunkPriorities(chunks: VideoChunk[]): VideoChunk[] {
    return chunks.map((chunk, index) => {
      let priority: 'high' | 'normal' = 'normal';

      // First chunk is always high priority (hook)
      if (index === 0) {
        priority = 'high';
      }

      // Chunks with hook or takeaway scenes are high priority
      const hasHighPriorityStyle = chunk.scenes.some(
        s => s.style === 'hook' || s.style === 'takeaway'
      );
      if (hasHighPriorityStyle) {
        priority = 'high';
      }

      // Chunks with image overlays are high priority
      const hasImageOverlay = chunk.scenes.some(s => !!s.imageUrl);
      if (hasImageOverlay) {
        priority = 'high';
      }

      return { ...chunk, priority };
    });
  }

  /**
   * Calculate sentence boundary compliance percentage
   */
  private calculateSentenceBoundaryCompliance(chunks: VideoChunk[]): number {
    if (chunks.length <= 1) return 1.0; // Single chunk = 100% compliance

    let compliantChunks = 0;

    for (let i = 0; i < chunks.length - 1; i++) {
      const chunk = chunks[i];
      const lastScene = chunk.scenes[chunk.scenes.length - 1];
      
      if (this.isSentenceBoundary(lastScene.text)) {
        compliantChunks++;
      }
    }

    // Last chunk always counts as compliant (end of video)
    compliantChunks++;

    return compliantChunks / chunks.length;
  }

  /**
   * Get recommended chunk duration based on video length
   */
  static getRecommendedChunkDuration(_videoDuration: number): number {
    // Optimized for Netlify free tier (10s timeout)
    // Render time = chunk duration × 2-3x
    
    // All videos: 3s chunks (renders in ~6-9s, fits in 10s timeout)
    // This allows using Netlify free tier!
    return 3;
  }

  /**
   * Validate chunk plan (for debugging)
   */
  validateChunkPlan(plan: ChunkPlan): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for gaps between chunks
    for (let i = 0; i < plan.chunks.length - 1; i++) {
      const currentChunk = plan.chunks[i];
      const nextChunk = plan.chunks[i + 1];

      if (currentChunk.endFrame !== nextChunk.startFrame) {
        issues.push(`Gap detected between chunk ${i} and ${i + 1}`);
      }
    }

    // Check for chunks that are too long (>5s for free tier)
    plan.chunks.forEach(chunk => {
      if (chunk.duration > 5) {
        issues.push(`Chunk ${chunk.index} is too long (${chunk.duration.toFixed(1)}s) - may timeout on Netlify free tier`);
      }
    });

    // Check for chunks that are too short (<2s)
    plan.chunks.forEach(chunk => {
      if (chunk.duration < 2) {
        issues.push(`Chunk ${chunk.index} is too short (${chunk.duration.toFixed(1)}s)`);
      }
    });

    // Check sentence boundary compliance
    if (plan.sentenceBoundaryCompliance < 0.7) {
      issues.push(`Low sentence boundary compliance (${(plan.sentenceBoundaryCompliance * 100).toFixed(0)}%)`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get render order (high priority first)
   */
  getRenderOrder(chunks: VideoChunk[]): number[] {
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
   * Get chunk by ID
   */
  getChunkById(chunks: VideoChunk[], chunkId: string): VideoChunk | undefined {
    return chunks.find(c => c.id === chunkId);
  }

  /**
   * Get chunk statistics for logging
   */
  getChunkStatistics(chunks: VideoChunk[]): {
    total: number;
    highPriority: number;
    normalPriority: number;
    withImages: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
  } {
    return {
      total: chunks.length,
      highPriority: chunks.filter(c => c.priority === 'high').length,
      normalPriority: chunks.filter(c => c.priority === 'normal').length,
      withImages: chunks.filter(c => c.scenes.some(s => !!s.imageUrl)).length,
      avgDuration: chunks.reduce((sum, c) => sum + c.duration, 0) / chunks.length,
      minDuration: Math.min(...chunks.map(c => c.duration)),
      maxDuration: Math.max(...chunks.map(c => c.duration))
    };
  }
}
