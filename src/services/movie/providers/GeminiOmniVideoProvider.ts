// Premium image-to-video provider for the Enhance path (replaces LTX there). Same generate()
// shape as RunPodLTXProvider so enhanceSwipeImage can swap between them. Calls the
// gemini-omni-video edge function (Vertex AI service-account auth, uploads to movie-assets).
// Backend = Gemini Omni Flash via the Vertex Interactions API (Veo 3.1 is the env-swap fallback).

import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';

export interface GeminiOmniVideoRequest {
  imageUrl: string;
  prompt: string;
  duration: number;
  userId?: string;
  projectId?: string;
  sceneId?: string;
}

export class GeminiOmniVideoProvider {
  async generate(request: GeminiOmniVideoRequest): Promise<{ videoUrl: string; duration: number }> {
    logger.info('[Movie/Omni] Rendering enhanced video', {
      prompt: request.prompt?.slice(0, 50),
      duration: request.duration,
    });

    const uid = request.userId || 'guest';
    const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;

    const { data, error } = await supabase.functions.invoke('gemini-omni-video', {
      body: {
        imageUrl: request.imageUrl,
        prompt: request.prompt,
        aspectRatio: '16:9',
        storageBucket: 'movie-assets',
        storagePath: `${uid}/videos/${uuid}.mp4`,
      },
    });

    if (error) {
      throw new Error(`gemini-omni-video error: ${error.message}`);
    }

    const payload = data as { videoUrl?: string; error?: string };
    if (payload?.error) {
      throw new Error(payload.error);
    }
    if (!payload?.videoUrl) {
      logger.error('[Movie/Omni] No video URL in response', { data });
      throw new Error('gemini-omni-video returned no videoUrl');
    }

    return { videoUrl: payload.videoUrl, duration: request.duration };
  }
}
