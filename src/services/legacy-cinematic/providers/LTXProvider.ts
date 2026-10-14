/**
 * LTX Video Provider (Lightricks LTX-2-Fast via Wavespeed)
 * Ultra-fast 1080p text-to-video with synchronized audio
 *
 * API: https://wavespeed.ai
 * Model: lightricks/ltx-2-fast/text-to-video
 * Speed: 5-15 seconds generation time
 * Use case: Draft videos (state: 'Draft')
 */

import { VideoGenerationRequest, VideoGenerationResult } from '../types';
import { logger } from '../../../utils/logger';
import { supabase } from '../../../lib/supabase';

interface LTXResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputs?: string[];
  error?: string | null;
}

interface LTXGenerationParams {
  prompt: string;
  duration: 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20;
  generate_audio?: boolean;
}

export class LTXProvider {
  private readonly executeModelCall: boolean;

  constructor() {
    this.executeModelCall = import.meta.env.VITE_ENABLE_WAVESPEED_EDGE_CALLS === 'true';
  }

  /**
   * Generate video with LTX-2-Fast (ultra-fast 1080p)
   */
  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    if (!this.executeModelCall) {
      throw new Error('LTX edge generation disabled (set VITE_ENABLE_WAVESPEED_EDGE_CALLS=true to enable)');
    }

    logger.info('[LTXProvider] Starting LTX-2-Fast generation', {
      prompt: request.prompt?.slice(0, 50),
      duration: request.duration,
    });

    const params: LTXGenerationParams = {
      prompt: request.prompt || '',
      duration: this.normalizeDuration(request.duration),
      generate_audio: false, // No audio for draft (faster)
    };

    try {
      const response = await this.callLTXAPI(params);

      if (response.status === 'failed') {
        throw new Error(response.error || 'LTX generation failed');
      }

      if (!response.outputs || response.outputs.length === 0) {
        throw new Error('No video output from LTX');
      }

      const videoUrl = response.outputs[0];

      logger.info('[LTXProvider] LTX-2-Fast generation succeeded', {
        videoUrl,
        taskId: response.id,
      });

      return {
        videoUrl,
        duration: params.duration,
        width: 1920,  // 1080p
        height: 1080, // 1080p
        generationId: `ltx_${response.id}`,
      };
    } catch (error) {
      logger.error('[LTXProvider] LTX generation failed', {
        error: error instanceof Error ? error.message : String(error),
        prompt: request.prompt?.slice(0, 50),
      });
      throw error;
    }
  }

  /**
   * Call LTX-2-Fast API endpoint
   */
  private async callLTXAPI(params: LTXGenerationParams): Promise<LTXResponse> {
    logger.debug('[LTXProvider] Calling generate-cinematic edge function for LTX', { params });

    const { data, error } = await supabase.functions.invoke('generate-cinematic', {
      body: {
        action: 'model',
        model: 'ltx-2-fast',
        executeModelCall: this.executeModelCall,
        prompt: params.prompt,
        duration: params.duration,
        generate_audio: params.generate_audio ?? false,
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
          body?: { id?: string; status?: string; outputs?: string[]; error?: string | null };
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
        id: upstreamBody?.id || `ltx_${Date.now()}`,
        status: 'completed',
        outputs: [videoUrl],
      };
    }

    throw new Error('LTX edge function did not return a video output URL');
  }

  /**
   * Normalize duration to LTX supported values
   * Supported: 6, 8, 10, 12, 14, 16, 18, 20
   */
  private normalizeDuration(duration?: number): 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 {
    if (!duration || duration <= 6) return 6;
    if (duration <= 8) return 8;
    if (duration <= 10) return 10;
    if (duration <= 12) return 12;
    if (duration <= 14) return 14;
    if (duration <= 16) return 16;
    if (duration <= 18) return 18;
    return 20;
  }

  /**
   * Check if LTX is available
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
        body: { action: 'model', model: 'ltx-2-fast', executeModelCall: false, prompt: 'health-check', duration: 8 },
      });

      if (error) return false;

      const payload = data as { error?: string } | null;
      return !payload?.error;
    } catch {
      return false;
    }
  }
}

/**
 * Implementation notes:
 * - Uses lightricks/ltx-2-fast/text-to-video model via Wavespeed
 * - Supports 1080p generation with optional audio
 * - Audio disabled for draft mode (faster generation)
 * - Polls every 2 seconds as recommended by documentation
 */
