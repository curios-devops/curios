// Curios Arcade fantasy console (WASM-4-like): the fixed, hand-written half of every
// AI-made game. The model only writes init()/update() against this API (see the
// arcade-generate edge function prompt), so the console — screen, palette (4 or 8 colors),
// touch joystick or arrow pad + A/B, 8-bit sound effects, 60 fps loop, PRESS A / GAME OVER
// screens — is tested once and always works.
// Runs in a sandboxed iframe (allow-scripts only): no storage, cookies or app access, so
// a game can't save anything — every run starts from zero, like an arcade cabinet.
//
// Messages to the parent: { arcade: 'ready' } after the smoke test, { arcade: 'error', message },
// { arcade: 'start' } when a run starts from the title, { arcade: 'over', score } at each game over,
// { arcade: 'controls', mode } when the player switches joystick / arrows.
// From the parent: { arcadeCmd: 'restart' }, { arcadeCmd: 'mute', on }.

export const DEFAULT_PALETTE = ['#e0f8cf', '#86c06c', '#306850', '#071821'];

/** Four (first games) or eight #rgb/#rrggbb colors, else the default palette. */
export function safePalette(palette: unknown): string[] {
  const ok = Array.isArray(palette) && (palette.length === 4 || palette.length === 8) && palette.every((c) => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c));
  return ok ? (palette as string[]) : DEFAULT_PALETTE;
}

/** UI colors around a game (score sheet, catalog card) by role, for 4- and 8-color palettes. */
export function paletteRoles(palette: unknown): { bg: string; line: string; accent: string; accent2: string; text: string } {
  const p = safePalette(palette);
  return p.length >= 8
    ? { bg: p[0], line: p[1], accent: p[3], accent2: p[4], text: p[7] }
    : { bg: p[0], line: p[1], accent: p[2], accent2: p[2], text: p[3] };
}

/** Game code inside an inline <script>: a literal "</script" would end the tag early. */
export function scriptSafe(code: string): string {
  return code.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
}

