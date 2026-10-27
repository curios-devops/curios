// The stage of an Animation: the model's HTML page (art + motion only) shown in a sandboxed iframe.
// The page around it draws every control in Curios' design and talks to the stage through a small
// bridge (window.curios) injected here, before the model's code: beats, controls, speed and reset go
// in; readouts, the surprise callout, beat ends and errors come out. The stage gets the theme as CSS
// variables, and a CSP that only lets it load its libraries (no other network).

export interface StageTheme { dark: boolean; ground: string; surface: string; ink: string; muted: string; accent: string; font: string }
export interface Beat { label: string; say: string }
export interface Readout { id: string; label: string; unit: string }
export interface Control { id: string; label: string; min: number; max: number; step: number; value: number; unit: string }
export interface Manifest {
  title: string;
  highlight: string;
  bigIdea: string;
  related: string[];
  beats: Beat[];
  readouts: Readout[];
  controls: Control[];
}

export type StageEvent =
  | { ev: 'ready' }
  | { ev: 'done'; i: number }
  | { ev: 'readouts'; values: Record<string, number> }
  | { ev: 'callout'; text: string }
  | { ev: 'error'; message: string };

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const id = (v: unknown) => { const s = str(v, 32); return /^[a-z_][\w-]*$/i.test(s) ? s : ''; };

/** The manifest the model put first in <body>, kept to what Curios can show; null if unusable. */
export function readManifest(html: string): Manifest | null {
  const m = html.match(/<script[^>]*id=["']manifest["'][^>]*>([\s\S]*?)<\/script>/i);
  let raw: Record<string, unknown> | null = null;
  try { raw = m ? JSON.parse(m[1]) : null; } catch { raw = null; }
  if (!raw) return null;
  const list = (v: unknown) => (Array.isArray(v) ? v : []) as Record<string, unknown>[];
  const beats = list(raw.beats).map((b) => ({ label: str(b?.label, 40), say: str(b?.say, 400) })).filter((b) => b.label && b.say).slice(0, 10);
  if (beats.length < 2) return null;
  const title = str(raw.title, 120);
  const highlight = str(raw.highlight, 40);
  return {
    title,
    highlight: highlight && title.toLowerCase().includes(highlight.toLowerCase()) ? highlight : '',
    bigIdea: str(raw.bigIdea, 240),
    related: list(raw.related).map((q) => str(q, 120)).filter(Boolean).slice(0, 4),
    beats,
    readouts: list(raw.readouts).map((r) => ({ id: id(r?.id), label: str(r?.label, 30), unit: str(r?.unit, 12) })).filter((r) => r.id && r.label).slice(0, 4),
    controls: list(raw.controls).flatMap((c) => {
      const cid = id(c?.id), value = num(c?.value, NaN);
      if (!cid || !Number.isFinite(value)) return [];
      const min = Math.min(num(c.min, value), value), max = Math.max(num(c.max, value), value);
      if (max <= min) return [];
      return [{ id: cid, label: str(c.label, 30) || cid, min, max, step: num(c.step, (max - min) / 100) || (max - min) / 100, value, unit: str(c.unit, 12) }];
    }).slice(0, 2),
  };
}

// Libraries the stage may load; nothing else leaves the frame (connect-src 'none').
const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; media-src data: blob:";

const BRIDGE = `(() => {
  const handlers = {};
  const post = (m) => parent.postMessage(Object.assign({ curios: 1 }, m), '*');
  let last = 0, pending = null;
  window.curios = {
    theme: __THEME__,
    on: (name, fn) => { handlers[name] = fn; },
    readouts: (values) => {
      pending = values; const now = performance.now();
      if (now - last > 66) { last = now; post({ ev: 'readouts', values: pending }); pending = null; }
    },
    callout: (text) => post({ ev: 'callout', text: String(text).slice(0, 80) }),
    ready: () => post({ ev: 'ready' }),
  };
  setInterval(() => { if (pending) { post({ ev: 'readouts', values: pending }); pending = null; } }, 120);
  addEventListener('message', async (e) => {
    const m = e.data || {};
    if (!m.curios || e.source !== parent) return;
    try {
      if (m.cmd === 'beat') { await (handlers.beat && handlers.beat(m.i)); post({ ev: 'done', i: m.i }); }
      else if (m.cmd === 'set') handlers.set && handlers.set(m.id, m.value);
      else if (m.cmd === 'speed') handlers.speed && handlers.speed(m.x);
      else if (m.cmd === 'reset') handlers.reset && handlers.reset();
    } catch (err) { post({ ev: 'error', message: String(err && err.message || err) }); }
  });
  addEventListener('error', (e) => post({ ev: 'error', message: String(e.message) }));
})();`;

/** The model's page, ready for an iframe srcdoc: CSP, theme and bridge first in <head>. */
export function stageDocument(html: string, theme: StageTheme): string {
  const vars = `:root{--ground:${theme.ground};--surface:${theme.surface};--ink:${theme.ink};--muted:${theme.muted};--accent:${theme.accent};--font:${theme.font}}html,body{margin:0;background:var(--ground)}`;
  // JSON in a <script>: "<" escaped so a value can't close the tag.
  const head = `<meta http-equiv="Content-Security-Policy" content="${CSP}"><style>${vars.replace(/</g, '')}</style><script>${BRIDGE.replace('__THEME__', () => JSON.stringify(theme).replace(/</g, '\\u003c'))}</script>`;
  const page = /<html[\s>]/i.test(html) ? html : `<!doctype html><html><head></head><body>${html}</body></html>`;
  return /<head[^>]*>/i.test(page) ? page.replace(/<head[^>]*>/i, (h) => `${h}${head}`) : page.replace(/<html[^>]*>/i, (h) => `${h}<head>${head}</head>`);
}

/** The theme as the page shows it now (CSS variables resolved), for the stage. */
export function currentTheme(): StageTheme {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const dark = document.documentElement.classList.contains('dark');
  return {
    dark,
    ground: v('--ui-bg-primary', dark ? '#111111' : '#F9F6F4'),
    surface: v('--ui-bg-elevated', dark ? '#1A1A1A' : '#FFFFFF'),
    ink: v('--ui-text-primary', dark ? '#FFFFFF' : '#0A0A0A'),
    muted: v('--ui-text-secondary', dark ? '#9CA3AF' : '#6B7280'),
    accent: v('--accent-primary', '#2563EB'),
    font: v('--font-ui', 'system-ui, sans-serif'),
  };
}
