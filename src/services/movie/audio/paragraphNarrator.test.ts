import { describe, it, expect } from 'vitest';
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
