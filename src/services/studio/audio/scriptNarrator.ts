/**
 * Script Narrator
 * Converts script text into speech-friendly narration
 */

import { logger } from '../../../utils/logger';
import { VideoScene } from '../types';

export interface NarrationSegment {
  sceneIndex: number;
  text: string;
  duration: number; // Scene duration in seconds
  style: string;
}

export class ScriptNarrator {
  /**
   * Convert scenes into narration segments
   * Filters out very short text and formats for speech
   */
  generateNarration(scenes: VideoScene[], fps: number = 30): NarrationSegment[] {
    logger.info('[Script Narrator] Generating narration', { sceneCount: scenes.length });

    const segments: NarrationSegment[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const durationFrames = scene.to - scene.from;
      const durationSeconds = durationFrames / fps;

      // Clean and format text for speech
      const narrationText = this.formatForSpeech(scene.text, scene.style);

      // Only include if text is substantial enough
      if (narrationText.trim().length > 5 && durationSeconds >= 1) {
        segments.push({
          sceneIndex: i,
          text: narrationText,
          duration: durationSeconds,
          style: scene.style
        });
      } else {
        logger.debug('[Script Narrator] Skipping short scene', {
          index: i,
          textLength: scene.text.length,
          duration: durationSeconds
        });
      }
    }

    logger.info('[Script Narrator] Narration generated', {
      totalScenes: scenes.length,
      narrationSegments: segments.length
    });

    return segments;
  }

  /**
   * Format text to be more speech-friendly
   */
  formatForSpeech(text: string, style: string): string {
    let formatted = text;

    // Remove multiple spaces
    formatted = formatted.replace(/\s+/g, ' ');

    // Add pauses for readability (commas become slight pauses)
    formatted = formatted.replace(/([.!?])/g, '$1 ');

    // Handle questions with emphasis
    if (formatted.includes('?')) {
      // Question marks already provide natural inflection
    }

    // Add slight pause before important transitions
    if (style === 'hook' || style === 'takeaway') {
      formatted = formatted.trim() + '.'; // Ensure ending punctuation
    }

    return formatted.trim();
  }

  /**
   * Split long text into chunks that fit within time constraints
   * Useful if a scene's text is too long for its duration
   */
  splitIntoChunks(text: string, maxDuration: number, wordsPerMinute: number = 150): string[] {
    const words = text.split(/\s+/);
    const maxWords = Math.floor((maxDuration / 60) * wordsPerMinute);

    if (words.length <= maxWords) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk: string[] = [];

    for (const word of words) {
      currentChunk.push(word);

      if (currentChunk.length >= maxWords) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    logger.warn('[Script Narrator] Text split into chunks', {
      originalWords: words.length,
      chunks: chunks.length,
      maxDuration
    });

    return chunks;
  }

  /**
   * Estimate if narration will fit within scene duration
   */
  checkNarrationFit(narrationSegments: NarrationSegment[], wordsPerMinute: number = 150): {
    fits: boolean;
    issues: Array<{ sceneIndex: number; estimatedDuration: number; availableDuration: number }>;
  } {
    const issues: Array<{ sceneIndex: number; estimatedDuration: number; availableDuration: number }> = [];

    for (const segment of narrationSegments) {
      const words = segment.text.split(/\s+/).length;
      const estimatedDuration = (words / wordsPerMinute) * 60;

      if (estimatedDuration > segment.duration) {
        issues.push({
          sceneIndex: segment.sceneIndex,
          estimatedDuration,
          availableDuration: segment.duration
        });
      }
    }

    const fits = issues.length === 0;

    if (!fits) {
      logger.warn('[Script Narrator] Some narrations may not fit', { issueCount: issues.length });
    }

    return { fits, issues };
  }

  /**
   * Generate full script narration text (all scenes combined)
   */
  generateFullNarration(scenes: VideoScene[]): string {
    const texts = scenes
      .map(scene => this.formatForSpeech(scene.text, scene.style))
      .filter(text => text.length > 5);

    return texts.join(' ');
  }

  /**
   * Add natural pauses between sentences
   */
  addPauses(text: string, pauseDuration: number = 0.3): string {
    // SSML-like pause notation (if TTS supports it)
    return text
      .replace(/\./g, `. <break time="${pauseDuration}s"/>`)
      .replace(/\?/g, `? <break time="${pauseDuration}s"/>`)
      .replace(/!/g, `! <break time="${pauseDuration}s"/>`);
  }
}
