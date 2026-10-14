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
  /** Decisions video-game probability (Games 🎮); null when the server fell back. */
  gameProbability: number | null;
}

const CLASSIFY_TIMEOUT_MS = 3000;
const FALLBACK: AutoDecision = { mode: 'search', buyProbability: null, movieProbability: null, musicProbability: null, gameProbability: null };

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
        const d = data as { mode?: string; buyProbability?: number | null; movieProbability?: number | null; musicProbability?: number | null; gameProbability?: number | null; tier?: QuestionTier | null; backend?: string } | null;
        logger.info('[Auto] intent', { mode: d?.mode, buy: d?.buyProbability, movie: d?.movieProbability, music: d?.musicProbability, game: d?.gameProbability, tier: d?.tier, backend: d?.backend });
        // The same call rated difficulty — cache it so the destination page doesn't ask again.
        rememberTier(trimmed, d?.tier ?? null);
        const mode = d?.mode;
        return {
          mode: mode === 'stories' || mode === 'movie' || mode === 'character' ? mode : 'search',
          buyProbability: typeof d?.buyProbability === 'number' ? d.buyProbability : null,
          movieProbability: typeof d?.movieProbability === 'number' ? d.movieProbability : null,
          musicProbability: typeof d?.musicProbability === 'number' ? d.musicProbability : null,
          gameProbability: typeof d?.gameProbability === 'number' ? d.gameProbability : null,
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
  /** Decisions API pick; null when it was unavailable. */
  recommended: ExploreWay | null;
  /** One-line pitch per way, in the question's language, plus a related real `game` and `song`,
   *  and the question's `topic` as a short noun phrase ("los agujeros de gusano"). */
  lines: Partial<Record<ExploreWay | 'game' | 'song' | 'topic', string>>;
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
      recommended: rec === 'watch' || rec === 'play' || rec === 'listen' || rec === 'read' ? rec : null,
      lines: d?.lines ?? {},
    };
  } catch (error) {
    logger.error('Explore options failed', { error });
    return { recommended: null, lines: {} };
  }
}

// ---- Magazine 📰 ----
export const MAGAZINE_SECTIONS = [
  'world', 'local', 'business', 'science', 'culture', 'lifestyle', 'opinion', 'sports', 'well',
  'ai', 'gadgets', 'ideas', 'environment', 'security', 'politics',
] as const;
export type MagazineSection = typeof MAGAZINE_SECTIONS[number];

export interface MagazinePlan {
  /** The main section first, then three more to rewrite the story from (Decisions). */
  sections: MagazineSection[];
  /** Current news (→ a news photo) rather than an evergreen topic (→ an AI image); null if unknown. */
  news: number | null;
}

const DEFAULT_PLAN: MagazinePlan = { sections: ['ideas', 'culture', 'science', 'world'], news: null };

/** Sections and news-vs-evergreen for a Magazine story (one Decisions call). */
export async function fetchMagazinePlan(query: string, location: string): Promise<MagazinePlan> {
  try {
    const { data, error } = await supabase.functions.invoke('classify-intent', {
      body: { query: query.trim(), location, only: 'magazine' },
    });
    if (error) throw error;
    const d = data as { sections?: string[]; news?: number | null } | null;
    const sections = (d?.sections ?? []).filter((s): s is MagazineSection => (MAGAZINE_SECTIONS as readonly string[]).includes(s));
    return { sections: sections.length ? sections : DEFAULT_PLAN.sections, news: typeof d?.news === 'number' ? d.news : null };
  } catch (error) {
    logger.error('Magazine plan failed', { error });
    return DEFAULT_PLAN;
  }
}
