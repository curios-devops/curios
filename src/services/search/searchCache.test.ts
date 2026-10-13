import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCached, setCached } from './searchCache.ts';

// Coming back to a search must not spend a new LLM/search call — but a stale answer
// (older than the TTL) must be fetched again rather than shown forever.
describe('searchCache', () => {
  beforeEach(() => { vi.useRealTimers(); });

  it('returns what was stored for the same search', () => {
    setCached('why is the sky blue|false|false', { answer: 'Rayleigh scattering' });
    expect(getCached<{ answer: string }>('why is the sky blue|false|false')?.value.answer).toBe('Rayleigh scattering');
  });

  it('keeps the plain and the Ask Deeper versions apart', () => {
    setCached('q|false|false', 'snack');
    setCached('q|true|false', 'deep');
    expect(getCached<string>('q|false|false')?.value).toBe('snack');
    expect(getCached<string>('q|true|false')?.value).toBe('deep');
  });

  it('expires after 30 minutes', () => {
    setCached('old', 'x', Date.now() - 31 * 60 * 1000);
    expect(getCached('old')).toBeNull();
  });
});
