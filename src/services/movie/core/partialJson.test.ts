import { describe, expect, it } from 'vitest';
import { completedItems, stringField } from './partialJson.ts';

const full = JSON.stringify({
  title: 'Colibríes',
  styleAnchor: 'warm "cartoon" palette',
  swipes: [
    { role: 'core', imagePrompt: 'a hummingbird {hovering}' },
    { role: 'why', imagePrompt: 'wings in a figure-eight' },
  ],
});

describe('completedItems', () => {
  it('returns only the swipes fully written so far, so no frame starts from half a prompt', () => {
    const cut = full.indexOf('wings') + 3; // mid second swipe
    const items = completedItems(full.slice(0, cut), 'swipes');
    expect(items).toHaveLength(1);
    expect(JSON.parse(items[0]).imagePrompt).toBe('a hummingbird {hovering}');
    expect(completedItems(full, 'swipes')).toHaveLength(2);
  });

  it('is empty before the array starts', () => {
    expect(completedItems(full.slice(0, 20), 'swipes')).toEqual([]);
  });
});

describe('stringField', () => {
  it('reads a field only once its closing quote has arrived (escaped quotes included)', () => {
    expect(stringField(full, 'styleAnchor')).toBe('warm "cartoon" palette');
    const cut = full.indexOf('palette');
    expect(stringField(full.slice(0, cut), 'styleAnchor')).toBeUndefined();
  });
});
