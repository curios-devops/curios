/**
 * WAN Provider (Wavespeed AI - Wan 2.2)
 * Ultra-fast 480p video generation from text prompts
 *
 * API: https://wavespeed.ai
 * Model: wavespeed-ai/wan-2.2/i2v-480p-ultra-fast
 * Speed: 5-15 seconds generation time
 */

import { VideoGenerationRequest, VideoGenerationResult } from '../types';
import { logger } from '../../../utils/logger';
import { supabase } from '../../../lib/supabase';

interface WavespeedResponse {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  outputs?: string[];
  error?: string;
}

interface WANGenerationParams {
  duration: 5 | 8;
  image?: string;
  last_image?: string;
  prompt: string;
  negative_prompt?: string;
  seed?: number;
}

export class WANProvider {
  private readonly executeModelCall: boolean;

  constructor() {
    this.executeModelCall = import.meta.env.VITE_ENABLE_WAVESPEED_EDGE_CALLS === 'true';
  }

  /**
   * Generate video with WAN (Wavespeed ultra-fast model)
   */
  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.executeModelCall) {
      throw new Error('WAN edge generation disabled (set VITE_ENABLE_WAVESPEED_EDGE_CALLS=true to enable)');
    }

    logger.info('[WANProvider] Starting WAN generation', {
      prompt: request.prompt?.slice(0, 50),
      duration: request.duration,
    });

    const params: WANGenerationParams = {
      duration: this.normalizeDuration(request.duration),
      prompt: request.prompt || '',
      negative_prompt: 'blurry, low quality, distorted, watermark, text, logo',
      seed: -1, // Random seed
    };

    try {
      const response = await this.callWavespeedAPI(params);

      if (response.status === 'failed') {
        throw new Error(response.error || 'WAN generation failed');
      }

      if (!response.outputs || response.outputs.length === 0) {
        throw new Error('No video output from WAN');
      }

      const videoUrl = response.outputs[0];

      logger.info('[WANProvider] WAN generation succeeded', {
        videoUrl,
        taskId: response.id,
      });

      return {
        videoUrl,
        duration: params.duration,
        width: 854,  // 480p width
        height: 480, // 480p height
        generationId: `wan_${response.id}`,
      };
    } catch (error) {
      logger.error('[WANProvider] WAN generation failed', {
        error: error instanceof Error ? error.message : String(error),
        prompt: request.prompt?.slice(0, 50),
      });
      throw error;
    }
  }

  /**
   * Call Wavespeed API with automatic polling
   */
  private async callWavespeedAPI(params: WANGenerationParams): Promise<WavespeedResponse> {
    logger.debug('[WANProvider] Calling generate-cinematic edge function for WAN', { params });

    const { data, error } = await supabase.functions.invoke('generate-cinematic', {
      body: {
        action: 'model',
        model: 'wan',
        executeModelCall: this.executeModelCall,
        prompt: params.prompt,
        duration: params.duration,
        generate_audio: false,
      },
    });

    if (error) {
      throw new Error(`Supabase function error: ${error.message}`);
    }

    const payload = data as {
      wavespeed?: {
        videoUrl?: string;
        response?: {
          ok?: boolean;
          status?: number;
          body?: { id?: string; status?: string; outputs?: string[]; error?: string };
        };
      };
      error?: string;
    };

    if (payload?.error) {
      throw new Error(payload.error);
    }

    const upstreamBody = payload?.wavespeed?.response?.body;
    const videoUrl = payload?.wavespeed?.videoUrl || upstreamBody?.outputs?.[0];

    if (videoUrl) {
      return {
        id: upstreamBody?.id || `wan_${Date.now()}`,
        status: 'completed',
        outputs: [videoUrl],
      };
    }

    throw new Error('WAN edge function did not return a video output URL');
  }

  /**
   * Normalize duration to WAN supported values (5 or 8)
   */
  private normalizeDuration(duration?: number): 5 | 8 {
    if (!duration) return 8;
    return duration <= 5 ? 5 : 8;
  }

  /**
   * Check if WAN is available (edge-call toggle enabled)
   */
  isAvailable(): boolean {
    return this.executeModelCall;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-cinematic', {
        body: { action: 'model', model: 'wan', executeModelCall: false, prompt: 'health-check', duration: 8 },
      });

      if (error) return false;

      const payload = data as { error?: string } | null;
      return !payload?.error;
    } catch {
      return false;
    }
  }
}
