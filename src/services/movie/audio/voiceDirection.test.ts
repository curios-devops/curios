import { describe, expect, it } from 'vitest';
import { BASE_LEVEL, captionText, cleanDelivery, levelOf } from './voiceDirection.ts';

describe('cleanDelivery', () => {
  it('keeps combined tags made of known words ([warm, conversational], [nervous, fearful])', () => {
    expect(cleanDelivery('[Warm, Conversational] Hola. [nervous, fearful] Un ruido...')).toBe('[warm, conversational] Hola. [nervous, fearful] Un ruido...');
  });

  it('drops a tag with any unknown word — ElevenLabs could play it as a sound effect', () => {
    expect(cleanDelivery('[explosion] Boom. [warm, thunder] Calma.')).toBe('Boom. Calma.');
  });
});

describe('levelOf', () => {
  it('turns our [louder]/[quieter] into a small gain change and never sends them to ElevenLabs', () => {
    expect(levelOf('[louder] [excited] ¡Está vivo!')).toEqual({ text: '[excited] ¡Está vivo!', gain: 1 });
    const quiet = levelOf('[quieter] Casi nada.');
    expect(quiet.gain).toBeLessThan(BASE_LEVEL);
    expect(quiet.text).toBe('Casi nada.');
    expect(levelOf('Normal.').gain).toBe(BASE_LEVEL);
  });

  it('leaves headroom: a louder line never goes past full scale', () => {
    expect(levelOf('[louder] x').gain).toBeLessThanOrEqual(1);
  });
});

describe('captionText', () => {
  it('shows the words only', () => {
    expect(captionText('[short pause] [curious] ¿Cómo flota? [louder] ¡Así!')).toBe('¿Cómo flota? ¡Así!');
  });
});
