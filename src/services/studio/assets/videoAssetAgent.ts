/**
 * Video Asset Agent
 * Coordinates finding appropriate stock videos for scenes
 */

import { logger } from '../../../utils/logger';
import { PexelsService } from './pexelsService';
import { AssetManager } from './assetManager';
import { SceneStructure, VideoScene } from '../types';

export interface SceneWithAsset extends VideoScene {
  videoUrl?: string;
  videoKeywords?: string;
}

export interface SceneAssets {
  scenes: SceneWithAsset[];
  totalVideos: number;
  failedScenes: number;
}

export class VideoAssetAgent {
  private pexelsService: PexelsService;
  private assetManager: AssetManager;
  private enabled: boolean;

  constructor() {
    this.pexelsService = new PexelsService();
    this.assetManager = new AssetManager();
    this.enabled = !!import.meta.env.VITE_PEXELS_API_KEY;
  }

  /**
   * Find and assign video assets to all scenes
   */
  async assignVideoAssets(
    sceneStructure: SceneStructure,
    format: 'vertical' | 'horizontal',
    onProgress?: (current: number, total: number) => void
  ): Promise<SceneAssets> {
    if (!this.enabled) {
      logger.warn('[Video Asset Agent] Pexels API not configured, skipping asset assignment');
      return {
        scenes: sceneStructure.scenes,
        totalVideos: 0,
        failedScenes: sceneStructure.scenes.length,
      };
    }

    logger.info('[Video Asset Agent] Starting asset assignment', {
      sceneCount: sceneStructure.scenes.length,
      format,
    });

    const scenesWithAssets: SceneWithAsset[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < sceneStructure.scenes.length; i++) {
      const scene = sceneStructure.scenes[i];
      onProgress?.(i + 1, sceneStructure.scenes.length);

      try {
        // Search for appropriate video
        const videoUrl = await this.pexelsService.searchForScene(scene.text, format);
        
        if (videoUrl) {
          // Get cached or direct URL
          const assetUrl = await this.assetManager.getAsset(videoUrl);
          
          scenesWithAssets.push({
            ...scene,
            videoUrl: assetUrl,
            videoKeywords: this.pexelsService.extractKeywords(scene.text),
          });
          
          successCount++;
          logger.debug('[Video Asset Agent] Asset assigned', {
            sceneIndex: i,
            keywords: this.pexelsService.extractKeywords(scene.text),
          });
        } else {
          // No video found, use gradient fallback
          scenesWithAssets.push({
            ...scene,
            videoUrl: undefined,
          });
          failCount++;
        }

        // Rate limiting: wait 500ms between requests
        if (i < sceneStructure.scenes.length - 1) {
          await this.delay(500);
        }
      } catch (error) {
        logger.error('[Video Asset Agent] Failed to assign asset', {
          sceneIndex: i,
          error,
        });
        
        scenesWithAssets.push({
          ...scene,
          videoUrl: undefined,
        });
        failCount++;
      }
    }

    logger.info('[Video Asset Agent] Asset assignment complete', {
      total: sceneStructure.scenes.length,
      success: successCount,
      failed: failCount,
    });

    return {
      scenes: scenesWithAssets,
      totalVideos: successCount,
      failedScenes: failCount,
    };
  }

  /**
   * Assign a single fallback video for all scenes (faster option)
   */
  async assignSingleVideo(
    sceneStructure: SceneStructure,
    format: 'vertical' | 'horizontal',
    query: string
  ): Promise<SceneAssets> {
    if (!this.enabled) {
      return {
        scenes: sceneStructure.scenes,
        totalVideos: 0,
        failedScenes: sceneStructure.scenes.length,
      };
    }

    logger.info('[Video Asset Agent] Assigning single video for all scenes', { query, format });

    try {
      // Search for one video that matches the overall topic
      const videoUrl = await this.pexelsService.searchForScene(query, format);
      
      if (!videoUrl) {
        return {
          scenes: sceneStructure.scenes,
          totalVideos: 0,
          failedScenes: sceneStructure.scenes.length,
        };
      }

      const assetUrl = await this.assetManager.getAsset(videoUrl);

      // Assign same video to all scenes
      const scenesWithAssets: SceneWithAsset[] = sceneStructure.scenes.map(scene => ({
        ...scene,
        videoUrl: assetUrl,
        videoKeywords: query,
      }));

      logger.info('[Video Asset Agent] Single video assigned to all scenes');

      return {
        scenes: scenesWithAssets,
        totalVideos: 1,
        failedScenes: 0,
      };
    } catch (error) {
      logger.error('[Video Asset Agent] Failed to assign single video', { error });
      return {
        scenes: sceneStructure.scenes,
        totalVideos: 0,
        failedScenes: sceneStructure.scenes.length,
      };
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if asset service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
