// Default swipe-frame image provider — Gemini "Nano Banana 2 Lite" (gemini-3.1-flash-lite-image).
// Cheap + fast, so it's the default for BOTH the core and secondary swipe frames.
// Calls the gemini-image edge function (Vertex AI service-account auth, uploads to movie-assets).

import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';

export class NanoBananaProvider {
  async generate(
    imagePrompt: string,
    opts: { userId?: string; referenceImageUrl?: string } = {},
  ): Promise<string> {
    const uid = opts.userId || 'guest';
    const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;

    // Pipeline A "REAL": when a real reference photo exists, the frame is REGENERATED from
    // image + text (the model is an editor) — real subject appearance, prompt's composition.
    const prompt = opts.referenceImageUrl
      ? `SCENE TO CREATE: ${imagePrompt}\n\nUse the attached real photograph as the factual visual anchor: keep the real subject's appearance, materials and atmosphere authentic. Follow the SCENE's composition and framing. Photorealistic, documentary quality, no text or watermarks.`
      : imagePrompt;

    const { data, error } = await supabase.functions.invoke('gemini-image', {
      body: {
        prompt,
        aspectRatio: '16:9',
        storageBucket: 'movie-assets',
        storagePath: `${uid}/images/${uuid}.png`,
        ...(opts.referenceImageUrl ? { referenceImageUrl: opts.referenceImageUrl } : {}),
      },
    });

    if (error) {
      throw new Error(`gemini-image error: ${error.message}`);
    }

    const payload = data as { url?: string; error?: string };
    if (payload?.error) {
      throw new Error(payload.error);
    }
    if (!payload?.url) {
      logger.error('[Movie/NanoBanana] No image URL in response', { data });
      throw new Error('gemini-image returned no image URL');
    }

    return payload.url;
  }
}
