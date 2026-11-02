// A story as a film in chapters. A director plans it at once (so the page has its title, summary and chapters in
// seconds); each chapter is then a painted cover, which IS its first frame, with code moving over it. Only the first
// chapter is made up front: the others are made when the viewer asks for them. A chapter whose code fails is still
// its moving cover with its narration. Pure functions: no network here.

export interface Chapter { label: string; say: string; scene: string; cover?: string; code?: string; started?: number }
export interface Plan { title: string; highlight: string; bigIdea: string; overview: string; related: string[]; relatedSearch: string[]; chapters: Chapter[] }

const SPOKEN_WORDS_PER_SECOND = 2.6;
const MIN_SECONDS = 6;

export const DIRECTOR = `You direct a short animated explainer that answers a question. Reply with a json object only:
{"title": short title in the question's language, "highlight": one word of the title, "bigIdea": the one idea in one sentence, "overview": a 2-3 sentence summary,
 "related": [3 follow-up questions], "relatedSearch": [for each, a 1-3 word English stock search],
 "chapters": [3-5 of { "label": "≤ 3 words", "say": "2-3 short vivid sentences, about 12 s aloud", "scene": "in English: the picture that opens this chapter, one big clear subject, what it shows and where; the bottom quarter of the frame calm and empty" }]}
Start where the viewer is, one picture that grows from chapter to chapter, end on the idea. The film shows what the question is about: when that is an event (a crash, an eruption, a collapse), one chapter's scene IS that moment as it happens, never just the build-up or the instant before it. Write that scene physically, or the painter misses it: a side view from far away, each thing involved whole in frame and told apart by colour, and what happens to them where they meet (crumpled, lifted, a huge burst of light, flying pieces). Machines and shapes, no people. Real names, dates and numbers from the SOURCES when they come: they are what is true today, never deny them, never invent numbers. With no SOURCES, what the question states is your premise: tell that story, never talk about dates, verification or what can't be known. Everything but "scene" and "relatedSearch" is in the question's language.`;

export const COVER_STYLE = "Flat vector illustration in the spirit of a science explainer, saturated colours, deep navy ground, soft glowing light, rounded shapes without outlines, layered depth, tiny details. No text, no letters, no logos, no watermark.";

export const WRITER = `You animate one chapter of an explainer over its opening picture (attached), which fills the frame and slowly zooms by itself.
Write the body of function(a), which makes the things that move over the picture:
- a.el(tag, attrs, parent?) makes an SVG element in a 1600×900 layer and returns it
- a.tl is a GSAP timeline, and a.seconds how long the chapter lasts: spread the action over all of it (a.tl.to(el, {...}, atSeconds))
- a.label(text) shows one short word in a pill at the top, at most once
- a.count(from, to, unit, x, y) a big number that counts during the chapter
- gsap is there for endless ambient loops
What the narration says happens is what the viewer sees: a crash shakes the frame and flashes on impact. Look at the picture and put each thing exactly on what it belongs to: rays on the sun, an arrow along the orbit, a dimming shape over what goes dark. 3-6 clear moving ideas taken from the narration, big enough to see on a phone: glows that pulse, arrows that draw, particles that drift, shapes that grow, shrink or fade. Flat rounded shapes without outlines. Pops: elastic.out(1,0.45). Moves: power3.inOut. Nothing that matters below y 680: the captions are there.
Reply with one \`\`\`js block and nothing else: no explanation, no reasoning, no function header.`;

export const chapterSeconds = (say: string) => Math.max(MIN_SECONDS, Math.round(say.trim().split(/\s+/).length / SPOKEN_WORDS_PER_SECOND));

const text = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** The director's answer, kept to what the page can show; null if it can't make a film of it. */
export function planFrom(raw: string): Plan | null {
  let out: Record<string, any>;
  try { out = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? ""); } catch { return null; }
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  const chapters = list(out.chapters).map((c) => ({ label: text(c?.label, 40), say: text(c?.say, 400), scene: text(c?.scene, 500) })).filter((c) => c.label && c.say && c.scene).slice(0, 5);
  if (chapters.length < 2) return null;
  return {
    title: text(out.title, 120), highlight: text(out.highlight, 40), bigIdea: text(out.bigIdea, 240), overview: text(out.overview, 600),
    related: list(out.related).map((q) => text(q, 120)).filter(Boolean).slice(0, 4), relatedSearch: list(out.relatedSearch).map((q) => text(q, 60)).slice(0, 4), chapters,
  };
}

/** The chapter's code from the writer's answer, fenced or not; null unless it parses and uses the stage. */
export function codeFrom(answer: string): string | null {
  const code = (answer.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/)?.[1] ?? answer).trim();
  if (!/\ba\.(el|tl|label|count)\b/.test(code)) return null;
  try { new Function("a", code); return code; } catch (e) { return e instanceof SyntaxError ? null : code; } // parsed, never run here
}

