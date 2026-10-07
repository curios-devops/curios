import { supabase } from '../../lib/supabase.ts';
import { logger } from '../../utils/logger.ts';

// Modes that Auto can resolve to. 'movie' is the Video mode (Cinematic was merged into it).
export type AutoIntent = 'search' | 'stories' | 'movie' | 'character';

export interface AutoDecision {
  mode: AutoIntent;
  /** Decisions API buy-intent probability; null when the server fell back (client must resolve it). */
  buyProbability: number | null;
}

const CLASSIFY_TIMEOUT_MS = 3000;
const FALLBACK: AutoDecision = { mode: 'search', buyProbability: null };

// Classify a free-text query into a target mode for Auto mode (OpenAI Decisions API server-side).
// Degrades gracefully to 'search' on any error or timeout — Auto must never block the user.
export async function classifyIntent(query: string): Promise<AutoDecision> {
  const trimmed = query.trim();
  if (!trimmed) return FALLBACK;

  try {
    const classify = supabase.functions
      .invoke('classify-intent', { body: { query: trimmed } })
      .then(({ data, error }): AutoDecision => {
        if (error) throw error;
        const d = data as { mode?: string; buyProbability?: number | null; backend?: string } | null;
        logger.info('[Auto] intent', { mode: d?.mode, buy: d?.buyProbability, backend: d?.backend });
        const mode = d?.mode;
        return {
          mode: mode === 'stories' || mode === 'movie' || mode === 'character' ? mode : 'search',
          buyProbability: typeof d?.buyProbability === 'number' ? d.buyProbability : null,
        };
      });

    const timeout = new Promise<AutoDecision>((resolve) =>
      setTimeout(() => resolve(FALLBACK), CLASSIFY_TIMEOUT_MS),
    );

    return await Promise.race([classify, timeout]);
  } catch (error) {
    logger.error('Intent classification failed, defaulting to search', { error });
    return FALLBACK;
  }
}
