import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('paced (per-engine 1s spacing)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.resetModules(); });
  afterEach(() => { vi.useRealTimers(); });

  // Brave's plan allows 1 req/s: a second concurrent call must wait, not 429.
  it('spaces two calls to the same engine by 1s', async () => {
    const { paced } = await import('./enginePacer');
    const started: number[] = [];
    const t0 = Date.now();
    const a = paced('brave', async () => { started.push(Date.now() - t0); });
    const b = paced('brave', async () => { started.push(Date.now() - t0); });
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.all([a, b]);
    expect(started).toEqual([0, 1000]);
  });

  // Parallel Exa + Tavily is the point of using two engines — they must not wait on each other.
  it('never delays a different engine', async () => {
    const { paced } = await import('./enginePacer');
    const started: string[] = [];
    await Promise.all([
      paced('exa', async () => { started.push('exa'); }),
      paced('tavily', async () => { started.push('tavily'); }),
    ]);
    expect(started.sort()).toEqual(['exa', 'tavily']);
  });
});
