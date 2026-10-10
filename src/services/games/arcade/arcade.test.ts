import { describe, it, expect } from 'vitest';
import { arcadeModel, arcadeTier } from './arcadeService';
import { buildArcadeHtml, DEFAULT_PALETTE, safePalette, scriptSafe } from './arcadeRuntime';

const models = { luna: 'luna', sol: 'sol', astra: 'astra', router: true } as never;

describe('arcade model by perceived difficulty', () => {
  // Deep systems (strategy, RPG) are hard to squeeze into one screen → the strongest model;
  // purely simple genres don't need it and must stay on the cheapest one.
  it('uses Astra when any genre is complex', () => {
    expect(arcadeTier(['Action', 'RPG'])).toBe('complex');
    expect(arcadeModel(['Strategy'], models)).toBe('astra');
  });
  it('uses Luna only when every genre is simple', () => {
    expect(arcadeModel(['Puzzle', 'Arcade'], models)).toBe('luna');
    expect(arcadeModel(['Puzzle', 'Shooter'], models)).toBe('sol');
  });
  it('defaults to Sol (unknown or missing genres)', () => {
    expect(arcadeModel([], models)).toBe('sol');
    expect(arcadeModel(['Action', 'Shooter'], models)).toBe('sol');
  });
});

describe('arcade console page', () => {
  // Model-written code goes inside an inline <script>; "</script>" in it would end the tag
  // and the rest of the code would render as page text.
  it('escapes a closing script tag in game code', () => {
    const html = buildArcadeHtml('function init(){} function update(){ text("</script>",0,0,1) }', DEFAULT_PALETTE);
    expect(html).not.toContain('text("</script>"');
    expect(scriptSafe('a</SCRIPT>b')).toBe('a<\\/SCRIPT>b');
  });
  // The palette is injected into the page as code: only plain hex colors may get through.
  it('only accepts four hex colors as palette', () => {
    expect(safePalette(['#000', '#111111', '#abc', '#fff'])).toEqual(['#000', '#111111', '#abc', '#fff']);
    expect(safePalette(['red', '#000', '#000', '#000'])).toEqual(DEFAULT_PALETTE);
    expect(safePalette(['#000', '#000', '#000', '#000"];alert(1);//'])).toEqual(DEFAULT_PALETTE);
    expect(safePalette(undefined)).toEqual(DEFAULT_PALETTE);
  });
});
