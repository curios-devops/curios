// Curios Arcade fantasy console (WASM-4-like): the fixed, hand-written half of every
// AI-made game. The model only writes init()/update() against this API (see the
// arcade-generate edge function prompt), so the console — screen, palette, touch D-pad +
// A/B, 60 fps loop, PRESS A / GAME OVER screens — is tested once and always works.
// Runs in a sandboxed iframe (allow-scripts only): no storage, cookies or app access, so
// a game can't save anything — every run starts from zero, like an arcade cabinet.
//
// Messages to the parent: { arcade: 'ready' } after the smoke test, { arcade: 'error', message },
// { arcade: 'start' } when a run starts from the title, { arcade: 'over', score } at each game over. From the parent: { arcadeCmd: 'restart' }.

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
var W = __RES__, HALF = W/2, UI = W/160, P = __PALETTE__, LABELS = __LABELS__, C = document.getElementById('c').getContext('2d');
var held = [0,0,0,0,0,0], prev = [0,0,0,0,0,0], t = 0, state = 'title', score = 0, overAt = 0, game = null;
function col(c){ return P[(((c|0)%4)+4)%4]; }
function cls(c){ C.fillStyle = col(c||0); C.fillRect(0,0,W,W); }
function rect(x,y,w,h,c){ C.fillStyle = col(c); C.fillRect(x|0,y|0,w|0,h|0); }
function rectb(x,y,w,h,c){ C.strokeStyle = col(c); C.lineWidth = 1; C.strokeRect((x|0)+.5,(y|0)+.5,(w|0)-1,(h|0)-1); }
function circ(x,y,r,c){ C.fillStyle = col(c); C.beginPath(); C.arc(x,y,Math.max(0,r),0,7); C.fill(); }
function line(a,b,x,y,c){ C.strokeStyle = col(c); C.lineWidth = 1; C.beginPath(); C.moveTo((a|0)+.5,(b|0)+.5); C.lineTo((x|0)+.5,(y|0)+.5); C.stroke(); }
var FONT = {A:11245,B:27566,C:14627,D:27502,E:31143,F:31140,G:14699,H:23533,I:29847,J:4714,K:23469,L:18727,M:24557,N:27501,O:11114,P:27556,Q:11123,R:27565,S:14478,T:29842,U:23407,V:23402,W:23549,X:23213,Y:23186,Z:29351,0:31599,1:11415,2:25255,3:25230,4:23497,5:31118,6:14831,7:29330,8:31727,9:31694,'.':2,',':20,':':1040,'!':9346,'?':25218,'-':448,'+':1488,'/':4772,"'":9216,'(':5265,')':17556,'%':21157,'=':3640,'*':2728,'<':5393,'>':17492,'#':24445,'_':7,'"':23040};
// Pixel text (3x5 glyphs, 4px per char at scale 1): crisp blocks, Minecraft-like. Accents dropped.
function text(s,x,y,c,k){
  k = k || 1; C.fillStyle = col(c);
  var str = String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  for (var i = 0; i < str.length; i++) {
    var g = FONT[str[i]];
    if (g) for (var b = 0; b < 15; b++) if (g >> (14 - b) & 1) C.fillRect((x|0) + (i*4 + b%3)*k, (y|0) + ((b/3)|0)*k, k, k);
  }
}
function textw(s,k){ return String(s).length*4*(k||1) - (k||1); }

