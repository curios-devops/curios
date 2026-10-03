import { describe, it, expect, vi } from 'vitest';

// HomeDiscovery pulls in the Supabase-backed feed service; only the pure layout
// helper is under test here.
vi.mock('../nodePersistenceService', () => ({ listFeed: vi.fn() }));

import { buildMosaicBlocks } from './HomeDiscovery';
import { plainSnippet } from './MosaicCard';

const ASPECT_H = { vertical: 3 / 2, square: 1, landscape: 9 / 16 }; // height per unit width

describe('buildMosaicBlocks', () => {
  it('lays out V,S | S,V then a landscape, and repeats', () => {
    const blocks = buildMosaicBlocks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].left.map((c) => [c.item, c.shape])).toEqual([[1, 'vertical'], [3, 'square']]);
    expect(blocks[0].right.map((c) => [c.item, c.shape])).toEqual([[2, 'square'], [4, 'vertical']]);
    expect(blocks[0].wide).toBe(5);
    expect(blocks[1].wide).toBe(10);
  });

  it('keeps both columns the same height in every full block', () => {
    // Why: the whole point of the alternating pattern is that the landscape row
    // starts level under both columns. Equal widths → heights are sums of aspects.
    for (const block of buildMosaicBlocks(['a', 'b', 'c', 'd', 'e'])) {
      const h = (col: typeof block.left) => col.reduce((s, c) => s + ASPECT_H[c.shape], 0);
      expect(h(block.left)).toBeCloseTo(h(block.right));
    }
  });

  it('handles a short feed without crashing', () => {
    const [b] = buildMosaicBlocks(['only']);
    expect(b.left).toHaveLength(1);
    expect(b.right).toHaveLength(0);
    expect(b.wide).toBeNull();
  });
});

describe('plainSnippet', () => {
  it('drops raw markdown that leaked into feed summaries', () => {
    expect(plainSnippet('**🧠 AI Solves Navier–Stokes?** Facts and [Controversy](https://x.y)')).toBe(
      '🧠 AI Solves Navier–Stokes? Facts and Controversy',
    );
  });
});
