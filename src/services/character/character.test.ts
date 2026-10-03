import { describe, it, expect, vi } from 'vitest';

// The director imports the search stack (Supabase client etc.); stub it — these
// tests cover only the pure parsing / scripting logic.
vi.mock('../search/providers/webSearchProvider', () => ({ executeWebSearch: vi.fn() }));
vi.mock('../search/providers/llmProvider', () => ({ buildSourcesText: vi.fn(), streamLLMText: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { updateUser: vi.fn() } } }));

import { parseDirectorOutput, buildScriptEvent, VMP_SEPARATOR } from './characterDirector';
import { pickVoice, VOICES } from './voices';
import { CHARACTERS, findCharacter, searchCharacters } from './characterCatalog';

const nova = findCharacter('nova');
const genderOf = (id: string) => VOICES.find((v) => v.id === id)?.gender;

describe('parseDirectorOutput', () => {
  it('reads speech, actions and suggestions even when wrapped in a code fence', () => {
    const raw = '```json\n{"speech":"Hola, te cuento.","actions":["A","B"],"suggestions":["¿Q1?","¿Q2?","¿Q3?","¿Q4?"]}\n```';
    const out = parseDirectorOutput(raw, nova);
    expect(out.speech).toBe('Hola, te cuento.');
    expect(out.actions).toEqual(['A', 'B']);
    expect(out.suggestions).toHaveLength(3); // capped: the UI shows three chips
  });

  it('never leaves the character without something to do when the model returns prose', () => {
    // Why: a bad LLM reply must still produce a performance, not a frozen stage.
    const out = parseDirectorOutput('The answer is 42.', nova);
    expect(out.speech).toContain('42');
    expect(out.actions).toHaveLength(1);
    expect(out.actions[0]).toContain(nova.description);
  });

  it('strips separators the model sneaks into a segment so segment count stays honest', () => {
    const out = parseDirectorOutput(`{"speech":"x","actions":["one ${VMP_SEPARATOR} two"]}`, nova);
    expect(out.actions[0]).not.toContain(VMP_SEPARATOR);
  });
});

describe('buildScriptEvent', () => {
  it('sends our exact words plus the planned motion as one Vivix response.create', () => {
    const ev = buildScriptEvent({ speech: 'Hi there', actions: ['Wave.', 'Step left.'] });
    expect(ev.type).toBe('response.create');
    expect(ev.response.script.vocal).toEqual({ type: 'speech', text: 'Hi there' });
    expect(ev.response.script.visual.prompt).toBe(`Wave.${VMP_SEPARATOR}Step left.`);
  });
});

describe('pickVoice', () => {
  it('never gives a woman a male voice or a man a female voice', () => {
    // Why: the user explicitly required at least a gender match.
    for (const age of ['child', 'young', 'middle_aged', 'old']) {
      expect(genderOf(pickVoice({ gender: 'female', age }))).toBe('female');
      expect(genderOf(pickVoice({ gender: 'male', age }))).toBe('male');
    }
  });

  it('prefers an older voice for an older person and uses vibe as a tie-breaker', () => {
    expect(VOICES.find((v) => v.id === pickVoice({ gender: 'male', age: 'old' }))?.age).toBe('old');
    expect(pickVoice({ gender: 'female', age: 'young', vibe: 'energetic' })).toBe('FGY2WhTYpPnrIDTdsKH5'); // Laura
  });

  it('falls back safely on garbage traits', () => {
    expect(VOICES.map((v) => v.id)).toContain(pickVoice({ gender: '???', age: '???' }));
  });
});

describe('catalog', () => {
  it('every preset voice matches its character gender tag', () => {
    for (const c of CHARACTERS) {
      if (c.tags.includes('woman')) expect(genderOf(c.voiceId)).toBe('female');
      if (c.tags.includes('man')) expect(genderOf(c.voiceId)).toBe('male');
    }
  });

  it('search finds characters by tag and unknown ids fall back to the default', () => {
    expect(searchCharacters('fitness').map((c) => c.id)).toEqual(['coach']);
    expect(searchCharacters('').length).toBe(CHARACTERS.length);
    expect(findCharacter('nope').id).toBe('nova');
  });
});

import { SpeechSplitter, SUGGESTIONS_MARKER } from './speechAnswer';

describe('SpeechSplitter (half-body live speech)', () => {
  it('never speaks the suggestions marker even when it arrives split across chunks', () => {
    // Why: anything emitted goes straight to the avatar's mouth.
    const spoken: string[] = [];
    const s = new SpeechSplitter((t) => spoken.push(t));
    for (const c of ['Hola, ', 'esto es la respuesta.', '\n§', '§ ["¿Uno?","¿Dos?","¿Tres?"]']) s.feed(c);
    const out = s.finish();
    expect(spoken.join('')).toBe('Hola, esto es la respuesta.\n');
    expect(spoken.join('')).not.toContain('§');
    expect(out.speech).toBe('Hola, esto es la respuesta.');
    expect(out.suggestions).toEqual(['¿Uno?', '¿Dos?', '¿Tres?']);
  });

  it('speaks everything when the model forgets the marker', () => {
    const spoken: string[] = [];
    const s = new SpeechSplitter((t) => spoken.push(t));
    s.feed('Just an answer');
    expect(s.finish()).toEqual({ speech: 'Just an answer', suggestions: [] });
    expect(spoken.join('')).toBe('Just an answer');
    expect(SUGGESTIONS_MARKER).toBe('§§');
  });
});

import { revealWords, captionTail } from './captions';
import { normalizePrefs } from './characterPrefs';

describe('captions', () => {
  it('reveals words at speaking pace and never more than the line', () => {
    const line = 'one two three four five six';
    expect(revealWords(line, 0)).toBe('');
    expect(revealWords(line, 1000, 2)).toBe('one two');
    expect(revealWords(line, 60_000)).toBe(line);
  });

  it('keeps only the tail of long captions, starting on a word boundary', () => {
    const long = 'word '.repeat(80).trim();
    const tail = captionTail(long, 50);
    expect(tail.startsWith('…word')).toBe(true);
    expect(tail.length).toBeLessThanOrEqual(51);
  });
});

describe('character prefs', () => {
  it('defaults captions ON and full body, and survives garbage', () => {
    // Why: the user asked captions to be on by default and a bad stored value must not break the page.
    expect(normalizePrefs(null)).toEqual({ body: 'full', fullId: null, halfId: null, captions: true });
    expect(normalizePrefs({ body: 'half', halfId: 'liv', captions: false, junk: 1 })).toEqual({ body: 'half', fullId: null, halfId: 'liv', captions: false });
  });
});
