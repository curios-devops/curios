import { describe, expect, it } from 'vitest';
import { chapterSeconds, codeFrom, pageFor, planFrom, type Plan } from './chapters.ts';
import { readManifest } from '../../../src/services/movie/animation/stage.ts';

const chapter = { label: 'Uno', say: 'Una frase corta y clara.', scene: 'a sun' };
const plan = (over: Partial<Plan> = {}): Plan => ({ title: 'T', highlight: '', bigIdea: 'I', overview: 'O', related: ['q'], relatedSearch: ['s'], chapters: [chapter, chapter], ...over });

describe('planFrom', () => {
  it('reads an answer wrapped in words, because models add them', () => {
    expect(planFrom(`Here it is: ${JSON.stringify(plan())}`)?.chapters).toHaveLength(2);
  });

  it('refuses what is not a film, so the fallback writer can try', () => {
    expect(planFrom('no json')).toBeNull();
    expect(planFrom(JSON.stringify(plan({ chapters: [chapter] })))).toBeNull();
  });

  it('keeps at most 5 chapters, drops the ones without a picture', () => {
    expect(planFrom(JSON.stringify(plan({ chapters: Array(8).fill(chapter) })))?.chapters).toHaveLength(5);
    expect(planFrom(JSON.stringify(plan({ chapters: [chapter, chapter, { ...chapter, scene: '' }] })))?.chapters).toHaveLength(2);
  });
});

describe('codeFrom', () => {
  it('takes the code block and leaves the rest', () => {
    expect(codeFrom('Sure:\n```js\na.label("hi");\n```\ndone')).toBe('a.label("hi");');
  });

  it('takes code that came without its fence', () => {
    expect(codeFrom('a.label("hi");')).toBe('a.label("hi");');
  });

  it('refuses reasoning written instead of code: that blanked a whole film', () => {
    expect(codeFrom('We need code only function body.')).toBeNull();
    expect(codeFrom('```js\nWe need a.label only\n```')).toBeNull();
    expect(codeFrom('Sure')).toBeNull();
  });
});

describe('chapterSeconds', () => {
  it('follows the narration, with a floor so a short line still shows something', () => {
    expect(chapterSeconds(Array(26).fill('palabra').join(' '))).toBe(10);
    expect(chapterSeconds('hola')).toBe(6);
  });
});

describe('pageFor', () => {
  it('holds a painted chapter without its code: the rail shows it, the code comes when asked for', () => {
    const html = pageFor(plan({ chapters: [{ ...chapter, cover: 'https://c/1.jpg', code: 'a.label("x")' }, { ...chapter, cover: 'https://c/2.jpg' }] }));
    expect(html).toContain('curios.chapter(1,');
    expect(html).not.toContain('curios.code(1,');
  });

  it('always lists every chapter in the manifest, made or not: the page shows them from the start', () => {
    const m = readManifest(pageFor(plan()));
    expect(m?.beats).toHaveLength(2);
    expect(m?.readouts).toEqual([]);
    expect(m?.controls).toEqual([]);
  });

  it('gives each chapter its own script, so a broken one leaves the others alone', () => {
    const html = pageFor(plan({ chapters: [{ ...chapter, cover: 'https://c/1.jpg', code: 'a.label("x")' }, { ...chapter, cover: 'https://c/2.jpg', code: 'a.label("y")' }] }));
    expect(html.match(/curios\.code\(\d,function/g)).toHaveLength(2);
    expect(html.indexOf('curios.code(1,')).toBeGreaterThan(html.indexOf('</script>', html.indexOf('curios.code(0,')));
  });

  it("can't be closed from inside by a chapter's code", () => {
    const html = pageFor(plan({ chapters: [{ ...chapter, cover: 'https://c/1.jpg', code: 'a.label("</script><b>")' }, chapter] }));
    expect(html).not.toContain('"</script><b>');
  });
});
