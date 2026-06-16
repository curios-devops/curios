// Step 7 — Scene video via LTX image-to-video.
// Calls the generate-movie-video edge function, which forwards to Wavespeed's hosted
// LTX-2 image-to-video API and returns a Supabase Storage URL. Same WAVESPEED_API_KEY /
// toggle Cinematic uses — pay-per-call, no self-hosted GPU. (Class name kept for now;
// the edge function is the swappable backend seam.)

import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';

export interface RunPodLTXRequest {
  imageUrl: string;
  prompt: string;
  duration: number;
  seed?: number;
  userId?: string;
  projectId?: string;
  sceneId?: string;
}

export class RunPodLTXProvider {
  private readonly executeModelCall: boolean;

  constructor() {
    // Reuse the same opt-in toggle cinematic's Wavespeed providers use.
    this.executeModelCall = import.meta.env.VITE_ENABLE_WAVESPEED_EDGE_CALLS === 'true';
  }

  isAvailable(): boolean {
    return this.executeModelCall;
  }

  async generate(request: RunPodLTXRequest): Promise<{ videoUrl: string; duration: number }> {
    if (!this.executeModelCall) {
      throw new Error('Movie LTX disabled (set VITE_ENABLE_WAVESPEED_EDGE_CALLS=true to enable)');
    }

    logger.info('[Movie/LTX] Rendering scene video', {
      prompt: request.prompt?.slice(0, 50),
      duration: request.duration,
    });

    const { data, error } = await supabase.functions.invoke('generate-movie-video', {
      body: {
        imageUrl: request.imageUrl,
        prompt: request.prompt,
        duration: request.duration,
        generateAudio: true, // LTX synthesizes its own audio track for each swipe
        seed: request.seed,
        userId: request.userId,
        projectId: request.projectId,
        sceneId: request.sceneId,
        executeModelCall: true,
      },
    });

    if (error) {
      throw new Error(`generate-movie-video error: ${error.message}`);
    }

    const payload = data as { videoUrl?: string; duration?: number; error?: string };
    if (payload?.error) {
      throw new Error(payload.error);
    }
    if (!payload?.videoUrl) {
      throw new Error('generate-movie-video returned no videoUrl');
    }

    return { videoUrl: payload.videoUrl, duration: payload.duration ?? request.duration };
  }
}
