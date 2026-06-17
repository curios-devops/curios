// Tavily Deep search wrapper (search_depth: 'advanced'). Used for the principal
// and expansion angles in Ask Deeper, where retrieval quality matters more than
// latency/cost.

import { searchWithTavily } from '../../../../commonService/searchTools/tavilyService';
import type { WebSearchResult } from '../webSearchProvider';

export async function searchTavilyDeep(query: string): Promise<WebSearchResult[]> {
  try {
    const { results } = await searchWithTavily(query, 'advanced');
    return results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      content: r.content,
    }));
  } catch {
    return [];
  }
}
