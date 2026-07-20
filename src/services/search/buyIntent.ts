// Buy-intent detection for the live Search flow (Auto mode + explicit Search mode).
// Ported from the legacy search's shopping-intent detection, extended with a Gemini
// Flash Lite tie-breaker for the ambiguous confidence band — the deterministic
// keyword/pattern heuristic already resolves confident cases for free (no network call).
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { detectShoppingIntent } from '../shopping-intent';

// Bands tuned against shopping-intent.ts's own TEST_QUERIES: clear negatives score 0,
// pattern-backed positives ("where to buy X", "$99", "X vs Y") score 70+ — both skip the
// LLM. A single bare keyword/category match (no pattern) lands in the middle and is
// genuinely ambiguous, so that's the only band that pays for a Gemini call.
const HIGH_CONFIDENCE = 55;
const LOW_CONFIDENCE = 20;
const GEMINI_TIMEOUT_MS = 2500;

export interface BuyIntentResult {
  isBuyIntent: boolean;
  confidence: number;
  method: 'heuristic-yes' | 'heuristic-no' | 'gemini' | 'timeout-fallback';
}

/** Resolve buy intent: algorithm first, Gemini Flash Lite only when the algorithm is unsure. */
export async function resolveBuyIntent(query: string): Promise<BuyIntentResult> {
  const trimmed = query.trim();
  if (!trimmed) return { isBuyIntent: false, confidence: 0, method: 'heuristic-no' };

  const heuristic = detectShoppingIntent(trimmed);

  if (heuristic.confidence >= HIGH_CONFIDENCE) {
    return { isBuyIntent: true, confidence: heuristic.confidence, method: 'heuristic-yes' };
  }
  if (heuristic.confidence <= LOW_CONFIDENCE) {
    return { isBuyIntent: false, confidence: heuristic.confidence, method: 'heuristic-no' };
  }

  // Ambiguous — ask Gemini Flash Lite to confirm or discard. Never blocks the caller:
  // falls back to the heuristic's own (pre-refactor) 40+ threshold on timeout/error.
  try {
    const classify = supabase.functions
      .invoke('classify-buy-intent', { body: { query: trimmed } })
      .then(({ data, error }) => {
        if (error) throw error;
        return (data as { isBuyIntent?: boolean } | null)?.isBuyIntent === true;
      });

    const timeout = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(heuristic.confidence >= 40), GEMINI_TIMEOUT_MS),
    );

    const isBuyIntent = await Promise.race([classify, timeout]);
    return { isBuyIntent, confidence: heuristic.confidence, method: 'gemini' };
  } catch (error) {
    logger.warn('[buyIntent] Gemini tie-break failed, using heuristic fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { isBuyIntent: heuristic.confidence >= 40, confidence: heuristic.confidence, method: 'timeout-fallback' };
  }
}
