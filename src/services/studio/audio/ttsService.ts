/**
 * TTS (Text-to-Speech) Service
 * Generates audio narration using OpenAI TTS
 */

import OpenAI from 'openai';
import { logger } from '../../../utils/logger';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
export type TTSModel = 'tts-1' | 'tts-1-hd';

export interface TTSOptions {
  voice?: TTSVoice;
  model?: TTSModel;
  speed?: number; // 0.25 to 4.0
}

export interface AudioSegment {
  text: string;
  audioUrl: string;
  duration: number; // in seconds
  voice: TTSVoice;
}

export class TTSService {
  private openai?: OpenAI;
  private enabled: boolean;
  private defaultVoice: TTSVoice = 'nova'; // Clear, engaging female voice
  private defaultModel: TTSModel = 'tts-1'; // Faster, good quality

  constructor() {
    this.enabled = !!OPENAI_API_KEY;
    
    if (this.enabled) {
      this.openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
        dangerouslyAllowBrowser: true, // For client-side usage
      });
    } else {
      logger.warn('[TTS Service] OpenAI API key not configured');
    }
  }

  /**
   * Generate speech from text
   * Returns base64 audio data URL
   */
  async generateSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<string> {
    if (!this.enabled) {
      throw new Error('TTS Service not configured (missing API key)');
    }

    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      voice = this.defaultVoice,
      model = this.defaultModel,
      speed = 1.0
    } = options;

    logger.info('[TTS Service] Generating speech', {
      textLength: text.length,
      voice,
      model,
      speed
    });

    try {
      const response = await this.openai.audio.speech.create({
        model,
        voice,
        input: text,
        speed,
        response_format: 'mp3'
      });

      // Convert response to blob
      const audioBlob = await response.blob();
      
      // Convert blob to base64 data URL
      const audioUrl = await this.blobToDataUrl(audioBlob);
      
      logger.info('[TTS Service] Speech generated', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      return audioUrl;
    } catch (error) {
      logger.error('[TTS Service] Speech generation failed', { error });
      throw error;
    }
  }

  /**
   * Generate speech and estimate duration
   * Uses rough estimate: ~150 words per minute for normal speech
   */
  async generateSpeechWithDuration(
    text: string,
    options: TTSOptions = {}
  ): Promise<AudioSegment> {
    const audioUrl = await this.generateSpeech(text, options);
    const duration = this.estimateDuration(text, options.speed || 1.0);

    return {
      text,
      audioUrl,
      duration,
      voice: options.voice || this.defaultVoice
    };
  }

  /**
   * Generate speech for multiple text segments
   */
  async generateMultipleSegments(
    texts: string[],
    options: TTSOptions = {}
  ): Promise<AudioSegment[]> {
    const segments: AudioSegment[] = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      
      try {
        const segment = await this.generateSpeechWithDuration(text, options);
        segments.push(segment);
        
        // Rate limiting: wait 500ms between requests
        if (i < texts.length - 1) {
          await this.delay(500);
        }
      } catch (error) {
        logger.error('[TTS Service] Failed to generate segment', { index: i, error });
        // Add empty segment as placeholder
        segments.push({
          text,
          audioUrl: '',
          duration: this.estimateDuration(text, options.speed || 1.0),
          voice: options.voice || this.defaultVoice
        });
      }
    }

    return segments;
  }

  /**
   * Estimate audio duration based on text length
   * Rough calculation: ~150 words per minute at normal speed
   */
  estimateDuration(text: string, speed: number = 1.0): number {
    const words = text.split(/\s+/).length;
    const wordsPerMinute = 150 * speed;
    const durationMinutes = words / wordsPerMinute;
    const durationSeconds = durationMinutes * 60;
    
    // Add small buffer for pauses
    return Math.max(1, durationSeconds * 1.1);
  }

  /**
   * Convert blob to data URL
   */
  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if TTS is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): Array<{ id: TTSVoice; name: string; description: string }> {
    return [
      { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice' },
      { id: 'echo', name: 'Echo', description: 'Male, authoritative' },
      { id: 'fable', name: 'Fable', description: 'British, storytelling' },
      { id: 'onyx', name: 'Onyx', description: 'Deep, newsreader' },
      { id: 'nova', name: 'Nova', description: 'Female, clear, engaging (default)' },
      { id: 'shimmer', name: 'Shimmer', description: 'Female, soft, warm' },
    ];
  }

  /**
   * Get recommended voice for content type
   */
  getRecommendedVoice(contentType: 'educational' | 'casual' | 'professional' = 'educational'): TTSVoice {
    const recommendations: Record<string, TTSVoice> = {
      educational: 'nova',     // Clear and engaging
      casual: 'shimmer',       // Warm and friendly
      professional: 'onyx',    // Authoritative
    };

    return recommendations[contentType] || 'nova';
  }
}
