// What a Character answer stands on, decided per question while the presenter connects (the
// presenter never waits for it): an easy evergreen question needs no search (the model knows it,
// and answers sooner); current events or a complex question get Context.dev's fresh research
// (context-answer); anything else, the usual web search. Research waits at most 7 s, then the
// usual search (already running) answers instead; the presenter can fill that wait out loud.
import { supabase } from '../../lib/supabase';
import { executeWebSearch, type WebSearchResult } from '../search/providers/webSearchProvider';
import type { TurnDecision } from '../auto/modelTier';
import { mark } from './timing';
import { readerGeo } from '../../utils/readerGeo';

export type Grounding = 'none' | 'research' | 'search';

const RESEARCH_TIMEOUT_MS = 7000;

export function groundingFor({ tier, news }: Pick<TurnDecision, 'tier' | 'news'>): Grounding {
  if (news || tier === 'complex') return 'research';
  return tier === 'easy' ? 'none' : 'search';
}

/** Context.dev's answer first (as the main source), then the pages it read. Empty on failure.
 *  In the question's language, knowing the user's city (for "near me", local news, weather). */
async function research(question: string, language: string | null): Promise<WebSearchResult[]> {
  const { city } = await readerGeo();
  const { data } = await supabase.functions.invoke('context-answer', { body: { question, language, city } });
  const answer = typeof data?.answer === 'string' ? data.answer : '';
  if (!answer) return [];
  const urls: string[] = Array.isArray(data?.sources) ? data.sources : [];
  return [
    { title: 'Fresh web research', url: urls[0] ?? '', snippet: answer, content: answer },
    ...urls.slice(0, 4).map((url) => ({ title: new URL(url).hostname, url, snippet: '' })),
  ];
}

/** onResearch: research starts (a moment's wait — say so). */
export async function groundTurn(question: string, decision: Promise<TurnDecision>, onResearch?: () => void): Promise<WebSearchResult[]> {
  // The usual search starts now, so that path doesn't wait for the decision.
  const search = executeWebSearch(question).then((r) => r.slice(0, 6)).catch(() => [] as WebSearchResult[]);
  const decided = await decision;
  const how = groundingFor(decided);
  mark('grounding', { how });
  if (how === 'none') return [];
  if (how === 'search') return search;
  onResearch?.();
  const late = new Promise<WebSearchResult[]>((resolve) => setTimeout(() => resolve([]), RESEARCH_TIMEOUT_MS));
  const fresh = await Promise.race([research(question, decided.language).catch(() => [] as WebSearchResult[]), late]);
  return fresh.length ? fresh : search;
}
