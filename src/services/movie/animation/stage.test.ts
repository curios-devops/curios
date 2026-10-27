import { describe, expect, it } from 'vitest';
import { readManifest, stageDocument, type StageTheme } from './stage.ts';

const page = (manifest: unknown, rest = '<script>curios.ready()</script>') =>
  `<!doctype html><html><head><title>x</title></head><body><script type="application/json" id="manifest">${JSON.stringify(manifest)}</script>${rest}</body></html>`;
const beats = [{ label: 'Calentar', say: 'El agua se calienta.' }, { label: 'Hervir', say: 'A 100 °C hierve.' }];
const theme: StageTheme = { dark: true, ground: '#111111', surface: '#1A1A1A', ink: '#FFFFFF', muted: '#9CA3AF', accent: '#7C8CFF', font: 'system-ui' };

describe('Animation stage', () => {
  it('needs at least two steps to drive — a page without them is not shown', () => {
    expect(readManifest(page({ title: 'x', beats: [beats[0]] }))).toBeNull();
    expect(readManifest('<html><body>no manifest</body></html>')).toBeNull();
    expect(readManifest(page({ title: '¿Qué pasa cuando el agua hierve?', beats }))?.beats).toHaveLength(2);
  });

  it('only highlights a word that is really in the title (Curios paints it in the accent)', () => {
    expect(readManifest(page({ title: '¿Qué pasa cuando el agua hierve?', highlight: 'hierve', beats }))?.highlight).toBe('hierve');
    expect(readManifest(page({ title: '¿Qué pasa cuando el agua hierve?', highlight: 'vapor', beats }))?.highlight).toBe('');
  });

  it('drops controls the page could not honour (no range, bad id) so no slider moves nothing', () => {
    const m = readManifest(page({ title: 't', beats, controls: [
      { id: 'power', label: 'Potencia', min: 0, max: 2000, value: 1200 },
      { id: 'flat', label: 'Plano', min: 5, max: 5, value: 5 },
      { id: 'bad id!', label: 'x', min: 0, max: 1, value: 0 },
    ] }));
    expect(m?.controls.map((c) => c.id)).toEqual(['power']);
  });

  it("keeps a simulation's picker only with real options, and lets a simulation have no steps", () => {
    const m = readManifest(page({ title: 'Sistema solar', beats: [], controls: [
      { id: 'planet', label: 'Planeta', type: 'choice', value: 3, options: [{ value: 1, label: 'Mercurio' }, { value: 3, label: 'Tierra' }] },
      { id: 'lonely', label: 'Solo', type: 'choice', value: 1, options: [{ value: 1, label: 'Uno' }] },
      { id: 'orbits', label: 'Órbitas', type: 'toggle', value: true },
    ] }), 0);
    expect(m?.controls.map((c) => `${c.id}:${c.type}:${c.value}`)).toEqual(['planet:choice:3', 'orbits:toggle:1']);
    expect(readManifest(page({ title: 'x', beats: [] }))).toBeNull(); // an animation still needs steps
  });

  it('locks the stage down before any model code runs: CSP, theme and bridge come first in <head>', () => {
    const doc = stageDocument(page({ title: 't', beats }), theme);
    const head = doc.slice(doc.indexOf('<head>'), doc.indexOf('<title>'));
    expect(head).toContain("connect-src 'none'");
    expect(head).toContain('--ground:#111111');
    expect(head).toContain('window.curios');
  });

  it('keeps a hostile theme value from closing the bridge script', () => {
    const doc = stageDocument(page({ title: 't', beats }), { ...theme, font: '</script><script>alert(1)</script>' });
    expect(doc).not.toContain('</script><script>alert(1)');
  });
});
