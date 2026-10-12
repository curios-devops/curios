import { supabase } from '../../lib/supabase.ts';
import { logger } from '../../utils/logger.ts';
import { rememberTier, type QuestionTier } from './modelTier.ts';

// Modes that Auto can resolve to. 'movie' is the Video mode (Cinematic was merged into it).
export type AutoIntent = 'search' | 'stories' | 'movie' | 'character';

export interface AutoDecision {
  mode: AutoIntent;
  /** Decisions API buy-intent probability; null when the server fell back (client must resolve it). */
  buyProbability: number | null;
  /** Decisions movie-topic probability (Movie 🍿); null when the server fell back. */
  movieProbability: number | null;
  /** Decisions music-topic probability (Music 🎵); null when the server fell back. */
  musicProbability: number | null;
}

const CLASSIFY_TIMEOUT_MS = 3000;
const FALLBACK: AutoDecision = { mode: 'search', buyProbability: null, movieProbability: null, musicProbability: null };

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
        const d = data as { mode?: string; buyProbability?: number | null; movieProbability?: number | null; musicProbability?: number | null; tier?: QuestionTier | null; backend?: string } | null;
        logger.info('[Auto] intent', { mode: d?.mode, buy: d?.buyProbability, movie: d?.movieProbability, music: d?.musicProbability, tier: d?.tier, backend: d?.backend });
        // The same call rated difficulty — cache it so the destination page doesn't ask again.
        rememberTier(trimmed, d?.tier ?? null);
        const mode = d?.mode;
        return {
          mode: mode === 'stories' || mode === 'movie' || mode === 'character' ? mode : 'search',
          buyProbability: typeof d?.buyProbability === 'number' ? d.buyProbability : null,
          movieProbability: typeof d?.movieProbability === 'number' ? d.movieProbability : null,
          musicProbability: typeof d?.musicProbability === 'number' ? d.musicProbability : null,
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

export type ExploreWay = 'watch' | 'play' | 'listen' | 'read';

export interface ExploreOptions {
  /** Decisions API pick; null when it was unavailable. Never 'listen' (not built yet). */
  recommended: Exclude<ExploreWay, 'listen'> | null;
  /** One-line pitch per way, in the question's language, plus `game`: a related real game. */
  lines: Partial<Record<ExploreWay | 'game', string>>;
}

// "Explore further" under a Search answer: which experience to recommend next.
export async function fetchExploreOptions(query: string, answer: string): Promise<ExploreOptions> {
  try {
    const { data, error } = await supabase.functions.invoke('classify-intent', {
      body: { query: query.trim(), answer: answer.slice(0, 800), only: 'explore' },
    });
    if (error) throw error;
    const d = data as Partial<ExploreOptions> | null;
    const rec = d?.recommended;
    return {
      recommended: rec === 'watch' || rec === 'play' || rec === 'read' ? rec : null,
      lines: d?.lines ?? {},
    };
  } catch (error) {
    logger.error('Explore options failed', { error });
    return { recommended: null, lines: {} };
  }
}
