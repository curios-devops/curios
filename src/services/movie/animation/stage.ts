// The stage of an Animation: the model's HTML page (art + motion only) shown in a sandboxed iframe.
// The page around it draws every control in Curios' design and talks to the stage through a small
// bridge (window.curios) injected here, before the model's code: beats, controls, speed, pause and
// reset go in; readouts, control values the stage moved, the surprise callout, beat ends and errors
// come out. For a saved video the stage also draws itself into one picture per frame (capture).
// The stage gets the theme as CSS
// variables, and a CSP that only lets it load its libraries (no other network).

export interface StageTheme { dark: boolean; ground: string; surface: string; ink: string; muted: string; accent: string; font: string }
export interface Beat { label: string; say: string }
export interface Readout { id: string; label: string; unit: string }
export type Control =
  | { type: 'range'; id: string; label: string; min: number; max: number; step: number; value: number; unit: string }
  | { type: 'choice'; id: string; label: string; value: number | string; options: { value: number | string; label: string }[] }
  | { type: 'toggle'; id: string; label: string; value: number };
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
  | { ev: 'controls'; values: Record<string, number | string> }
  | { ev: 'callout'; text: string }
  | { ev: 'error'; message: string }
  | { ev: 'frame'; bitmap: ImageBitmap };

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const id = (v: unknown) => { const s = str(v, 32); return /^[a-z_][\w-]*$/i.test(s) ? s : ''; };

/**
 * The manifest the model put first in <body>, kept to what Curios can show; null if unusable.
 * An animation needs at least two beats to play; a simulation's beats are optional suggestions.
 */
export function readManifest(html: string, minBeats = 2): Manifest | null {
  const m = html.match(/<script[^>]*id=["']manifest["'][^>]*>([\s\S]*?)<\/script>/i);
  let raw: Record<string, unknown> | null = null;
  try { raw = m ? JSON.parse(m[1]) : null; } catch { raw = null; }
  if (!raw) return null;
  const list = (v: unknown) => (Array.isArray(v) ? v : []) as Record<string, unknown>[];
  const beats = list(raw.beats).map((b) => ({ label: str(b?.label, 40), say: str(b?.say, 400) })).filter((b) => b.label && b.say).slice(0, 10);
  if (beats.length < minBeats) return null;
  const title = str(raw.title, 120);
  const highlight = str(raw.highlight, 40);
  return {
    title,
    highlight: highlight && title.toLowerCase().includes(highlight.toLowerCase()) ? highlight : '',
    bigIdea: str(raw.bigIdea, 240),
    related: list(raw.related).map((q) => str(q, 120)).filter(Boolean).slice(0, 4),
    beats,
    readouts: list(raw.readouts).map((r) => ({ id: id(r?.id), label: str(r?.label, 30), unit: str(r?.unit, 12) })).filter((r) => r.id && r.label).slice(0, 4),
    controls: list(raw.controls).flatMap((c): Control[] => {
      const cid = id(c?.id), label = str(c?.label, 30) || cid;
      if (!cid) return [];
      if (c.type === 'choice') {
        const options = list(c.options).flatMap((o) => {
          const v = typeof o?.value === 'number' || typeof o?.value === 'string' ? o.value : null;
          return v === null ? [] : [{ value: v, label: str(o.label, 24) || String(v) }];
        }).slice(0, 10);
        if (options.length < 2) return [];
        return [{ type: 'choice', id: cid, label, value: options.some((o) => o.value === c.value) ? (c.value as number | string) : options[0].value, options }];
      }
      if (c.type === 'toggle') return [{ type: 'toggle', id: cid, label, value: c.value ? 1 : 0 }];
      const value = num(c.value, NaN);
      if (!Number.isFinite(value)) return [];
      const min = Math.min(num(c.min, value), value), max = Math.max(num(c.max, value), value);
      if (max <= min) return [];
      return [{ type: 'range', id: cid, label, min, max, step: num(c.step, (max - min) / 100) || (max - min) / 100, value, unit: str(c.unit, 12) }];
    }).slice(0, 4),
  };
}

// Libraries the stage may load; nothing else leaves the frame (connect-src 'none').
const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; media-src data: blob:";

const BRIDGE = `(() => {
  const handlers = {};
  const post = (m, transfer) => parent.postMessage(Object.assign({ curios: 1 }, m), '*', transfer || []);
  // WebGL keeps its last frame so a recording can copy it.
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    return getContext.call(this, type, /webgl/.test(type) ? Object.assign({}, opts, { preserveDrawingBuffer: true }) : opts);
  };
  // One picture of the stage: its canvases as they are, its drawings (SVG) with the page's styles.
  const SVG = 'http://www.w3.org/2000/svg';
  async function picture(scale) {
    const w = innerWidth, h = innerHeight, out = document.createElement('canvas');
    out.width = Math.round(w * scale); out.height = Math.round(h * scale);
    const g = out.getContext('2d');
    g.scale(scale, scale);
    g.fillStyle = getComputedStyle(document.body).backgroundColor || window.curios.theme.ground;
    g.fillRect(0, 0, w, h);
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\\n');
    for (const el of document.querySelectorAll('canvas, svg')) {
      if (el.parentElement && el.parentElement.closest('svg')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (el.tagName === 'CANVAS') { g.drawImage(el, r.left, r.top, r.width, r.height); continue; }
      const copy = el.cloneNode(true);
      copy.setAttribute('xmlns', SVG); copy.setAttribute('width', r.width); copy.setAttribute('height', r.height);
      const style = document.createElementNS(SVG, 'style'); style.textContent = css; copy.insertBefore(style, copy.firstChild);
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }));
      const img = new Image(); img.src = url;
      try { await img.decode(); g.drawImage(img, r.left, r.top, r.width, r.height); } catch {}
      URL.revokeObjectURL(url);
    }
    return createImageBitmap(out);
  }
  let capturing = false;
  async function capture(scale) {
    while (capturing) {
      const start = performance.now();
      try { const bitmap = await picture(scale); post({ ev: 'frame', bitmap }, [bitmap]); } catch {}
      await new Promise((r) => setTimeout(r, Math.max(0, 40 - (performance.now() - start))));
    }
  }
  let last = 0, pending = null;
  window.curios = {
    theme: __THEME__,
    on: (name, fn) => { handlers[name] = fn; },
    readouts: (values) => {
      pending = values; const now = performance.now();
      if (now - last > 66) { last = now; post({ ev: 'readouts', values: pending }); pending = null; }
    },
    callout: (text) => post({ ev: 'callout', text: String(text).slice(0, 80) }),
    controls: (values) => post({ ev: 'controls', values }),
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
      else if (m.cmd === 'pause') handlers.pause && handlers.pause(Boolean(m.paused));
      else if (m.cmd === 'reset') handlers.reset && handlers.reset();
      else if (m.cmd === 'capture') { const was = capturing; capturing = Boolean(m.on); if (capturing && !was) capture(Number(m.scale) || 1); }
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
