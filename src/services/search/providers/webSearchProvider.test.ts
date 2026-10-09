import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: string[] = [];
const fake = (engine: string, n: number) => Array.from({ length: n }, (_, i) => ({ title: `${engine}${i}`, url: `https://${engine}.test/${i}`, snippet: '' }));
let counts = { exa: 0, tavily: 0, brave: 0 };

vi.mock('./engines/exaService', () => ({
  searchExa: async () => { calls.push('exa'); return fake('exa', counts.exa); },
}));
vi.mock('../../../commonService/searchTools/tavilyService', () => ({
  searchWithTavily: async () => { calls.push('tavily'); return { results: fake('tavily', counts.tavily).map((r) => ({ ...r, content: '' })), images: [] }; },
}));
vi.mock('./engines/braveAdapter', () => ({
  searchBraveWeb: async () => { calls.push('brave'); return fake('brave', counts.brave); },
}));

import { executeWebSearch } from './webSearchProvider';

describe('executeWebSearch — Exa → Tavily → Brave', () => {
  beforeEach(() => { calls.length = 0; counts = { exa: 0, tavily: 0, brave: 0 }; });

  // Fast Search = one query, one engine when it suffices: extra engines cost money and Brave's 1 req/s.
  it('stops at Exa when Exa alone is enough', async () => {
    counts.exa = 8;
    expect(await executeWebSearch('q')).toHaveLength(8);
    expect(calls).toEqual(['exa']);
  });

  it('falls back in order and merges, stopping as soon as results suffice', async () => {
    counts = { exa: 2, tavily: 6, brave: 9 };
    const results = await executeWebSearch('q');
    expect(calls).toEqual(['exa', 'tavily']);
    expect(results.map((r) => r.url)).toContain('https://exa.test/0');
    expect(results).toHaveLength(8);
  });

  it('reaches Brave only when both Exa and Tavily come back sparse', async () => {
    counts = { exa: 0, tavily: 1, brave: 9 };
    await executeWebSearch('q');
    expect(calls).toEqual(['exa', 'tavily', 'brave']);
  });
});