// 3D (raycaster, Wolfenstein/DOOM-like). map: array of strings, '.' = floor, '1'-'3' = wall color.
var ZB = new Float32Array(W), CAM = { x: 0, y: 0, a: 0, f: 1.05 }, IMG = C.createImageData(W, W), PIX = new Uint32Array(IMG.data.buffer), RGB = [];
function rgba(c){ var h = col(c).slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return (255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16); }
function wall(map,x,y){ var row = map[Math.floor(y)]; var ch = row && row[Math.floor(x)]; return ch === undefined || (ch !== '.' && ch !== ' '); }
function view3d(map,px,py,a){
  CAM.x = px; CAM.y = py; CAM.a = a;
  for (var i = 0; i < 4; i++) RGB[i] = rgba(i);
  for (var x = 0; x < W; x++) {
    var ra = a + (x/W - 0.5)*CAM.f, dx = Math.cos(ra), dy = Math.sin(ra);
    var mx = Math.floor(px), my = Math.floor(py), ddx = Math.abs(1/dx), ddy = Math.abs(1/dy);
    var sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
    var sdx = (dx < 0 ? px - mx : mx + 1 - px)*ddx, sdy = (dy < 0 ? py - my : my + 1 - py)*ddy, side = 0, ch = '3';
    for (var n = 0; n < 64; n++) {
      if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; }
      var row = map[my]; ch = row ? row[mx] : undefined;
      if (ch === undefined) { ch = '3'; break; }
      if (ch !== '.' && ch !== ' ') break;
    }
    var d = (side === 0 ? sdx - ddx : sdy - ddy)*Math.cos(ra - a); ZB[x] = d;
    var h = Math.min(W, W/Math.max(d, 0.01)), top = (HALF - h/2)|0, bot = (HALF + h/2)|0;
    var wc = RGB[/[1-3]/.test(ch) ? +ch : 2], shade = side === 1 || d > 7;
    for (var y = 0; y < W; y++) {
      var v = y < top ? RGB[0] : y >= bot ? RGB[1] : (shade && ((x + y) & 1) ? RGB[0] : wc);
      PIX[y*W + x] = v;
    }
  }
  C.putImageData(IMG, 0, 0);
}
// Billboard standing on the floor at (x,y), hidden behind walls. Returns its screen box or null.
function sprite3d(sx,sy,c,s){
  s = s || 0.5;
  var dx = sx - CAM.x, dy = sy - CAM.y, d = Math.sqrt(dx*dx + dy*dy); if (d < 0.2) return null;
  var ang = Math.atan2(dy, dx) - CAM.a; while (ang > Math.PI) ang -= 2*Math.PI; while (ang < -Math.PI) ang += 2*Math.PI;
  if (Math.abs(ang) > CAM.f/2 + 0.3) return null;
  var pd = d*Math.cos(ang), h = Math.min(2*W, W*s/pd), w = h, cx = (ang/CAM.f + 0.5)*W;
  var x0 = Math.round(cx - w/2), y0 = Math.round(HALF + HALF/pd - h), shown = false;
  C.fillStyle = col(c);
  for (var x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) if (pd < ZB[x]) { C.fillRect(x, y0, 1, Math.ceil(h)); shown = true; }
  return shown ? { x: x0, y: y0, w: Math.round(w), h: Math.round(h), d: pd } : null;
}
function btn(i){ return !!held[i]; }
function btnp(i){ return !!held[i] && !prev[i]; }
function rnd(n){ return Math.random()*(n===undefined?1:n); }
function over(s){ if (state === 'play' || state === 'smoke') { score = Math.max(0, Math.floor(+s||0)); state = state === 'smoke' ? 'smoke-over' : 'over'; } }
function post(m){ parent.postMessage(Object.assign({ arcade: true }, m), '*'); }
function fail(e){ state = 'error'; post({ type: 'error', message: String(e && e.message || e).slice(0, 300) }); cls(0); center('ERROR', HALF - 4*UI, 3, 2); }
// The console's own screens (PRESS A, GAME OVER) scale with the resolution.
function center(s,y,c,k){ k = Math.max(1, Math.round((k||1)*UI)); text(s, HALF - textw(s,k)/2, y, c, k); }
function box(lines){ var u = UI; rect(16*u,50*u,128*u,60*u,0); rectb(16*u,50*u,128*u,60*u,3); rectb(18*u,52*u,124*u,56*u,2); lines.forEach(function(l,i){ center(l, (58 + i*16)*u, 3, i === 0 ? 2 : 1); }); }

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
    if (state === 'title') { cls(0); box(['PRESS ' + LABELS.a, '', '']); if (btnp(4)) { game.init(); t = 0; state = 'play'; post({ type: 'start' }); } }
    else if (state === 'play') { game.update(); t++; if (state === 'over') { overAt = t; post({ type: 'over', score: score }); } }
    else if (state === 'over') { box(['GAME OVER', 'SCORE ' + score, LABELS.a + ': RETRY']); if (t - overAt > 30 && btnp(4)) { game.init(); state = 'play'; } t++; }
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

