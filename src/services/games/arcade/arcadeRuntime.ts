// Curios Arcade fantasy console (WASM-4-like): the fixed, hand-written half of every
// AI-made game. The model only writes init()/update() against this API (see the
// arcade-generate edge function prompt), so the console — screen, palette, touch D-pad +
// A/B, 60 fps loop, PRESS A / GAME OVER screens — is tested once and always works.
// Runs in a sandboxed iframe (allow-scripts only): no storage, cookies or app access, so
// a game can't save anything — every run starts from zero, like an arcade cabinet.
//
// Messages to the parent: { arcade: 'ready' } after the smoke test, { arcade: 'error', message },
// { arcade: 'over', score } at each game over. From the parent: { arcadeCmd: 'restart' }.

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
var ZB = new Float32Array(160), CAM = { x: 0, y: 0, a: 0, f: 1.05 }, IMG = C.createImageData(160, 160), PIX = new Uint32Array(IMG.data.buffer), RGB = [];
function rgba(c){ var h = col(c).slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return (255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16); }
function wall(map,x,y){ var row = map[Math.floor(y)]; var ch = row && row[Math.floor(x)]; return ch === undefined || (ch !== '.' && ch !== ' '); }
function view3d(map,px,py,a){
  CAM.x = px; CAM.y = py; CAM.a = a;
  for (var i = 0; i < 4; i++) RGB[i] = rgba(i);
  for (var x = 0; x < 160; x++) {
    var ra = a + (x/160 - 0.5)*CAM.f, dx = Math.cos(ra), dy = Math.sin(ra);
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
    var h = Math.min(160, 160/Math.max(d, 0.01)), top = (80 - h/2)|0, bot = (80 + h/2)|0;
    var wc = RGB[/[1-3]/.test(ch) ? +ch : 2], shade = side === 1 || d > 7;
    for (var y = 0; y < 160; y++) {
      var v = y < top ? RGB[0] : y >= bot ? RGB[1] : (shade && ((x + y) & 1) ? RGB[0] : wc);
      PIX[y*160 + x] = v;
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
  var pd = d*Math.cos(ang), h = Math.min(320, 160*s/pd), w = h, cx = (ang/CAM.f + 0.5)*160;
  var x0 = Math.round(cx - w/2), y0 = Math.round(80 + 80/pd - h), shown = false;
  C.fillStyle = col(c);
  for (var x = Math.max(0, x0); x < Math.min(160, x0 + w); x++) if (pd < ZB[x]) { C.fillRect(x, y0, 1, Math.ceil(h)); shown = true; }
  return shown ? { x: x0, y: y0, w: Math.round(w), h: Math.round(h), d: pd } : null;
}
function btn(i){ return !!held[i]; }
function btnp(i){ return !!held[i] && !prev[i]; }
function rnd(n){ return Math.random()*(n===undefined?1:n); }
function over(s){ if (state === 'play' || state === 'smoke') { score = Math.max(0, Math.floor(+s||0)); state = state === 'smoke' ? 'smoke-over' : 'over'; } }
function post(m){ parent.postMessage(Object.assign({ arcade: true }, m), '*'); }
function fail(e){ state = 'error'; post({ type: 'error', message: String(e && e.message || e).slice(0, 300) }); cls(0); center('ERROR', 76, 3, 2); }
function center(s,y,c,k){ text(s, 80 - textw(s,k)/2, y, c, k); }
function box(lines){ rect(16,50,128,60,0); rectb(16,50,128,60,3); rectb(18,52,124,56,2); lines.forEach(function(l,i){ center(l, 58 + i*16, 3, i === 0 ? 2 : 1); }); }

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
    if (state === 'title') { cls(0); box(['PRESS A', '', '']); if (btnp(4)) { game.init(); t = 0; state = 'play'; } }
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

// The page's "Play again" button: restart right away from the GAME OVER screen.
addEventListener('message', function(e){ if (e.data && e.data.arcadeCmd === 'restart' && state === 'over') { game.init(); t = 0; state = 'play'; } });
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