const RUNTIME = String.raw`
var W = __RES__, HALF = W/2, UI = W/160, P = __PALETTE__, LABELS = __LABELS__, OPTS = __OPTS__, C = document.getElementById('c').getContext('2d');
var held = [0,0,0,0,0,0], prev = [0,0,0,0,0,0], t = 0, state = 'title', score = 0, overAt = 0, game = null;
function col(c){ var n = P.length; return P[(((c|0)%n)+n)%n]; }
function cls(c){ C.fillStyle = col(c||0); C.fillRect(0,0,W,W); }
function rect(x,y,w,h,c){ C.fillStyle = col(c); C.fillRect(x|0,y|0,w|0,h|0); }
function rectb(x,y,w,h,c){ C.strokeStyle = col(c); C.lineWidth = 1; C.strokeRect((x|0)+.5,(y|0)+.5,(w|0)-1,(h|0)-1); }
function circ(x,y,r,c){ C.fillStyle = col(c); C.beginPath(); C.arc(x,y,Math.max(0,r),0,7); C.fill(); }
function line(a,b,x,y,c){ C.strokeStyle = col(c); C.lineWidth = 1; C.beginPath(); C.moveTo((a|0)+.5,(b|0)+.5); C.lineTo((x|0)+.5,(y|0)+.5); C.stroke(); }
// 8-bit sound: a few synthesized effects and a tone() for melodies. Silent during the smoke
// test and when muted; the AudioContext starts on the first touch / key (browser rule).
var AC = null, MUTED = !!OPTS.muted, QUIET = true, LAST = {}, NOISE = null;
function audio(){ if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); }
addEventListener('pointerdown', audio, true); addEventListener('keydown', audio, true);
function live(){ return !QUIET && !MUTED && AC && AC.state === 'running'; }
function tone(f, ms, wave, vol, f2){
  if (!live()) return;
  var t0 = AC.currentTime, d = Math.max(.02, (ms || 100)/1000), o = AC.createOscillator(), g = AC.createGain();
  o.type = wave || 'square'; o.frequency.setValueAtTime(Math.max(20, f), t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + d);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol || .1, t0 + .005); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + d + .02);
}
function noise(ms, vol, from, to){
  if (!live()) return;
  if (!NOISE) { NOISE = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); var ch = NOISE.getChannelData(0); for (var i = 0; i < ch.length; i++) ch[i] = Math.random()*2 - 1; }
  var t0 = AC.currentTime, d = ms/1000, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NOISE; f.type = 'lowpass'; f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + d);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t0); s.stop(t0 + d);
}
var SFX = {
  shoot: function(){ tone(880, 110, 'square', .07, 220); },
  laser: function(){ tone(1400, 160, 'sawtooth', .06, 300); },
  hit: function(){ noise(140, .22, 3000, 400); },
  explode: function(){ noise(450, .3, 2200, 80); },
  coin: function(){ tone(988, 60, 'square', .07); setTimeout(function(){ tone(1319, 110, 'square', .07); }, 60); },
  blip: function(){ tone(620, 45, 'square', .05); },
  jump: function(){ tone(300, 150, 'square', .07, 720); },
  power: function(){ [523, 659, 784, 1047].forEach(function(f, i){ setTimeout(function(){ tone(f, 80, 'triangle', .09); }, i*70); }); },
  hurt: function(){ tone(260, 280, 'sawtooth', .09, 60); },
  step: function(){ tone(90, 70, 'square', .1); },
  win: function(){ [523, 659, 784, 1047, 1319].forEach(function(f, i){ setTimeout(function(){ tone(f, 110, 'square', .07); }, i*90); }); }
};
function sfx(name){ var now = Date.now(); if (LAST[name] && now - LAST[name] < 35) return; LAST[name] = now; if (SFX[name]) SFX[name](); }
function gameOverJingle(){ [392, 330, 262, 196].forEach(function(f, i){ setTimeout(function(){ tone(f, 160, 'square', .07); }, i*140); }); }

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

// 3D (raycaster, Wolfenstein/DOOM-like). map: array of strings, '.' = floor, '#' or a digit = wall (digit = its color).
var ZB = new Float32Array(W), CAM = { x: 0, y: 0, a: 0, f: 1.05 }, IMG = C.createImageData(W, W), PIX = new Uint32Array(IMG.data.buffer), RGB = [];
function rgba(c){ var h = col(c).slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return (255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16); }
function wall(map,x,y){ var row = map[Math.floor(y)]; var ch = row && row[Math.floor(x)]; return ch === undefined || (ch !== '.' && ch !== ' '); }
function view3d(map,px,py,a){
  CAM.x = px; CAM.y = py; CAM.a = a;
  for (var i = 0; i < P.length; i++) RGB[i] = rgba(i);
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
    var wc = RGB[/[1-9]/.test(ch) && +ch < P.length ? +ch : 2], shade = side === 1 || d > 7;
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
  held = [0,0,0,0,0,0]; prev = held.slice(); t = 0; state = 'title'; QUIET = false;
}

function frame(){
  try {
    if (state === 'title') { cls(0); box(['PRESS ' + LABELS.a, '', '']); if (btnp(4)) { game.init(); t = 0; state = 'play'; post({ type: 'start' }); } }
    else if (state === 'play') { game.update(); t++; if (state === 'over') { overAt = t; gameOverJingle(); post({ type: 'over', score: score }); } }
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
addEventListener('message', function(e){
  if (e.data && e.data.arcadeCmd === 'restart' && state === 'over') { game.init(); t = 0; state = 'play'; }
  if (e.data && e.data.arcadeCmd === 'mute') MUTED = !!e.data.on;
});
var KEYS = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3, z: 4, Z: 4, ' ': 4, Enter: 4, x: 5, X: 5 };
addEventListener('keydown', function(e){ if (e.key in KEYS) { held[KEYS[e.key]] = 1; e.preventDefault(); } });
addEventListener('keyup', function(e){ if (e.key in KEYS) held[KEYS[e.key]] = 0; });
// Controls drawn as pixel art in the game's own palette (tiny canvases scaled up, like the
// game screen), by color role so 4- and 8-color palettes both work: joystick or arrow pad
// (switchable; ◀ ▶ only for left/right games), A/B with a 1-pixel "3D" edge that sinks when
// pressed, labels in the console's pixel font.
var ROLE = P.length >= 8 ? { bg: 0, edge: 1, ring: 2, knob: 3, a: 3, b: 4, text: 7, shineA: 7, shineB: 7 }
                         : { bg: 0, edge: 1, ring: 1, knob: 2, a: 2, b: 3, text: 3, shineA: 3, shineB: 2 };
function disc(g, cx, cy, r, color){ g.fillStyle = color; for (var y = 0; y < g.canvas.height; y++) for (var x = 0; x < g.canvas.width; x++) { var dx = x + .5 - cx, dy = y + .5 - cy; if (dx*dx + dy*dy <= r*r) g.fillRect(x, y, 1, 1); } }
function drawBase(){ var g = document.getElementById('base').getContext('2d'); g.clearRect(0,0,24,24); disc(g, 12, 12, 12, P[ROLE.ring]); disc(g, 12, 12, 10, P[ROLE.bg]); g.fillStyle = P[ROLE.ring]; [[11,2],[11,20],[2,11],[20,11]].forEach(function(q){ g.fillRect(q[0], q[1], 2, 2); }); }
function drawKnob(){ var g = document.getElementById('knob').getContext('2d'); g.clearRect(0,0,12,13); disc(g, 6, 7, 5.6, P[ROLE.edge]); disc(g, 6, 6, 5.6, P[ROLE.knob]); g.fillStyle = P[ROLE.shineA]; g.fillRect(3, 3, 2, 1); g.fillRect(3, 4, 1, 1); }
function drawBtn(id, face, shine, down){ var g = document.getElementById(id).getContext('2d'); g.clearRect(0,0,16,18); disc(g, 8, 9.5, 7.6, P[ROLE.edge]); disc(g, 8, down ? 9.5 : 8, 7.6, face); g.fillStyle = shine; var y = down ? 5 : 3.5; g.fillRect(4, y|0, 3, 1); g.fillRect(4, (y|0) + 1, 1, 1); }
// Arrow key: a square key with a 1-pixel edge and a pixel triangle (dir 0 ◀ 1 ▶ 2 ▲ 3 ▼).
// The triangle is drawn pointing right, then mirrored / rotated for the other directions.
var TRI = []; for (var i = 0; i < 4; i++) for (var y = 4 + i; y <= 10 - i; y++) TRI.push([5 + i, y]);
function drawArrow(id, dir, down){
  var g = document.getElementById(id).getContext('2d'), o = down ? 1 : 0;
  g.clearRect(0,0,14,15);
  g.fillStyle = P[ROLE.edge]; g.fillRect(1, 2, 12, 13);
  g.fillStyle = P[ROLE.ring]; g.fillRect(1, o, 12, 13);
  g.fillStyle = P[ROLE.text];
  TRI.forEach(function(q){
    var x = q[0], y = q[1], p = dir === 1 ? [x, y] : dir === 0 ? [13 - x, y] : dir === 2 ? [y, 13 - x] : [y, x];
    g.fillRect(p[0], p[1] - 1 + o, 1, 1);
  });
}
function drawLabel(id, s){ s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); var c = document.getElementById(id), g = c.getContext('2d'); c.width = Math.max(1, s.length*4 - 1); c.height = 5; g.clearRect(0,0,c.width,5);
  for (var i = 0; i < s.length; i++) { var f = FONT[s[i]]; if (f) for (var b = 0; b < 15; b++) if (f >> (14 - b) & 1) { g.fillStyle = P[ROLE.text]; g.fillRect(i*4 + b%3, (b/3)|0, 1, 1); } } }
var BTN = { bA: [P[ROLE.a], P[ROLE.shineA]], bB: [P[ROLE.b], P[ROLE.shineB]] };
drawBase(); drawKnob(); drawBtn('bA', BTN.bA[0], BTN.bA[1], false); drawBtn('bB', BTN.bB[0], BTN.bB[1], false);
drawLabel('lA', LABELS.a); drawLabel('lB', LABELS.b);
if (!LABELS.b) document.getElementById('wB').style.display = 'none';
document.querySelectorAll('[data-b]').forEach(function(el){
  var b = +el.getAttribute('data-b'), id = el.id;
  function on(e){ held[b] = 1; drawBtn(id, BTN[id][0], BTN[id][1], true); e.preventDefault(); }
  function off(){ held[b] = 0; drawBtn(id, BTN[id][0], BTN[id][1], false); }
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
});

// Arrow pad (held while pressed). Left/right games show only ◀ ▶.
if (OPTS.axes === 'x') { document.getElementById('dpad').classList.add('x'); }
document.querySelectorAll('[data-d]').forEach(function(el){
  var d = +el.getAttribute('data-d');
  drawArrow(el.id, d, false);
  function on(e){ held[d] = 1; drawArrow(el.id, d, true); e.preventDefault(); }
  function off(){ held[d] = 0; drawArrow(el.id, d, false); }
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
});

// Joystick ↔ arrows switch (the page remembers the choice on this device).
function setControls(mode){
  document.getElementById('stick').style.display = mode === 'pad' ? 'none' : '';
  document.getElementById('dpad').style.display = mode === 'pad' ? '' : 'none';
  var g = document.getElementById('sw').getContext('2d'); g.clearRect(0,0,9,9); g.fillStyle = P[ROLE.text];
  if (mode === 'pad') { [[3,0],[4,0],[5,0],[1,1],[7,1],[0,3],[8,3],[0,4],[8,4],[0,5],[8,5],[1,7],[7,7],[3,8],[4,8],[5,8],[2,1],[6,1],[1,2],[7,2],[1,6],[7,6],[2,7],[6,7],[3,3],[4,3],[5,3],[3,4],[4,4],[5,4],[3,5],[4,5],[5,5]].forEach(function(q){ g.fillRect(q[0], q[1], 1, 1); }); }
  else { g.fillRect(3,0,3,9); g.fillRect(0,3,9,3); }
  CONTROLS = mode;
}
var CONTROLS = OPTS.controls === 'pad' ? 'pad' : 'stick';
setControls(CONTROLS);
document.getElementById('sw').addEventListener('pointerdown', function(e){ e.preventDefault(); setControls(CONTROLS === 'pad' ? 'stick' : 'pad'); post({ type: 'controls', mode: CONTROLS }); held[0] = held[1] = held[2] = held[3] = 0; });

// Joystick: drag the knob; 8 directions → LEFT/RIGHT/UP/DOWN held.
(function(){
  var stick = document.getElementById('stick'), knob = document.getElementById('knob'), id = null, R = 40;
  function move(e){
    var r = stick.getBoundingClientRect(), dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2), m = Math.sqrt(dx*dx + dy*dy);
    if (m > R) { dx = dx/m*R; dy = dy/m*R; }
    if (OPTS.axes === 'x') dy = 0;
    // Snap to the 5px art grid so the knob moves in whole "pixels".
    knob.style.transform = 'translate(' + Math.round(dx/5)*5 + 'px,' + Math.round(dy/5)*5 + 'px)';
    held[0] = dx < -R*0.35 ? 1 : 0; held[1] = dx > R*0.35 ? 1 : 0; held[2] = dy < -R*0.35 ? 1 : 0; held[3] = dy > R*0.35 ? 1 : 0;
  }
  function end(e){ if (e.pointerId !== id) return; id = null; knob.style.transform = ''; held[0] = held[1] = held[2] = held[3] = 0; }
  stick.addEventListener('pointerdown', function(e){ id = e.pointerId; stick.setPointerCapture(id); move(e); e.preventDefault(); });
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

// Cabinet look around the screen: RETRO = flat, Atari-like; CYBERPUNK = the same pixel art
// with a neon glow and scanlines.
const STYLE_CSS: Record<ArcadeStyle, string> = {
  retro: `
