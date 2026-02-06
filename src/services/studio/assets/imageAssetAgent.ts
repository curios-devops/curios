/**
 * Image Asset Agent
 * Assigns Brave Search images to scenes as overlays (supporting evidence)
 */

import { logger } from '../../../utils/logger';
import { BraveImageService, BraveImage } from './braveImageService';
import { SceneStructure, VideoScene } from '../types';

export type ImageStrategy = 'key-points' | 'all-scenes' | 'none';

export interface SceneWithImage extends VideoScene {
  imageUrl?: string;
  imageKeywords?: string;
  imageEffect?: 'zoom' | 'blur' | 'ken-burns' | 'fade';
  imageDuration?: number;
  imagePosition?: 'center' | 'top' | 'bottom';
  imageOpacity?: number;
}

export interface ImageAssets {
  scenes: SceneWithImage[];
  totalImages: number;
  failedScenes: number;
}

export class ImageAssetAgent {
  private braveService: BraveImageService;
  private enabled: boolean;

  constructor() {
    this.braveService = new BraveImageService();
    this.enabled = this.braveService.isEnabled();
  }

  /**
   * Check if image assets are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Assign images to scenes based on strategy
   */
  async assignImageOverlays(
    sceneStructure: SceneStructure,
    strategy: ImageStrategy = 'key-points'
  ): Promise<ImageAssets> {
    if (strategy === 'none' || !this.enabled) {
      logger.info('[Image Asset Agent] Images disabled or not configured');
      return {
        scenes: sceneStructure.scenes as SceneWithImage[],
        totalImages: 0,
        failedScenes: 0
      };
    }

    logger.info('[Image Asset Agent] Assigning images', {
      strategy,
      sceneCount: sceneStructure.scenes.length
    });

    if (strategy === 'key-points') {
      return this.assignKeyPointImages(sceneStructure);
    } else {
      return this.assignAllSceneImages(sceneStructure);
    }
  }

