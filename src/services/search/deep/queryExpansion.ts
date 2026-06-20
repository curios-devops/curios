// Ask Deeper — Step A: query expansion.
// One LLM call turns the user's query into three complementary searches:
//   - principal:   the optimized core query
//   - contrapunto: alternative evidence, risks, criticisms, opposing views
//   - expansion:   trends / "what people are saying" (biased to forums/Reddit)
// Agent-lite: a single deterministic-shaped call, not an agent swarm.

import { logger } from '../../../utils/logger';

export interface ExpandedQueries {
  principal: string;
  contrapunto: string;
  expansion: string;
}

/**
 * Expand a query into three complementary searches via the OpenAI edge function.
 * Falls back to sensible heuristic variants if the LLM call fails or returns
 * an unexpected shape, so the deep pipeline never hard-fails at this step.
 */
export async function expandQuery(
  query: string,
  locale: string
): Promise<ExpandedQueries> {
  const fallback: ExpandedQueries = {
    principal: query,
    contrapunto: `${query} risks criticism limitations opposing views`,
    expansion: `${query} reddit forum discussion opinions 2026`,
  };

  const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseEdgeUrl || !supabaseAnonKey) {
    logger.warn('QueryExpansion: edge function not configured, using fallback queries');
    return fallback;
  }

  const userMessage = `You generate web search queries. For the user query "${query}", produce three complementary search queries.

Return ONLY JSON: {"principal": "...", "contrapunto": "...", "expansion": "..."}
- principal: the core query, optimized for a web search engine.
- contrapunto: a query that surfaces alternative evidence, risks, criticisms or opposing views.
- expansion: a query for current trends and social discussion; bias it toward forums and Reddit (include words like "reddit" or "forum discussion").

Language: ${locale}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        prompt: JSON.stringify({
          input: [{ role: 'user', content: userMessage }],
          model: 'gpt-5-mini',
          response_format: { type: 'json_object' },
          max_output_tokens: 300,
          reasoning: { effort: 'low' },
        }),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn('QueryExpansion: API error, using fallback', { status: response.status });
      return fallback;
    }

    const data = await response.json();
    const content = data.text || data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    const result: ExpandedQueries = {
      principal: typeof parsed.principal === 'string' && parsed.principal.trim() ? parsed.principal.trim() : fallback.principal,
      contrapunto: typeof parsed.contrapunto === 'string' && parsed.contrapunto.trim() ? parsed.contrapunto.trim() : fallback.contrapunto,
      expansion: typeof parsed.expansion === 'string' && parsed.expansion.trim() ? parsed.expansion.trim() : fallback.expansion,
    };

    logger.info('QueryExpansion: expanded query', result);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    logger.warn('QueryExpansion: failed, using fallback', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return fallback;
  }
}
