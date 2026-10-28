import { describe, expect, it } from 'vitest';
import { captionLines, lineAt } from './captions.ts';

const say = 'If that link fails, the train cannot simply assume the route ahead is safe. Protective braking and specific failure procedures matter, depending on the equipment and situation.';

describe('captionLines', () => {
  // The caption must stay one line on a phone instead of covering the stage.
  it('cuts a beat into lines that fit one phone line, losing no word', () => {
    const lines = captionLines(say);
    expect(lines.length).toBeGreaterThan(2);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(42);
    expect(lines.join(' ')).toBe(say);
  });

  it('ends a line at the end of a sentence so a line never mixes two sentences when it can avoid it', () => {
    expect(captionLines(say).some((l) => l.endsWith('safe.'))).toBe(true);
  });
});

describe('lineAt', () => {
  const lines = ['aaaa', 'bbbb', 'cccc', 'dddd'];
  // The line follows the voice: nothing said → first line, half said → the middle, all said → the last.
  it('follows how much of the beat has been said', () => {
    expect(lineAt(lines, 0)).toBe(0);
    expect(lineAt(lines, 0.6)).toBe(2);
    expect(lineAt(lines, 1)).toBe(3);
  });
});