// The page's "Play again" button: restart right away from the GAME OVER screen.
addEventListener('message', function(e){ if (e.data && e.data.arcadeCmd === 'restart' && state === 'over') { game.init(); t = 0; state = 'play'; } });
var KEYS = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3, z: 4, Z: 4, ' ': 4, Enter: 4, x: 5, X: 5 };
addEventListener('keydown', function(e){ if (e.key in KEYS) { held[KEYS[e.key]] = 1; e.preventDefault(); } });
addEventListener('keyup', function(e){ if (e.key in KEYS) held[KEYS[e.key]] = 0; });
// Buttons A / B (labels say what they do).
document.getElementById('lA').textContent = LABELS.a;
document.getElementById('lB').textContent = LABELS.b;
if (!LABELS.b) document.getElementById('bB').style.display = 'none';
document.querySelectorAll('[data-b]').forEach(function(el){
  var b = +el.getAttribute('data-b');
  function on(e){ held[b] = 1; el.classList.add('on'); e.preventDefault(); }
  function off(){ held[b] = 0; el.classList.remove('on'); }
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
});

// Joystick: drag the knob; 8 directions → LEFT/RIGHT/UP/DOWN held.
(function(){
  var stick = document.getElementById('stick'), knob = document.getElementById('knob'), id = null, R = 40;
  function move(e){
    var r = stick.getBoundingClientRect(), dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2), m = Math.sqrt(dx*dx + dy*dy);
    if (m > R) { dx = dx/m*R; dy = dy/m*R; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    held[0] = dx < -R*0.35 ? 1 : 0; held[1] = dx > R*0.35 ? 1 : 0; held[2] = dy < -R*0.35 ? 1 : 0; held[3] = dy > R*0.35 ? 1 : 0;
  }
  function end(e){ if (e.pointerId !== id) return; id = null; knob.style.transform = ''; stick.classList.remove('on'); held[0] = held[1] = held[2] = held[3] = 0; }
  stick.addEventListener('pointerdown', function(e){ id = e.pointerId; stick.setPointerCapture(id); stick.classList.add('on'); move(e); e.preventDefault(); });
  stick.addEventListener('pointermove', function(e){ if (e.pointerId === id) move(e); });
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
})();
`;

/** Self-contained page for <iframe sandbox="allow-scripts" srcdoc=…>. */
export type ArcadeStyle = 'retro' | 'cyberpunk';

/** Button labels from the model ("DISPARA"), plain uppercase text only. */
export function safeLabels(buttons: unknown): { a: string; b: string } {
  const clean = (v: unknown, fallback: string) => {
    const s = typeof v === 'string' ? v.toUpperCase().replace(/[^\p{L}\p{N} !?.-]/gu, '').trim().slice(0, 8) : '';
    return s || fallback;
  };
  const b = (buttons ?? {}) as { a?: unknown; b?: unknown };
  return { a: clean(b.a, 'A'), b: buttons ? clean(b.b, '') : 'B' };
}

// Controls look: RETRO = chunky plastic, CYBERPUNK = neon outlines. Both "3D": a recessed
// joystick base with a raised knob, and buttons with a bottom edge that sinks when pressed.
const STYLE_CSS: Record<ArcadeStyle, string> = {
  retro: `
