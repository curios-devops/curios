import { describe, it, expect, vi } from 'vitest';
import { toParagraphs } from './paragraphNarrator';

describe('toParagraphs (narration chunks)', () => {
  // The first audio must be short so playback starts fast; the rest streams per paragraph.
  it('reads the first sentence alone, then the rest of each paragraph', () => {
    const md = 'Primera frase. Segunda frase del primer párrafo.\n\nSegundo párrafo entero.';
    expect(toParagraphs(md)).toEqual(['Primera frase.', 'Segunda frase del primer párrafo.', 'Segundo párrafo entero.']);
  });

  // Markdown symbols would be read aloud ("asterisco") if they reached the TTS.
  it('strips markdown and links before speaking', () => {
    expect(toParagraphs('*El show de Truman* ve [IMDb](https://imdb.com)')).toEqual(['El show de Truman ve IMDb']);
  });

  it('keeps a single-sentence paragraph whole', () => {
    expect(toParagraphs('Solo una frase.')).toEqual(['Solo una frase.']);
  });
});

describe('ParagraphNarrator audio session (iOS silent switch)', () => {
  // Without these, iOS keeps Web Audio in the "ambient" session: the silent switch mutes
  // the narration, and it was only heard after the user unmuted the trailer video.
  it('requests the playback session and keeps a silent <audio> playing until stop()', async () => {
    const { ParagraphNarrator } = await import('./paragraphNarrator');
    const audioSession = { type: 'auto' };
    const played: { loop: boolean; paused: boolean; src: string }[] = [];
    vi.stubGlobal('navigator', { audioSession });
    vi.stubGlobal('Audio', class {
      loop = false; paused = true;
      constructor(public src: string) { played.push(this); }
      play() { this.paused = false; return Promise.resolve(); }
      pause() { this.paused = true; }
    });
    vi.stubGlobal('window', { AudioContext: class { state = 'running'; resume() { return Promise.resolve(); } close() { return Promise.resolve(); } } });

    const n = new ParagraphNarrator(['Hola.'], 'v', 'female', () => {});
    expect(audioSession.type).toBe('playback');
    expect(played).toHaveLength(1);
    expect(played[0]).toMatchObject({ loop: true, paused: false });
    expect(played[0].src).toMatch(/^blob:/);

    n.stop();
    expect(played[0].paused).toBe(true);
    vi.unstubAllGlobals();
  });
});
