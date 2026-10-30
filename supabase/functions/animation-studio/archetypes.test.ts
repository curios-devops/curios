import { describe, expect, it } from 'vitest';
import { ARCHETYPES, direct, stageOf } from './archetypes.ts';
import { stageDocument } from '../../../src/services/movie/animation/stage.ts';

describe('direct', () => {
  it('keeps a clear pick even when it was just used (variety never beats a clear fit)', () => {
    const d = direct({ archetype: 'geometric', alt: 'editorial', confidence: 90 }, ['geometric', 'geometric', 'flat'], 'k');
    expect(d.archetype).toBe('geometric');
    expect(d.varied).toBe(false);
  });

  it('switches to the alternative when an unclear pick filled 2 of the last 3 stories', () => {
    const d = direct({ archetype: 'flat', alt: 'isometric', confidence: 65 }, ['flat', 'paper', 'flat'], 'k');
    expect(d.archetype).toBe('isometric');
    expect(d.varied).toBe(true);
  });

  it('respects a look the viewer asked for (Luna gives it confidence 100)', () => {
    const d = direct({ archetype: 'paper', alt: 'flat', confidence: 100 }, ['paper', 'paper', 'paper'], 'k');
    expect(d.archetype).toBe('paper');
  });

  it('falls back to flat when Luna answers nothing usable, instead of failing the animation', () => {
    expect(direct({}, [], 'k').archetype).toBe('flat');
    expect(direct({ archetype: 'kurzgesagt', alt: 'nope' }, [], 'k').archetype).toBe('flat');
  });

  it('gives the same question the same look every time (deterministic palette)', () => {
    const a = direct({ archetype: 'editorial', confidence: 80 }, [], '¿por qué nos cuesta concentrarnos?');
    const b = direct({ archetype: 'editorial', confidence: 80 }, ['flat'], '¿por qué nos cuesta concentrarnos?');
    expect(a.style).toBe(b.style);
  });

  it('spreads different questions over an archetype\'s palettes', () => {
    const styles = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((k) => direct({ archetype: 'flat', confidence: 90 }, [], k).style));
    expect(styles.size).toBe(ARCHETYPES.flat.palettes.length);
  });
});

describe('art direction', () => {
  it('the stage colours come from the stored style alone, so the app theme cannot change an animation', () => {
    const stage = stageOf('editorial:0')!;
    expect(stage).toEqual(stageOf('editorial:0'));
    expect(stageDocument('<html><head></head><body></body></html>', stage)).toContain(`--ground:${stage.ground}`);
  });

  it('older styles and machines bring no colours of their own', () => {
    expect(stageOf('kurzgesagt')).toBeNull();
    expect(stageOf('3d')).toBeNull();
    expect(stageOf(null)).toBeNull();
  });

  it('archetypes do not all end up on the same dark night: light and dark grounds, and different accents', () => {
    const palettes = Object.values(ARCHETYPES).flatMap((a) => a.palettes);
    const ids = Object.keys(ARCHETYPES).flatMap((id) => ARCHETYPES[id].palettes.map((_, i) => stageOf(`${id}:${i}`)!));
    expect(ids.filter((s) => !s.dark).length).toBeGreaterThanOrEqual(palettes.length / 2);
    expect(new Set(palettes.map((p) => p.accent)).size).toBeGreaterThanOrEqual(10);
  });

  it('every story archetype offers two palettes, except the real-colours news look', () => {
    for (const [id, a] of Object.entries(ARCHETYPES)) expect(a.palettes.length).toBe(id === 'real' ? 1 : 2);
  });
});
