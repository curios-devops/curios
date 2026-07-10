// Step 7 — Scene video via LTX image-to-video.
// Calls the generate-movie-video edge function. PRIMARY backend is the self-hosted RunPod
// LTX-2 worker, which is ASYNC (a render takes minutes): the function returns
// { jobId, async: true } and this provider polls the video_jobs row until it's ready.
// If the job errors or times out, it retries once with forceBackend:"wavespeed" — the
// hosted synchronous fallback (same WAVESPEED_API_KEY / toggle Cinematic uses).

import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';

// fp8 renders are 20-45s warm; a cold start adds ~2-3 min. Beyond 6 minutes something
// is wrong (queue stall, lost webhook) — give up and retry via Wavespeed.
const JOB_POLL_INTERVAL_MS = 5000;
const JOB_TIMEOUT_MS = 6 * 60 * 1000;

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

    try {
      return await this.invokeEdge(request);
    } catch (err) {
      // RunPod job failed or timed out → one retry on the hosted synchronous fallback.
      logger.warn('[Movie/LTX] Primary backend failed, retrying via Wavespeed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return await this.invokeEdge(request, 'wavespeed');
    }
  }

  private async invokeEdge(
    request: RunPodLTXRequest,
    forceBackend?: 'wavespeed',
  ): Promise<{ videoUrl: string; duration: number }> {
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
        ...(forceBackend ? { forceBackend } : {}),
      },
    });

    if (error) {
      throw new Error(`generate-movie-video error: ${error.message}`);
    }

    const payload = data as { videoUrl?: string; duration?: number; error?: string; jobId?: string; async?: boolean };
    if (payload?.error) {
      throw new Error(payload.error);
    }
    // Async RunPod path: poll the video_jobs row until the webhook marks it ready.
    if (payload?.async && payload.jobId) {
      const videoUrl = await this.awaitJob(payload.jobId);
      return { videoUrl, duration: request.duration };
    }
    if (!payload?.videoUrl) {
      throw new Error('generate-movie-video returned no videoUrl');
    }
    return { videoUrl: payload.videoUrl, duration: payload.duration ?? request.duration };
  }

  /** Poll the video_jobs row (UUID is the capability — works for guests too). */
  private async awaitJob(jobId: string): Promise<string> {
    const deadline = Date.now() + JOB_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL_MS));
      const { data, error } = await supabase
        .from('video_jobs')
        .select('status, video_url, error')
        .eq('id', jobId)
        .maybeSingle();
      if (error) continue; // transient — keep polling within the deadline
      if (data?.status === 'ready' && data.video_url) return data.video_url;
      if (data?.status === 'error') {
        throw new Error(data.error || 'video job failed');
      }
    }
    throw new Error('video job timed out');
  }
}
