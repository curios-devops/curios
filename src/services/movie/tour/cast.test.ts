import { describe, expect, it } from 'vitest';
import { castVoices, validateCast } from './tourPlan.ts';
import { VOICES } from '../../character/voices.ts';

const person = (name: string, extra: Record<string, unknown> = {}) => ({ name, look: 'an old baker in a flour-dusted apron', lines: ['¡Pan recién hecho!'], gender: 'male', ...extra });

describe('Immersion cast', () => {
  it('drops characters the world can\'t show or voice (no look, no lines) and repeated names', () => {
    const cast = validateCast({ characters: [person('Tomás'), person('tomás'), person('Ana', { look: '' }), person('Rita', { lines: [] }), person('Elías')] });
    expect(cast.map((c) => c.name)).toEqual(['Tomás', 'Elías']);
  });

  it('keeps at most 6 people per world', () => {
    expect(validateCast({ characters: Array.from({ length: 9 }, (_, i) => person(`P${i}`)) })).toHaveLength(6);
  });

  it('gives every character a voice of their own while voices of that gender are left', () => {
    const men = VOICES.filter((v) => v.gender === 'male').length;
    const voices = castVoices(Array.from({ length: men }, () => ({ gender: 'male' as const, age: 'old', vibe: 'wise' })));
    expect(new Set(voices).size).toBe(men);
    expect(voices.every((id) => VOICES.find((v) => v.id === id)?.gender === 'male')).toBe(true);
  });
});
