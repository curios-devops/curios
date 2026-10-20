import { describe, expect, it } from 'vitest';
import { creditBars, creditTone, parseCreditsDisplay } from './creditsLook.ts';

describe('creditTone', () => {
  it('standard account (3 a day): green with 3 left, yellow with 2, red with the last one', () => {
    expect(creditTone('free', 3, 3)).toBe('full');
    expect(creditTone('free', 2, 3)).toBe('medium');
    expect(creditTone('free', 1, 3)).toBe('low');
    expect(creditTone('free', 0, 3)).toBe('empty');
  });

  it('guest: starts full and empties in one go', () => {
    expect(creditTone('guest', 1, 1)).toBe('full');
    expect(creditBars(1, 1)).toBe(5);
    expect(creditTone('guest', 0, 1)).toBe('empty');
    expect(creditBars(0, 1)).toBe(0);
  });

  it('pro (25 a day): by bars — yellow at 2 bars, red at the last bar', () => {
    expect(creditTone('pro', 25, 25)).toBe('full');
    expect(creditTone('pro', 11, 25)).toBe('full'); // 3 bars
    expect(creditTone('pro', 10, 25)).toBe('medium'); // 2 bars
    expect(creditTone('pro', 5, 25)).toBe('low'); // 1 bar
    expect(creditTone('pro', 1, 25)).toBe('low');
  });
});

describe('creditBars', () => {
  it('fills 5 bars by percentage and keeps one bar while any credit is left', () => {
    expect(creditBars(25, 25)).toBe(5);
    expect(creditBars(13, 25)).toBe(3);
    expect(creditBars(1, 25)).toBe(1);
    expect(creditBars(2, 3)).toBe(4);
  });
});

describe('parseCreditsDisplay', () => {
  it('keeps a valid saved choice and ignores junk (falls back to the default)', () => {
    expect(parseCreditsDisplay('{"on":false,"look":"ring","style":"analog"}')).toEqual({ on: false, look: 'ring', style: 'analog' });
    const junk = parseCreditsDisplay('{"look":"pie","style":7}');
    expect(['battery', 'gauge']).toContain(junk.look);
    expect(junk.style).toBe('digital');
    expect(parseCreditsDisplay('not json').style).toBe('digital');
  });
});
