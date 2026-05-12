/**
 * TTS Narration Service
 * Generates voice narration for cinematic videos
 * Primary: ElevenLabs TTS
 * Fallback: OpenAI TTS
 */

import { logger } from '../../../utils/logger';
import { supabase } from '../../../lib/supabase';

export interface NarrationSegment {
  text: string;
  startTime: number;
  duration: number;
  sceneId?: string;
}

export interface NarrationResult {
  audioUrl: string;
  audioBase64?: string;
  duration: number;
  format: string;
  provider: 'elevenlabs' | 'openai';
}

export interface NarrationOptions {
  voice?: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
}

export class NarrationService {
  private readonly ttsTimeoutMs = 25000;

  /**
   * Generate narration audio from text segments
   */
  async generateNarration(
    segments: NarrationSegment[],
    options: NarrationOptions = {}
  ): Promise<NarrationResult> {
    logger.info('[NarrationService] Starting narration generation', {
      segmentCount: segments.length,
      provider: 'elevenlabs (primary)',
    });

    // Combine all text segments
    const fullText = segments.map((seg) => seg.text).join(' ');

    try {
      const result = await this.generateWithElevenLabs(fullText, options);
      logger.info('[NarrationService] ElevenLabs narration generated successfully');
      logger.info('[NarrationService] TTS provider selected', {
        provider: result.provider,
        segmentCount: segments.length,
      });
      return result;
    } catch (elevenLabsError) {
      logger.info('[NarrationService] ElevenLabs unavailable, using OpenAI fallback', {
        error: elevenLabsError instanceof Error ? elevenLabsError.message : String(elevenLabsError),
      });
    }

    try {
      const result = await this.generateWithOpenAI(fullText, options);
      logger.info('[NarrationService] OpenAI TTS fallback successful');
      logger.info('[NarrationService] TTS provider selected', {
        provider: result.provider,
        segmentCount: segments.length,
      });
      return result;
    } catch (openAIError) {
      logger.error('[NarrationService] OpenAI TTS failed', {
        openAIError: openAIError instanceof Error ? openAIError.message : String(openAIError),
      });
      throw new Error('Failed to generate narration with available providers');
    }
  }

  /**
   * Generate narration with ElevenLabs TTS
   */
  private async generateWithElevenLabs(
    text: string,
    options: NarrationOptions
  ): Promise<NarrationResult> {
    // Use default voice: Sarah - Mature, Reassuring, Confident
    const voiceId = options.voice || 'EXAVITQu4vr4xnSDxMaL';

    const data = await this.invokeTtsFunction('elevenlabs-tts', {
      text,
      voiceId,
      stability: options.stability,
      similarityBoost: options.similarityBoost,
    });

    // ElevenLabs returns audio as base64
    if (!data.audio) {
      throw new Error('No audio data returned from ElevenLabs');
    }

    // Convert base64 to data URL
    const audioDataUrl = `data:audio/mpeg;base64,${data.audio}`;

    // Estimate duration based on text length (rough: ~150 words per minute = 2.5 words/sec)
    const estimatedDuration = this.estimateDuration(text);

    return {
      audioUrl: audioDataUrl,
      audioBase64: data.audio,
      duration: estimatedDuration,
      format: 'mp3',
      provider: 'elevenlabs',
    };
  }

  /**
   * Generate narration with OpenAI TTS (fallback)
   */
  private async generateWithOpenAI(
    text: string,
    options: NarrationOptions
  ): Promise<NarrationResult> {
    const voice = options.voice || 'alloy';
    const speed = options.speed ?? 1.0;

    const data = await this.invokeTtsFunction('openai-tts', {
        text,
        voice,
        speed,
        model: 'tts-1-hd',
      });

    return {
      audioUrl: data.audioUrl || data.url || (data.audio ? `data:audio/mpeg;base64,${data.audio}` : ''),
      audioBase64: data.audioBase64 || data.audio,
      duration: data.duration || 0,
      format: data.format || 'mp3',
      provider: 'openai',
    };
  }

  private async invokeTtsFunction(
    functionName: 'elevenlabs-tts' | 'openai-tts',
    body: Record<string, unknown>
  ): Promise<any> {
    const invokePromise = supabase.functions.invoke(functionName, { body });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${functionName} timed out after ${this.ttsTimeoutMs}ms`)), this.ttsTimeoutMs);
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    if (error) {
      throw new Error(`${functionName} error: ${error.message}`);
    }

    if (!data || (!data.audio && !data.audioUrl && !data.url && !data.audioBase64)) {
      throw new Error(`No audio returned from ${functionName}`);
    }

    return data;
  }

  /**
   * Generate synchronized narration segments (for future use)
   * This would generate separate audio for each scene
   */
  async generateSegmentedNarration(
    segments: NarrationSegment[],
    options: NarrationOptions = {}
  ): Promise<Map<string, NarrationResult>> {
    const results = new Map<string, NarrationResult>();

    for (const segment of segments) {
      if (!segment.sceneId) continue;

      try {
        const result = await this.generateNarration([segment], options);
        results.set(segment.sceneId, result);
      } catch (error) {
        logger.error('[NarrationService] Failed to generate segment narration', {
          sceneId: segment.sceneId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Estimate audio duration from text (rough estimate)
   * Average speaking rate: ~150 words per minute
   */
  estimateDuration(text: string): number {
    const words = text.split(/\s+/).length;
    const wordsPerSecond = 150 / 60; // 2.5 words per second
    return Math.ceil(words / wordsPerSecond);
  }
}