  /**
   * Assign images only to key-point scenes (2-3 per video)
   * This is the recommended strategy for most videos
   */
  private async assignKeyPointImages(
    sceneStructure: SceneStructure
  ): Promise<ImageAssets> {
    const scenesWithImages: SceneWithImage[] = [...sceneStructure.scenes];
    let totalImages = 0;
    let failedScenes = 0;

    // Select key-point scenes (not hook, not outro)
    const keyPointScenes = sceneStructure.scenes
      .map((scene, index) => ({ scene, index }))
      .filter(({ scene }) => 
        scene.style !== 'hook' && 
        scene.style !== 'outro'
      );

    // Limit to 2-3 key scenes
    const maxImages = Math.min(3, keyPointScenes.length);
    const selectedScenes = keyPointScenes.slice(0, maxImages);

    logger.info('[Image Asset Agent] Selected key-point scenes', {
      total: keyPointScenes.length,
      selected: selectedScenes.length
    });

    // Check if we have scenes to process
    if (selectedScenes.length === 0) {
      logger.warn('[Image Asset Agent] No scenes selected for images');
      return {
        scenes: scenesWithImages,
        totalImages: 0,
        failedScenes: 0
      };
    }

    // OPTIMIZATION: Make ONE API call with general video topic query
    // Instead of calling once per scene, get diverse images in one call
    try {
      // Create a general query from the first explain scene (most representative)
      const firstScene = selectedScenes[0].scene;
      const mood = this.getMoodFromStyle(firstScene.style);
      
      // Get MORE images in single call (count = selected scenes × 3 for better selection)
      const requestCount = Math.min(selectedScenes.length * 3, 10); // Max 10 to stay reasonable
      
      logger.info('[Image Asset Agent] Making single Brave API call (OPTIMIZED)', {
        requestCount,
        scenesToCover: selectedScenes.length,
        estimatedCost: '$0.005' // Only one API call!
      });

      const allImages = await this.braveService.searchForScene(
        firstScene.text,
        mood,
        { count: requestCount }
      );

      if (allImages.length === 0) {
        logger.warn('[Image Asset Agent] No images returned from Brave API');
        failedScenes = selectedScenes.length;
      } else {
        // Select best images from the pool
        const bestImages = this.braveService.selectBestImages(
          allImages, 
          selectedScenes.length
        );

        logger.info('[Image Asset Agent] Selected best images', {
          totalReturned: allImages.length,
          bestSelected: bestImages.length
        });

        // Assign images to scenes (NO MORE API CALLS!)
        selectedScenes.forEach(({ scene, index }, i) => {
          const selectedImage = bestImages[i];

          if (selectedImage) {
            const sceneDuration = (scene.to - scene.from) / 30; // frames to seconds
            const imageDuration = Math.min(5, sceneDuration - 1); // Max 5s, leave 1s for text
            const sceneMood = this.getMoodFromStyle(scene.style);

            scenesWithImages[index] = {
              ...scene,
              imageUrl: selectedImage.url,
              imageKeywords: this.braveService['engineerQuery'](scene.text, sceneMood),
              imageEffect: this.braveService.getRecommendedImageEffect(scene.style),
              imageDuration,
              imagePosition: 'center',
              imageOpacity: 0.8
            };

            totalImages++;
            
            logger.info('[Image Asset Agent] Image assigned to scene', {
              sceneIndex: index,
              sceneStyle: scene.style,
              imageUrl: selectedImage.url.substring(0, 50),
              effect: scenesWithImages[index].imageEffect
            });
          } else {
            failedScenes++;
            logger.warn('[Image Asset Agent] No image available for scene', {
              sceneIndex: index,
              sceneText: scene.text.substring(0, 50)
            });
          }
        });
      }

    } catch (error) {
      failedScenes = selectedScenes.length;
      logger.error('[Image Asset Agent] Failed to fetch images', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    logger.info('[Image Asset Agent] Key-point images assigned (OPTIMIZED: 1 API call)', {
      totalImages,
      failedScenes,
      strategy: 'key-points-optimized',
      apiCalls: 1, // Only ONE call per video!
      costSavings: '67% (1 call vs 2-3 calls)'
    });

    return {
      scenes: scenesWithImages,
      totalImages,
      failedScenes
    };
  }

  /**
   * Assign images to all scenes
   * Slower but provides more visual variety
   */
  private async assignAllSceneImages(
    sceneStructure: SceneStructure
  ): Promise<ImageAssets> {
    const scenesWithImages: SceneWithImage[] = [...sceneStructure.scenes];
    let totalImages = 0;
    let failedScenes = 0;

    // Skip hook and outro scenes even in all-scenes mode
    const scenesToProcess = sceneStructure.scenes
      .map((scene, index) => ({ scene, index }))
      .filter(({ scene }) => 
        scene.style !== 'hook' && 
        scene.style !== 'outro'
      );

    logger.info('[Image Asset Agent] Processing all scenes', {
      total: scenesToProcess.length
    });

    for (const { scene, index } of scenesToProcess) {
      try {
        const mood = this.getMoodFromStyle(scene.style);
        const images = await this.braveService.searchForScene(
          scene.text,
          mood,
          { count: 5 }
        );

        if (images.length > 0) {
          const bestImages = this.braveService.selectBestImages(images, 1);
          const selectedImage = bestImages[0];

          if (selectedImage) {
            const sceneDuration = (scene.to - scene.from) / 30;
            const imageDuration = Math.min(5, sceneDuration - 1);

            scenesWithImages[index] = {
              ...scene,
              imageUrl: selectedImage.url,
              imageKeywords: this.braveService['engineerQuery'](scene.text, mood),
              imageEffect: this.braveService.getRecommendedImageEffect(scene.style),
              imageDuration,
              imagePosition: 'center',
              imageOpacity: 0.75 // Slightly less opaque for all-scenes mode
            };

            totalImages++;
          }
        } else {
          failedScenes++;
        }

        // Rate limiting: wait 1000ms between requests to avoid rate limit errors
        await this.delay(1000);

      } catch (error) {
        failedScenes++;
        logger.error('[Image Asset Agent] Failed to fetch image for scene', {
          sceneIndex: index,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info('[Image Asset Agent] All-scenes images assigned', {
      totalImages,
      failedScenes,
      strategy: 'all-scenes'
    });

    return {
      scenes: scenesWithImages,
      totalImages,
      failedScenes
    };
  }

  /**
   * Get recommended image strategy based on video characteristics
   */
  getRecommendedStrategy(sceneStructure: SceneStructure): ImageStrategy {
    const sceneCount = sceneStructure.scenes.length;
    const duration = sceneStructure.duration;

    // For short videos (< 30s), use key-points only
    if (duration < 30) {
      return 'key-points';
    }

    // For videos with many scenes (> 8), use key-points to avoid too many API calls
    if (sceneCount > 8) {
      return 'key-points';
    }

    // Default: key-points (most cost-effective)
    return 'key-points';
  }

  /**
   * Map scene style to mood keyword for image search
   */
  private getMoodFromStyle(style: VideoScene['style']): string {
    const moodMap = {
      hook: 'dramatic urgent attention-grabbing',
      explain: 'clear focused professional',
      takeaway: 'inspiring conclusive impactful',
      outro: 'satisfying conclusive calm'
    };

    return moodMap[style] || 'professional';
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Preview image URLs before assignment (for testing)
   */
  async previewImages(
    sceneStructure: SceneStructure,
    maxScenes: number = 3
  ): Promise<Array<{ sceneIndex: number; query: string; images: BraveImage[] }>> {
    const previews: Array<{ sceneIndex: number; query: string; images: BraveImage[] }> = [];

    const keyPointScenes = sceneStructure.scenes
      .map((scene, index) => ({ scene, index }))
      .filter(({ scene }) => 
        scene.style !== 'hook' && 
        scene.style !== 'outro'
      )
      .slice(0, maxScenes);

    for (const { scene, index } of keyPointScenes) {
      const mood = this.getMoodFromStyle(scene.style);
      const query = this.braveService['engineerQuery'](scene.text, mood);
      const images = await this.braveService.searchForScene(scene.text, mood, { count: 5 });

      previews.push({ sceneIndex: index, query, images });

      // Rate limiting: wait 1000ms between requests to avoid rate limit errors
      await this.delay(1000);
    }

    return previews;
  }
}