body{background:#0b0b0b;font-family:'Pixelify Sans',ui-monospace,monospace}
#stick{background:radial-gradient(circle at 50% 40%,#2c2c2c,#121212 70%);box-shadow:inset 0 6px 14px rgba(0,0,0,.8),0 0 0 2px #2e2e2e,0 3px 0 #3a3a3a}
#knob{background:radial-gradient(circle at 35% 30%,#f2f2f2,#9a9a9a 55%,#4a4a4a);box-shadow:0 8px 12px rgba(0,0,0,.7),inset 0 -4px 6px rgba(0,0,0,.35)}
.btn{background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--c) 55%,#fff),var(--c) 55%,color-mix(in srgb,var(--c) 60%,#000));box-shadow:0 7px 0 color-mix(in srgb,var(--c) 45%,#000),0 10px 14px rgba(0,0,0,.6);color:var(--p0);text-shadow:0 1px 0 rgba(255,255,255,.25)}
.btn.on{transform:translateY(5px);box-shadow:0 2px 0 color-mix(in srgb,var(--c) 45%,#000),0 3px 6px rgba(0,0,0,.6)}
canvas{box-shadow:0 0 0 4px #222,0 0 0 6px #000}`,
  cyberpunk: `
body{background:#05050a;font-family:'Orbitron','Pixelify Sans',ui-monospace,monospace}
#stick{background:radial-gradient(circle,rgba(255,255,255,.04),rgba(0,0,0,.6) 70%);border:2px solid var(--p3);box-shadow:0 0 14px var(--p3),inset 0 0 18px color-mix(in srgb,var(--p3) 40%,transparent)}
#knob{background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--p3) 70%,#fff),var(--p3) 45%,color-mix(in srgb,var(--p3) 40%,#000));box-shadow:0 0 18px var(--p3),0 6px 10px rgba(0,0,0,.8)}
.btn{background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--c) 35%,#000),#07070c 70%);border:2px solid var(--c);box-shadow:0 0 14px var(--c),0 6px 0 color-mix(in srgb,var(--c) 30%,#000);color:var(--c);text-shadow:0 0 6px var(--c)}
.btn.on{transform:translateY(4px);background:color-mix(in srgb,var(--c) 45%,#000);box-shadow:0 0 22px var(--c),0 2px 0 color-mix(in srgb,var(--c) 30%,#000)}
canvas{box-shadow:0 0 0 2px var(--p3),0 0 22px color-mix(in srgb,var(--p3) 60%,transparent)}
#scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(to bottom,rgba(0,0,0,.28) 0 1px,transparent 1px 3px)}`,
};

/** Self-contained page for <iframe sandbox="allow-scripts" srcdoc=…>. */
export function buildArcadeHtml(code: string, palette: unknown, opts: { style?: ArcadeStyle; buttons?: unknown; res?: number } = {}): string {
  const pal = safePalette(palette);
  // Screen size: 240 for new games, 160 for the first ones (their code assumes it).
  const res = opts.res === 240 ? 240 : 160;
  const style: ArcadeStyle = opts.style === 'cyberpunk' ? 'cyberpunk' : 'retro';
  const runtime = RUNTIME.replace('__RES__', String(res)).replace('__PALETTE__', JSON.stringify(pal)).replace('__LABELS__', JSON.stringify(safeLabels(opts.buttons)));
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@600&family=Orbitron:wght@700&display=swap">
<style>
:root{--p0:${pal[0]};--p1:${pal[1]};--p2:${pal[2]};--p3:${pal[3]}}
html,body{margin:0;height:100%;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#w{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px}
#screen{position:relative;width:min(100vw,56vh);height:min(100vw,56vh)}
canvas{width:100%;height:100%;image-rendering:pixelated;display:block}
#pad{width:min(100vw,56vh);display:flex;justify-content:space-between;align-items:center;padding:0 22px;box-sizing:border-box}
#stick{position:relative;width:120px;height:120px;border-radius:50%;touch-action:none}
#knob{position:absolute;left:30px;top:30px;width:60px;height:60px;border-radius:50%;transition:transform .06s ease-out;pointer-events:none}
#stick.on #knob{transition:none}
.ab{display:flex;gap:16px;align-items:flex-end}
.btn{width:76px;height:76px;border-radius:50%;border:0;font-weight:700;font-size:11px;font-family:inherit;letter-spacing:.5px;touch-action:none;-webkit-tap-highlight-color:transparent;transition:transform .05s,box-shadow .05s;padding:0 4px;overflow:hidden}
#bB{width:66px;height:66px;margin-bottom:22px;font-size:10px}
/* A and B use the palette's bright colors; labels use the background color (max contrast). */
#bA{--c:var(--p2)}#bB{--c:var(--p3)}
${STYLE_CSS[style]}
</style></head><body><div id="w"><div id="screen"><canvas id="c" width="${res}" height="${res}"></canvas>${style === 'cyberpunk' ? '<div id="scan"></div>' : ''}</div>
<div id="pad"><div id="stick"><div id="knob"></div></div>
<div class="ab"><button class="btn" id="bB" data-b="5"><span id="lB"></span></button><button class="btn" id="bA" data-b="4"><span id="lA"></span></button></div></div></div>
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
