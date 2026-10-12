// The song's animation runs like an arcade game: model-written canvas code inside a sandboxed
// srcdoc iframe (scripts only, no network). The player posts the music's state every frame
// ({ t, a: { level, bass, high, beat, section, line, progress } }); the code draws with it.
// Any error (or no draw()) → the page swaps in the built-in visualizer below.
import { scriptSafe } from '../../games/arcade/arcadeRuntime.ts';

/** Bars that breathe with the music — used when a song's own animation fails. */
export const DEFAULT_ANIMATION = `function setup() {}
function draw(t, a) {
  ctx.fillStyle = P[0]; ctx.fillRect(0, 0, W, H);
  const n = 40, bw = W / n, peak = a.section === 'chorus' ? 0.75 : 0.55;
  for (let i = 0; i < n; i++) {
    const h = H * peak * (0.12 + a.level * 0.88) * (0.55 + 0.45 * Math.sin(t * 2.4 + i * 0.5));
    ctx.fillStyle = P[1 + (i % 4)];
    ctx.globalAlpha = a.beat ? 1 : 0.8;
    ctx.fillRect(i * bw + 1, (H - h) / 2, bw - 2, h);
  }
  ctx.globalAlpha = 1;
}`;

export const FALLBACK_PALETTE = ['#0b1020', '#7c5cff', '#22d3ee', '#f472b6', '#facc15'];
const safeColor = (c: unknown) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : null);

export function buildAnimationHtml(code: string, palette: string[]): string {
  const colors = palette.map(safeColor).filter(Boolean);
  const P = colors.length === 5 ? colors : FALLBACK_PALETTE;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
<style>html,body{margin:0;height:100%;overflow:hidden;background:${P[0]}}canvas{display:block;width:100%;height:100%}</style>
</head><body><canvas id="c"></canvas>
<script>
const C = document.getElementById('c'), ctx = C.getContext('2d');
let W = 0, H = 0;
const P = ${JSON.stringify(P)};
function fit() { const r = Math.min(window.devicePixelRatio || 1, 2); W = C.clientWidth; H = C.clientHeight; C.width = W * r; C.height = H * r; ctx.setTransform(r, 0, 0, r, 0, 0); }
fit(); addEventListener('resize', fit);
let a = { level: 0, bass: 0, high: 0, beat: false, section: 'intro', line: '', progress: 0 }, T = 0;
addEventListener('message', (e) => { const d = e.data; if (d && d.type === 'frame') { a = d.a; T = d.t; } });
</script>
<script>${scriptSafe(code)}
;(function () {
  const fail = (err) => parent.postMessage({ type: 'error', message: String(err) }, '*');
  if (typeof draw !== 'function') { fail('no draw()'); return; }
  try { if (typeof setup === 'function') setup(); } catch (err) { fail(err); return; }
  parent.postMessage({ type: 'ready' }, '*');
  (function loop() { try { draw(T, a); } catch (err) { fail(err); return; } requestAnimationFrame(loop); })();
})();
</script></body></html>`;
}
