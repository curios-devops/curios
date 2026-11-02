import { describe, expect, it } from 'vitest';
import { sheetLayout } from './proof.ts';

describe('sheetLayout', () => {
  it('tags each pair of pictures with its beat, or the critic blames the wrong one', () => {
    const { at } = sheetLayout(12);
    expect([0, 1, 2, 3, 10, 11].map((i) => at(i).beat)).toEqual([1, 1, 2, 2, 6, 6]);
  });

  it('keeps every picture inside the sheet, with an odd number of pictures too', () => {
    const { h, at } = sheetLayout(13);
    expect(at(12).y + 270).toBeLessThanOrEqual(h);
  });
});
