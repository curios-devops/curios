import { describe, it, expect } from 'vitest';
import { arcadeModel, arcadeTier, nextArcadeModel } from './arcadeService';
import { buildArcadeHtml, DEFAULT_PALETTE, safeLabels, safePalette, scriptSafe } from './arcadeRuntime';

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

describe('remake uses a stronger model', () => {
  // The player didn't like the game: the remake must not run on the same model again,
  // and there is nothing above Astra.
  it('moves Luna → Sol → Astra and stays on Astra', () => {
    expect(nextArcadeModel('luna', models)).toBe('sol');
    expect(nextArcadeModel('sol', models)).toBe('astra');
    expect(nextArcadeModel('astra', models)).toBe('astra');
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
  // Button labels come from the model and are shown on the controls: text only, short.
  it('keeps button labels short and plain', () => {
    expect(safeLabels({ a: 'dispara<img src=x>', b: '' })).toEqual({ a: 'DISPARAI', b: '' });
    expect(safeLabels({ a: 'saltar', b: 'golpe' })).toEqual({ a: 'SALTAR', b: 'GOLPE' });
    expect(safeLabels(null)).toEqual({ a: 'A', b: 'B' });
  });
});

describe('style categories follow the game genres', async () => {
  const { relevantCategories, lookOf } = await import('./arcadeStyles');
  const ids = (genres: string[]) => relevantCategories(genres).map((c) => c.id);
  // The choice must keep the inspiration's spirit: a DOOM-like shooter is offered arcade,
  // sci-fi or horror moods — never cozy farming or party minigames.
  it('a shooter gets action moods, not cozy ones', () => {
    expect(ids(['Action', 'Shooter'])).toEqual(['retro_arcade', 'cyberpunk', 'scifi']);
    expect(ids(['Action', 'Shooter'])).not.toContain('cozy');
  });
  it('a farming sim gets cozy first', () => {
    expect(ids(['Simulation', 'RPG', 'Indie'])[0]).toBe('fantasy');
    expect(ids(['Simulation', 'Casual'])[0]).toBe('cozy');
  });
  it('unknown genres still offer two styles', () => {
    expect(ids(['Indie'])).toEqual(['retro_arcade', 'cyberpunk']);
  });
  it('old rows keep their look', () => {
    expect(lookOf('cyberpunk')).toBe('cyberpunk');
    expect(lookOf('scifi')).toBe('cyberpunk');
    expect(lookOf('retro')).toBe('retro');
    expect(lookOf('cozy')).toBe('retro');
  });
});

describe('"Made with AI" relevance', async () => {
  const { sortCatalog } = await import('./arcadeService');
  const now = Date.parse('2026-10-11T12:00:00Z');
  const game = (id: string, votesUp: number, plays: number, daysAgo: number) => ({
    id, title: id, inspiredBy: '', palette: [], style: 'retro_arcade', mode: '2d' as const, genres: [],
    votesUp, plays, creatorId: null, creatorName: null, createdAt: new Date(now - daysAgo * 86_400_000).toISOString(),
  });
  // A vote is a stronger signal than a play, and a fresh game should surface over an old one
  // with the same numbers — otherwise new creations never get seen.
  it('weighs votes over plays and favors fresh games', () => {
    const ids = (sort: 'relevance' | 'popular' | 'new' | 'top_rated') =>
      sortCatalog([game('played', 0, 5, 1), game('voted', 3, 0, 1), game('old', 3, 0, 30)], sort, now).map((g) => g.id);
    expect(ids('relevance')).toEqual(['voted', 'played', 'old']);
    expect(ids('popular')[0]).toBe('played');
    expect(ids('new')[2]).toBe('old');
    expect(ids('top_rated').slice(0, 2)).toEqual(['voted', 'old']);
  });
});
