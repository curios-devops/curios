// Curios Arcade fantasy console (WASM-4-like): the fixed, hand-written half of every
// AI-made game. The model only writes init()/update() against this API (see the
// arcade-generate edge function prompt), so the console — screen, palette, touch D-pad +
// A/B, 60 fps loop, PRESS A / GAME OVER screens — is tested once and always works.
// Runs in a sandboxed iframe (allow-scripts only): no storage, cookies or app access, so
// a game can't save anything — every run starts from zero, like an arcade cabinet.
//
// Messages to the parent: { arcade: 'ready' } after the smoke test, { arcade: 'error', message },
// { arcade: 'over', score } at each game over.

export const DEFAULT_PALETTE = ['#e0f8cf', '#86c06c', '#306850', '#071821'];

/** Four #rgb/#rrggbb colors, else the default palette. */
export function safePalette(palette: unknown): string[] {
  const ok = Array.isArray(palette) && palette.length === 4 && palette.every((c) => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c));
  return ok ? (palette as string[]) : DEFAULT_PALETTE;
}

/** Game code inside an inline <script>: a literal "</script" would end the tag early. */
export function scriptSafe(code: string): string {
  return code.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
}

const RUNTIME = String.raw`
var P = __PALETTE__, C = document.getElementById('c').getContext('2d');
var held = [0,0,0,0,0,0], prev = [0,0,0,0,0,0], t = 0, state = 'title', score = 0, overAt = 0, game = null;
function col(c){ return P[(((c|0)%4)+4)%4]; }
function cls(c){ C.fillStyle = col(c||0); C.fillRect(0,0,160,160); }
function rect(x,y,w,h,c){ C.fillStyle = col(c); C.fillRect(x|0,y|0,w|0,h|0); }
function rectb(x,y,w,h,c){ C.strokeStyle = col(c); C.lineWidth = 1; C.strokeRect((x|0)+.5,(y|0)+.5,(w|0)-1,(h|0)-1); }
function circ(x,y,r,c){ C.fillStyle = col(c); C.beginPath(); C.arc(x,y,Math.max(0,r),0,7); C.fill(); }
function line(a,b,x,y,c){ C.strokeStyle = col(c); C.lineWidth = 1; C.beginPath(); C.moveTo((a|0)+.5,(b|0)+.5); C.lineTo((x|0)+.5,(y|0)+.5); C.stroke(); }
function text(s,x,y,c){ C.fillStyle = col(c); C.font = 'bold 8px monospace'; C.textBaseline = 'top'; C.fillText(String(s),x|0,y|0); }
function btn(i){ return !!held[i]; }
function btnp(i){ return !!held[i] && !prev[i]; }
function rnd(n){ return Math.random()*(n===undefined?1:n); }
function over(s){ if (state === 'play' || state === 'smoke') { score = Math.max(0, Math.floor(+s||0)); state = state === 'smoke' ? 'smoke-over' : 'over'; } }
function post(m){ parent.postMessage(Object.assign({ arcade: true }, m), '*'); }
function fail(e){ state = 'error'; post({ type: 'error', message: String(e && e.message || e).slice(0, 300) }); cls(0); text('ERROR', 66, 76, 3); }
function center(s,y,c){ text(s, 80 - String(s).length*2.5, y, c); }
function box(lines){ rect(20,52,120,56,0); rectb(20,52,120,56,3); lines.forEach(function(l,i){ center(l, 62 + i*14, 3); }); }

// Smoke test: init + 600 frames with random input. Catches most runtime bugs before play.
function smoke(){
  game.init(); state = 'smoke';
  for (var f = 0; f < 600; f++) {
    for (var i = 0; i < 6; i++) held[i] = Math.random() < 0.3 ? 1 : 0;
    t = f; game.update(); prev = held.slice();
    if (state === 'smoke-over') { game.init(); state = 'smoke'; }
  }
  held = [0,0,0,0,0,0]; prev = held.slice(); t = 0; state = 'title';
}

function frame(){
  try {
    if (state === 'title') { cls(0); box(['', 'PRESS A', '']); if (btnp(4)) { game.init(); t = 0; state = 'play'; } }
    else if (state === 'play') { game.update(); t++; if (state === 'over') { overAt = t; post({ type: 'over', score: score }); } }
    else if (state === 'over') { box(['GAME OVER', 'SCORE ' + score, 'A: RETRY']); if (t - overAt > 30 && btnp(4)) { game.init(); state = 'play'; } t++; }
  } catch (e) { fail(e); }
  prev = held.slice();
}

// Fixed 60 updates per second whatever the screen refresh rate.
var last = 0, acc = 0;
function loop(now){
  if (state === 'error') return;
  acc += Math.min(100, now - (last || now)); last = now;
  while (acc >= 1000/60) { frame(); acc -= 1000/60; }
  requestAnimationFrame(loop);
}

var KEYS = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3, z: 4, Z: 4, ' ': 4, Enter: 4, x: 5, X: 5 };
addEventListener('keydown', function(e){ if (e.key in KEYS) { held[KEYS[e.key]] = 1; e.preventDefault(); } });
addEventListener('keyup', function(e){ if (e.key in KEYS) held[KEYS[e.key]] = 0; });
document.querySelectorAll('[data-b]').forEach(function(el){
  var b = +el.getAttribute('data-b');
  function on(e){ held[b] = 1; el.classList.add('on'); e.preventDefault(); }
  function off(){ held[b] = 0; el.classList.remove('on'); }
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
});
`;

/** Self-contained page for <iframe sandbox="allow-scripts" srcdoc=…>. */
export function buildArcadeHtml(code: string, palette: unknown): string {
  const runtime = RUNTIME.replace('__PALETTE__', JSON.stringify(safePalette(palette)));
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#w{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
canvas{width:min(100vw,58vh);height:min(100vw,58vh);image-rendering:pixelated}
#pad{width:min(100vw,58vh);display:flex;justify-content:space-between;align-items:center;padding:0 16px;box-sizing:border-box}
.d{display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(3,52px)}
button{background:#2a2a2a;color:#ccc;border:0;border-radius:12px;font:700 18px system-ui;touch-action:none;-webkit-tap-highlight-color:transparent}
button.on{background:#555}
.ab{display:flex;gap:14px;align-items:center}.ab button{width:62px;height:62px;border-radius:50%}
</style></head><body><div id="w"><canvas id="c" width="160" height="160"></canvas>
<div id="pad"><div class="d"><span></span><button data-b="2">▲</button><span></span><button data-b="0">◀</button><span></span><button data-b="1">▶</button><span></span><button data-b="3">▼</button><span></span></div>
<div class="ab"><button data-b="5">B</button><button data-b="4">A</button></div></div></div>
<script>${runtime}</script>
<script>
try {
  game = (function(){
${scriptSafe(code)}
;return { init: init, update: update };
  })();
  smoke(); post({ type: 'ready' }); requestAnimationFrame(loop);
} catch (e) { fail(e); }
</script></body></html>`;
}