// Runs in the sandboxed stage. Chapters arrive one by one: curios.chapter(i, cover, seconds) and curios.code(i, fn).
const SHELL = `(() => {
  const NS = 'http://www.w3.org/2000/svg', stage = document.getElementById('stage'), hud = document.getElementById('hud'), film = [];
  const add = (i, cover, seconds) => {
    if (film[i]) return film[i];
    const box = document.createElement('div'), img = new Image(), svg = document.createElementNS(NS, 'svg');
    box.className = 'chapter'; img.crossOrigin = 'anonymous'; img.src = cover;
    svg.setAttribute('viewBox', '0 0 1600 900'); svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    box.append(img, svg); stage.append(box);
    return film[i] = { box, img, svg, seconds, fn: null };
  };
  const show = (i) => film.forEach((c, k) => { if (c) c.box.style.display = k === i ? 'block' : 'none'; });
  const tools = (c, tl) => ({
    tl, seconds: c.seconds, gsap,
    el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs || {}) e.setAttribute(k, attrs[k]); (parent || c.svg).append(e); return e; },
    label(words) {
      hud.textContent = '';
      const g = document.createElementNS(NS, 'g'), t = document.createElementNS(NS, 'text'), r = document.createElementNS(NS, 'rect');
      t.textContent = String(words).toUpperCase(); t.setAttribute('x', 800); t.setAttribute('y', 92); t.setAttribute('text-anchor', 'middle'); t.setAttribute('class', 'pill');
      g.append(r, t); hud.append(g);
      const w = t.getComputedTextLength() + 72;
      r.setAttribute('x', 800 - w / 2); r.setAttribute('y', 44); r.setAttribute('width', w); r.setAttribute('height', 68); r.setAttribute('rx', 34); r.setAttribute('fill', 'rgba(6,20,40,.62)');
      gsap.from(g, { y: 30, opacity: 0, duration: .7, ease: 'expo.out', delay: .3 });
    },
    count(from, to, unit, x, y) {
      const e = this.el('text', { x, y, class: 'count', 'text-anchor': 'middle' }), n = { v: from };
      tl.to(n, { v: to, duration: c.seconds * .7, ease: 'power2.inOut', onUpdate() { e.textContent = Math.round(n.v).toLocaleString() + (unit ? ' ' + unit : ''); } }, c.seconds * .1);
      return e;
    },
  });
  curios.chapter = add;
  curios.code = (i, fn) => { if (film[i]) film[i].fn = fn; };
  curios.on('chapter', ({ i, cover, seconds, code }) => {
    add(i, cover, seconds);
    if (code) { const s = document.createElement('script'); s.textContent = 'curios.code(' + i + ',function(a){' + code + '\\n});'; document.body.append(s); }
  });
  let current = null;
  curios.on('beat', (i) => new Promise((done) => {
    const c = film[i];
    if (!c) return done();
    current && current.kill(); hud.textContent = ''; c.svg.textContent = ''; show(i);
    const tl = current = gsap.timeline({ onComplete: done });
    tl.to({}, { duration: c.seconds }, 0);
    gsap.fromTo(c.box, { opacity: 0 }, { opacity: 1, duration: .5 });
    gsap.fromTo([c.img, c.svg], { scale: 1, xPercent: 0 }, { scale: 1.12, xPercent: i % 2 ? 1.5 : -1.5, duration: c.seconds + 1, ease: 'none' });
    try { c.fn && c.fn(tools(c, tl)); } catch (e) { console.warn('chapter', i, e); } // it stays a moving cover
  }));
  curios.on('pause', (paused) => gsap.globalTimeline.paused(paused));
  curios.on('speed', (x) => gsap.globalTimeline.timeScale(x));
  curios.on('reset', () => { current && current.kill(); hud.textContent = ''; show(0); });
  addEventListener('load', () => { show(0); curios.ready(); });
})();`;

const safe = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

/** The whole page, with the chapters made so far. The manifest always has them all. */
export function pageFor(plan: Plan): string {
  const manifest = { title: plan.title, highlight: plan.highlight, bigIdea: plan.bigIdea, related: plan.related, relatedSearch: plan.relatedSearch, beats: plan.chapters.map(({ label, say }) => ({ label, say })), readouts: [], controls: [] };
  const made = plan.chapters.flatMap((c, i) => (!c.cover ? [] : [
    `<script>curios.chapter(${i},${safe(c.cover)},${chapterSeconds(c.say)})</script>`,
    ...(c.code ? [`<script>curios.code(${i},function(a){${c.code.replace(/<\/script/gi, "<\\/script")}\n});</script>`] : []),
  ]));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{width:100%;height:100%;overflow:hidden}
#stage,.chapter,.chapter img,.chapter svg,#hud{position:absolute;inset:0;width:100%;height:100%}
.chapter{display:none;overflow:hidden}.chapter img{object-fit:cover}
#veil{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 55%,rgba(4,4,20,.45))}
.pill{font:700 36px var(--font);letter-spacing:.18em;fill:var(--accent)}.count{font:700 92px var(--font);fill:#fff}
</style><script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script></head><body>
<script type="application/json" id="manifest">${safe(manifest)}</script>
<div id="stage"></div><div id="veil"></div><svg id="hud" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet"></svg>
<script>${SHELL}</script>
${made.join("\n")}
</body></html>`;
}
