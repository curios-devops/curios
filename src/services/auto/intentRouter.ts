import { supabase } from '../../lib/supabase.ts';
import { logger } from '../../utils/logger.ts';

// Modes that Auto can resolve to. Cinematic is never auto-routed.
export type AutoIntent = 'search' | 'avatar' | 'movie' | 'stories';

const CLASSIFY_TIMEOUT_MS = 3000;

// Classify a free-text query into a target mode for Auto mode.
// Degrades gracefully to 'search' on any error or timeout — Auto must never block the user.
export async function classifyIntent(query: string): Promise<AutoIntent> {
  const trimmed = query.trim();
  if (!trimmed) return 'search';

  try {
    const classify = supabase.functions
      .invoke('classify-intent', { body: { query: trimmed } })
      .then(({ data, error }) => {
        if (error) throw error;
        const mode = (data as { mode?: string } | null)?.mode;
        return mode === 'avatar' || mode === 'movie' || mode === 'stories' ? mode : 'search';
      });

    const timeout = new Promise<AutoIntent>((resolve) =>
      setTimeout(() => resolve('search'), CLASSIFY_TIMEOUT_MS),
    );

    return await Promise.race([classify, timeout]);
  } catch (error) {
    logger.error('Intent classification failed, defaulting to search', { error });
    return 'search';
  }
}
