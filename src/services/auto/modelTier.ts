import { supabase } from '../../lib/supabase.ts';
import { logger } from '../../utils/logger.ts';
import { appSettings } from '../../config/appSettings.ts';

// Difficulty rating from the Decisions API (classify-intent) → answer model tier.
export type QuestionTier = 'easy' | 'normal' | 'complex';

export interface AnswerModel {
  model: string;
  tier: QuestionTier;
  /** The question deserved Astra but no credit was available, so Sol answered instead. */
  astraBlocked: boolean;
}

const TIER_TIMEOUT_MS = 2500;
const CACHE_KEY = 'curios_question_tiers';

const normalize = (q: string) => q.trim().toLowerCase();

function readCache(): Record<string, QuestionTier> {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

/** Auto mode already rated the question in its routing call — keep it so the page doesn't ask again. */
export function rememberTier(query: string, tier: QuestionTier | null): void {
  if (!tier) return;
  try {
    const cache = readCache();
    cache[normalize(query)] = tier;
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable — the page just asks again */
  }
}

const isTier = (v: unknown): v is QuestionTier => v === 'easy' || v === 'normal' || v === 'complex';

/** Rate a question's difficulty. Never blocks for long: null (→ Sol) on error or timeout. */
export async function decideTier(query: string): Promise<QuestionTier | null> {
  const cached = readCache()[normalize(query)];
  if (isTier(cached)) return cached;

  const call = supabase.functions
    .invoke('classify-intent', { body: { query: query.trim(), only: 'tier' } })
    .then(({ data, error }) => {
      if (error) throw error;
      const tier = (data as { tier?: unknown } | null)?.tier;
      return isTier(tier) ? tier : null;
    })
    .catch((error) => {
      logger.warn('[ModelTier] tier decision failed, using Sol', { error: String(error) });
      return null;
    });
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIER_TIMEOUT_MS));
  const tier = await Promise.race([call, timeout]);
  rememberTier(query, tier);
  return tier;
}

/**
 * Video (generated and Cinematic): easy or medium questions → Luna; complex → Sol. Unknown
 * tier → Luna. Astra only comes from the page's HD button (stepUp from Sol, 1 Pro Credit).
 */
export function pickVideoModel(tier: QuestionTier | null, models = appSettings.models): string {
  if (!models.router) return models.sol;
  return tier === 'complex' ? models.sol : models.luna;
}

/**
 * "Ask Deeper" (Search) and "Long Read" (Magazine): one model up from the one that wrote
 * the plain answer — Luna → Sol, Sol → Astra (Astra stays). Free: no credit is spent.
 */
export function stepUp(model: string, models = appSettings.models): string {
  return model === models.luna ? models.sol : models.astra;
}

/**
 * Tier → model. Astra costs one Pro credit: `tryConsumeCredit` spends it (no modal);
 * when it can't, the question is answered by Sol and flagged so the UI can offer an upgrade.
 */
export async function pickAnswerModel(
  tier: QuestionTier | null,
  tryConsumeCredit: () => Promise<boolean>,
  models = appSettings.models,
): Promise<AnswerModel> {
  if (!models.router || !tier || tier === 'normal') {
    return { model: models.sol, tier: tier ?? 'normal', astraBlocked: false };
  }
  if (tier === 'easy') return { model: models.luna, tier, astraBlocked: false };
  if (await tryConsumeCredit()) return { model: models.astra, tier, astraBlocked: false };
  return { model: models.sol, tier, astraBlocked: true };
}

export interface TurnDecision {
  tier: QuestionTier | null;
  /** A good answer depends on current events (news, something happening now). */
  news: boolean;
  /** The language the question was asked in ("es"), when detected. */
  language: string | null;
}

/** Character: the tier plus whether the question is about current events, in one quick call.
 *  Never blocks for long: unknown (→ the usual web search) on error or timeout. */
export async function decideTurn(query: string): Promise<TurnDecision> {
  const unknown: TurnDecision = { tier: null, news: false, language: null };
  const call = supabase.functions
    .invoke('classify-intent', { body: { query: query.trim(), only: 'tier', news: true } })
    .then(({ data, error }) => {
      if (error) throw error;
      const d = data as { tier?: unknown; news?: unknown; language?: unknown } | null;
      const tier = isTier(d?.tier) ? d.tier : null;
      rememberTier(query, tier);
      return { tier, news: typeof d?.news === 'number' && d.news >= 0.5, language: typeof d?.language === 'string' ? d.language : null };
    })
    .catch((error) => {
      logger.warn('[ModelTier] turn decision failed, using web search', { error: String(error) });
      return unknown;
    });
  const timeout = new Promise<TurnDecision>((resolve) => setTimeout(() => resolve(unknown), TIER_TIMEOUT_MS));
  return Promise.race([call, timeout]);
}
