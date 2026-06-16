// Step 11 — Viral Director Agent.
// After the final movie exists, analyze it for shareability and produce viral packaging.

import { callMovieLLMJson } from '../core/llm';
import { logger } from '../../../utils/logger';
import type { ViralPackage, MovieSwipe } from '../types';

const SYSTEM_PROMPT = `You are a viral content strategist. Given a question, narrative and swipe list,
produce packaging optimized for shares on X, LinkedIn, TikTok and Facebook.

Return JSON with:
- title: a curiosity-gap title that makes people click (no clickbait lies)
- caption: 1-2 sentence hook for the post body
- hashtags: 3-6 relevant lowercase hashtags WITHOUT the # symbol
- thumbnailText: 3-5 punchy words for a thumbnail overlay
- viralScore: integer 0-100 estimating shareability`;

export async function packageForVirality(params: {
  question: string;
  narrative: string;
  swipes: MovieSwipe[];
}): Promise<ViralPackage> {
  const swipeTitles = params.swipes.map((s) => s.title).join(', ');

  try {
    const result = await callMovieLLMJson<ViralPackage>(
      SYSTEM_PROMPT,
      `Question: ${params.question}\nNarrative: ${params.narrative}\nSwipes: ${swipeTitles}`,
      {
        title: 'string',
        caption: 'string',
        hashtags: 'string[]',
        thumbnailText: 'string',
        viralScore: 'number',
      },
      0.7,
    );

    return {
      title: result.title?.trim() || params.question,
      caption: result.caption?.trim() || '',
      hashtags: (result.hashtags || []).map((h) => h.replace(/^#/, '').trim()).filter(Boolean),
      thumbnailText: result.thumbnailText?.trim() || '',
      viralScore: Math.max(0, Math.min(100, Math.round(result.viralScore || 0))),
    };
  } catch (error) {
    logger.warn('[Movie/ViralDirector] Falling back to minimal packaging', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      title: params.question,
      caption: '',
      hashtags: [],
      thumbnailText: '',
      viralScore: 0,
    };
  }
}
