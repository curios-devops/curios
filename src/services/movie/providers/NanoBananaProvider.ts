// Default swipe-frame image provider — Gemini "Nano Banana 2 Lite" (gemini-3.1-flash-lite-image).
// Cheap + fast, so it's the default for BOTH the core and secondary swipe frames.
// Calls the gemini-image edge function (Vertex AI service-account auth, uploads to movie-assets).

import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';

export class NanoBananaProvider {
  async generate(
    imagePrompt: string,
    opts: { userId?: string; referenceImageUrl?: string; realismScore?: number } = {},
  ): Promise<string> {
    const uid = opts.userId || 'guest';
    const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;

    // Pipeline bands (docs/Movie/enhaced_refactor.md), adapted to an image-EDITING model:
    //  A REAL   (score > 80): the real photo IS the scene — recreate it faithfully.
    //  B HYBRID (50-80):      the prompt's scene leads; the photo anchors the subject.
    //  C FULL_AI (<50 / no photo): pure storyboard prompt — stylized art stays stylized,
    //  so deliberately NO photojournalism booster here.
    let prompt = imagePrompt;
    if (opts.referenceImageUrl) {
      prompt = (opts.realismScore ?? 0) > 80
        ? `Recreate the real scene in the attached photograph faithfully. Keep the real subject, layout, lighting and atmosphere. Adapt only the framing to: ${imagePrompt}. Photojournalistic, documentary quality, no text or watermarks.`
        : `SCENE TO CREATE: ${imagePrompt}\n\nUse the attached real photograph as the factual visual anchor: keep the real subject's appearance, materials and atmosphere authentic. Follow the SCENE's composition and framing. Photorealistic, documentary quality, no text or watermarks.`;
    }

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
