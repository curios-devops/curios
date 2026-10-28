import { describe, expect, it, vi } from 'vitest';

// No live calls in tests: the search provider (and its browser-only config) stays out.
vi.mock('../search/providers/webSearchProvider', () => ({ executeWebSearch: vi.fn() }));

import { groundingFor } from './grounding';

describe('What a Character answer stands on', () => {
  it('researches current events with Context.dev even when the question looks easy — the model alone would answer with stale facts', () => {
    expect(groundingFor({ tier: 'easy', news: true })).toBe('research');
  });

  it('researches complex questions too: a quick web search is too thin for them', () => {
    expect(groundingFor({ tier: 'complex', news: false })).toBe('research');
  });

  it('answers easy evergreen questions straight away, without waiting on any search', () => {
    expect(groundingFor({ tier: 'easy', news: false })).toBe('none');
  });

  it('falls back to the usual web search when the quick decision is unknown (timed out) — never an ungrounded answer by accident', () => {
    expect(groundingFor({ tier: null, news: false })).toBe('search');
    expect(groundingFor({ tier: 'normal', news: false })).toBe('search');
  });
});
