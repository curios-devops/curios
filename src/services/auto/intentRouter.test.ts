import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockResponse: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock('../../lib/supabase.ts', () => ({
  supabase: { functions: { invoke: async () => mockResponse } },
}));

import { classifyIntent } from './intentRouter.ts';

describe('classifyIntent (Auto mode router)', () => {
  beforeEach(() => {
    mockResponse = { data: null, error: null };
  });

  // Auto exists to route people OUT of Search when another mode fits better — the router must
  // pass Video and Character through, not collapse them into search.
  it('passes Video (movie) and Character decisions through', async () => {
    mockResponse = { data: { mode: 'movie', buyProbability: 0.02, backend: 'decisions' }, error: null };
    expect(await classifyIntent('how do black holes form')).toEqual({ mode: 'movie', buyProbability: 0.02 });

    mockResponse = { data: { mode: 'character', buyProbability: 0.01, backend: 'decisions' }, error: null };
    expect((await classifyIntent('can we practice my job interview')).mode).toBe('character');
  });

  // Cinematic was merged into Video and must never be a route target, even if the server sends it.
  it('maps retired or unknown modes to search', async () => {
    mockResponse = { data: { mode: 'cinematic', buyProbability: null }, error: null };
    expect(await classifyIntent('x')).toEqual({ mode: 'search', buyProbability: null });
  });

  // buyProbability null tells the caller the server fell back and it must resolve buy intent
  // locally — a missing value must not be read as "no buy intent" (0).
  it('keeps buyProbability null when the server fell back', async () => {
    mockResponse = { data: { mode: 'search', backend: 'gpt-5' }, error: null };
    expect((await classifyIntent('best running shoes')).buyProbability).toBeNull();
  });

  // Auto must never block the user.
  it('degrades to search on errors and empty input', async () => {
    mockResponse = { data: null, error: new Error('boom') };
    expect(await classifyIntent('anything')).toEqual({ mode: 'search', buyProbability: null });
    expect(await classifyIntent('   ')).toEqual({ mode: 'search', buyProbability: null });
  });
});
