/**
 * Scene Generator
 * Generates cinematic scenes using VEO with Pexels fallback
 */

import { VeoWithFallbackProvider } from '../providers/VeoWithFallbackProvider';
import { CinematicScene, SceneProgress, VideoGenerationRequest } from '../types';

export class SceneGenerator {
  private provider: VeoWithFallbackProvider;

  constructor() {
    this.provider = new VeoWithFallbackProvider();
    console.log('[SceneGenerator] Using VEO with Pexels fallback provider');
  }

  /**
   * Generate all scenes sequentially using VEO with Pexels fallback
   * Returns a Map of sceneId -> video URL
   */
  async generateScenes(
    scenes: CinematicScene[],
    onProgress?: (progress: SceneProgress[]) => void
  ): Promise<Map<string, string>> {
    console.log(`[SceneGenerator] Generating ${scenes.length} scenes with VEO (Pexels fallback)...`);

    // Initialize progress tracking
    const sceneProgress: SceneProgress[] = scenes.map((scene) => ({
      sceneId: scene.id,
      sceneIndex: scene.index,
      status: 'pending',
      progress: 0,
    }));

    if (onProgress) {
      onProgress([...sceneProgress]);
    }

    const sceneVideos = new Map<string, string>();

    // Build video generation requests
    const requests: VideoGenerationRequest[] = scenes.map((scene) => ({
      prompt: scene.videoPrompt,
      duration: scene.duration,
      aspectRatio: scene.id.includes('vertical') || scene.videoPrompt.includes('vertical') ? '9:16' : '16:9',
    }));

    try {
      // Mark all scenes as generating
      for (let i = 0; i < scenes.length; i++) {
        sceneProgress[i].status = 'processing';
        sceneProgress[i].progress = 25;
      }

      if (onProgress) {
        onProgress([...sceneProgress]);
      }

      // Generate all scenes with sequential processing and queue management
      const results = await this.provider.generateBatch(requests);

      // Store results
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const result = results[i];

        sceneVideos.set(scene.id, result.videoUrl);

        // Mark as complete
        sceneProgress[i].status = 'completed';
        sceneProgress[i].progress = 100;
        sceneProgress[i].generationId = result.generationId;

        console.log(
          `[SceneGenerator] Scene ${scene.index} (${scene.type}) generated: ${result.videoUrl.substring(0, 50)}...`
        );

        // Update progress after each scene completes
        if (onProgress) {
          onProgress([...sceneProgress]);
        }
      }

      console.log(`[SceneGenerator] All ${scenes.length} scenes generated successfully`);
      return sceneVideos;
    } catch (error) {
      console.error(`[SceneGenerator] Scene generation failed:`, error);

      // Mark failed scenes
      for (let i = 0; i < scenes.length; i++) {
        if (sceneProgress[i].status !== 'completed') {
          sceneProgress[i].status = 'failed';
          sceneProgress[i].error = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      if (onProgress) {
        onProgress([...sceneProgress]);
      }

      throw error;
    }
  }

  /**
   * Regenerate a single scene
   */
  async regenerateScene(scene: CinematicScene): Promise<string> {
    console.log(`[SceneGenerator] Regenerating scene ${scene.index} (${scene.type})...`);

    const result = await this.provider.generate({
      prompt: scene.videoPrompt,
      duration: scene.duration,
      aspectRatio: scene.videoPrompt.includes('vertical') ? '9:16' : '16:9',
    });

    console.log(`[SceneGenerator] Scene ${scene.index} regenerated successfully`);
    return result.videoUrl;
  }

  /**
   * Check if provider is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      return await this.provider.healthCheck();
    } catch (error) {
      console.error('[SceneGenerator] Availability check failed:', error);
      return false;
    }
  }
}