#screen canvas{box-shadow:0 0 0 4px var(--p1)}`,
  cyberpunk: `
#screen canvas{box-shadow:0 0 0 2px var(--p3),0 0 22px color-mix(in srgb,var(--p3) 60%,transparent)}
#pad canvas{filter:drop-shadow(0 0 6px color-mix(in srgb,var(--p3) 70%,transparent))}
#scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(to bottom,rgba(0,0,0,.28) 0 1px,transparent 1px 3px)}`,
};

/** Screen size: 128–512 in steps of 16 (set per game by its style); anything else → 160. */
export function safeRes(res: unknown): number {
  return typeof res === 'number' && Number.isInteger(res) && res >= 128 && res <= 512 && res % 16 === 0 ? res : 160;
}

/** Self-contained page for <iframe sandbox="allow-scripts" srcdoc=…>. */
export function buildArcadeHtml(
  code: string,
  palette: unknown,
  opts: { style?: ArcadeStyle; buttons?: unknown; res?: number; axes?: 'x' | 'xy'; controls?: 'stick' | 'pad'; muted?: boolean } = {},
): string {
  const pal = safePalette(palette);
  const res = safeRes(opts.res);
  const style: ArcadeStyle = opts.style === 'cyberpunk' ? 'cyberpunk' : 'retro';
  const runtime = RUNTIME.replace('__RES__', String(res)).replace('__PALETTE__', JSON.stringify(pal)).replace('__LABELS__', JSON.stringify(safeLabels(opts.buttons)))
    .replace('__OPTS__', JSON.stringify({ axes: opts.axes === 'x' ? 'x' : 'xy', controls: opts.controls === 'pad' ? 'pad' : 'stick', muted: !!opts.muted }));
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
:root{--p0:${pal[0]};--p1:${pal[1]};--p2:${pal[2]};--p3:${pal[3]}}
html,body{margin:0;height:100%;overflow:hidden;background:var(--p0);touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#w{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px}
#screen{position:relative;width:min(100vw,56vh);height:min(100vw,56vh)}
canvas{display:block;image-rendering:pixelated}
#screen canvas{width:100%;height:100%}
#pad{width:min(100vw,56vh);display:flex;justify-content:space-between;align-items:center;padding:0 22px;box-sizing:border-box}
#left{position:relative;width:140px;height:130px;display:flex;align-items:center;justify-content:center}
#stick{position:relative;width:120px;height:120px;touch-action:none}
#dpad{display:grid;grid-template-columns:repeat(3,42px);grid-template-rows:repeat(3,42px)}
#dpad.x{grid-template-columns:repeat(2,62px);grid-template-rows:62px;gap:10px}
#dpad.x #d2,#dpad.x #d3,#dpad.x .sp{display:none}
#dpad canvas{width:100%;height:100%;touch-action:none}
#sw{position:absolute;left:-4px;top:-10px;width:30px;height:30px;padding:6px;opacity:.85;z-index:2;touch-action:none}
#base{width:120px;height:120px}
#knob{position:absolute;left:30px;top:27px;width:60px;height:65px;pointer-events:none}
.ab{display:flex;gap:18px;align-items:flex-end}
.bw{display:flex;flex-direction:column;align-items:center;gap:8px}
.btn{width:80px;height:90px;touch-action:none;-webkit-tap-highlight-color:transparent}
#bB{width:64px;height:72px}
#wB{margin-bottom:20px}
.lbl{height:10px}
${STYLE_CSS[style]}
</style></head><body><div id="w"><div id="screen"><canvas id="c" width="${res}" height="${res}"></canvas>${style === 'cyberpunk' ? '<div id="scan"></div>' : ''}</div>
<div id="pad"><div id="left"><canvas id="sw" width="9" height="9"></canvas><div id="stick"><canvas id="base" width="24" height="24"></canvas><canvas id="knob" width="12" height="13"></canvas></div>
<div id="dpad"><span class="sp"></span><canvas id="d2" data-d="2" width="14" height="15"></canvas><span class="sp"></span><canvas id="d0" data-d="0" width="14" height="15"></canvas><span class="sp"></span><canvas id="d1" data-d="1" width="14" height="15"></canvas><span class="sp"></span><canvas id="d3" data-d="3" width="14" height="15"></canvas><span class="sp"></span></div></div>
<div class="ab"><div class="bw" id="wB"><canvas class="btn" id="bB" data-b="5" width="16" height="18"></canvas><canvas class="lbl" id="lB"></canvas></div><div class="bw" id="wA"><canvas class="btn" id="bA" data-b="4" width="16" height="18"></canvas><canvas class="lbl" id="lA"></canvas></div></div></div></div>
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
