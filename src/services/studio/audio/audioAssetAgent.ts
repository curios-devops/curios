/**
 * Audio Asset Agent
 * Coordinates audio generation for video scenes
 */

import { logger } from '../../../utils/logger';
import { TTSService, TTSVoice } from './ttsService';
import { ScriptNarrator } from './scriptNarrator';
import { SceneStructure, VideoScene } from '../types';

export interface SceneWithAudio extends VideoScene {
  audioUrl?: string;
  audioDuration?: number;
  audioVoice?: TTSVoice;
}

export interface AudioAssets {
  scenes: SceneWithAudio[];
  totalAudioSegments: number;
  failedSegments: number;
  fullNarrationUrl?: string; // Optional: single audio track for entire video
}

export type AudioStrategy = 'per-scene' | 'full-narration' | 'none';

export class AudioAssetAgent {
  private ttsService: TTSService;
  private scriptNarrator: ScriptNarrator;
  private enabled: boolean;

  constructor() {
    this.ttsService = new TTSService();
    this.scriptNarrator = new ScriptNarrator();
    this.enabled = this.ttsService.isEnabled();
  }

  /**
   * Generate audio for each scene individually
   */
  async generatePerSceneAudio(
    sceneStructure: SceneStructure,
    voice?: TTSVoice,
    onProgress?: (current: number, total: number) => void
  ): Promise<AudioAssets> {
    if (!this.enabled) {
      logger.warn('[Audio Asset Agent] TTS not configured, skipping audio generation');
      return {
        scenes: sceneStructure.scenes,
        totalAudioSegments: 0,
        failedSegments: sceneStructure.scenes.length
      };
    }

    logger.info('[Audio Asset Agent] Generating per-scene audio', {
      sceneCount: sceneStructure.scenes.length,
      voice
    });

    // Generate narration segments
    const narrationSegments = this.scriptNarrator.generateNarration(
      sceneStructure.scenes,
      sceneStructure.fps
    );

    // Check if narration fits
    const fitCheck = this.scriptNarrator.checkNarrationFit(narrationSegments);
    if (!fitCheck.fits) {
      logger.warn('[Audio Asset Agent] Some narrations may be too long for their scenes', {
        issues: fitCheck.issues.length
      });
    }

    const scenesWithAudio: SceneWithAudio[] = [...sceneStructure.scenes];
    let successCount = 0;
    let failCount = 0;

    // Generate audio for each narration segment
    for (let i = 0; i < narrationSegments.length; i++) {
      const segment = narrationSegments[i];
      onProgress?.(i + 1, narrationSegments.length);

      try {
        const audioSegment = await this.ttsService.generateSpeechWithDuration(
          segment.text,
          { voice }
        );

        // Assign audio to corresponding scene
        const sceneIndex = segment.sceneIndex;
        scenesWithAudio[sceneIndex] = {
          ...scenesWithAudio[sceneIndex],
          audioUrl: audioSegment.audioUrl,
          audioDuration: audioSegment.duration,
          audioVoice: audioSegment.voice
        };

        successCount++;

        logger.debug('[Audio Asset Agent] Audio generated for scene', {
          sceneIndex,
          duration: audioSegment.duration
        });

        // Rate limiting
        if (i < narrationSegments.length - 1) {
          await this.delay(500);
        }
      } catch (error) {
        logger.error('[Audio Asset Agent] Failed to generate audio for scene', {
          sceneIndex: segment.sceneIndex,
          error
        });
        failCount++;
      }
    }

    logger.info('[Audio Asset Agent] Per-scene audio generation complete', {
      total: narrationSegments.length,
      success: successCount,
      failed: failCount
    });

    return {
      scenes: scenesWithAudio,
      totalAudioSegments: successCount,
      failedSegments: failCount
    };
  }

  /**
   * Generate single continuous narration for entire video
   */
  async generateFullNarration(
    sceneStructure: SceneStructure,
    voice?: TTSVoice
  ): Promise<AudioAssets> {
    if (!this.enabled) {
      return {
        scenes: sceneStructure.scenes,
        totalAudioSegments: 0,
        failedSegments: sceneStructure.scenes.length
      };
    }

    logger.info('[Audio Asset Agent] Generating full narration audio');

    try {
      // Generate combined narration text
      const fullText = this.scriptNarrator.generateFullNarration(sceneStructure.scenes);

      // Generate single audio file
      const audioSegment = await this.ttsService.generateSpeechWithDuration(
        fullText,
        { voice }
      );

      logger.info('[Audio Asset Agent] Full narration generated', {
        textLength: fullText.length,
        duration: audioSegment.duration
      });

      return {
        scenes: sceneStructure.scenes,
        totalAudioSegments: 1,
        failedSegments: 0,
        fullNarrationUrl: audioSegment.audioUrl
      };
    } catch (error) {
      logger.error('[Audio Asset Agent] Failed to generate full narration', { error });
      return {
        scenes: sceneStructure.scenes,
        totalAudioSegments: 0,
        failedSegments: 1
      };
    }
  }

  /**
   * Decide and generate audio based on scene count and content
   */
  async generateAudio(
    sceneStructure: SceneStructure,
    strategy: AudioStrategy = 'per-scene',
    voice?: TTSVoice,
    onProgress?: (current: number, total: number) => void
  ): Promise<AudioAssets> {
    if (strategy === 'none' || !this.enabled) {
      return {
        scenes: sceneStructure.scenes,
        totalAudioSegments: 0,
        failedSegments: 0
      };
    }

    if (strategy === 'full-narration') {
      return this.generateFullNarration(sceneStructure, voice);
    }

    // Default: per-scene
    return this.generatePerSceneAudio(sceneStructure, voice, onProgress);
  }

  /**
   * Get recommended audio strategy based on video characteristics
   */
  getRecommendedStrategy(sceneStructure: SceneStructure): AudioStrategy {
    const sceneCount = sceneStructure.scenes.length;
    const avgSceneDuration = sceneStructure.duration / sceneCount;

    // If many short scenes, use full narration
    if (sceneCount > 8 || avgSceneDuration < 3) {
      return 'full-narration';
    }

    // Otherwise, per-scene works well
    return 'per-scene';
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if audio generation is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get available voices from TTS service
   */
  getAvailableVoices() {
    return this.ttsService.getAvailableVoices();
  }

  /**
   * Get recommended voice for content
   */
  getRecommendedVoice(contentType: 'educational' | 'casual' | 'professional' = 'educational'): TTSVoice {
    return this.ttsService.getRecommendedVoice(contentType);
  }
}
