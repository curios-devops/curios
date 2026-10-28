import { describe, expect, it, vi } from 'vitest';
import { answerLanguage, listenLanguage } from './language';

vi.stubGlobal('navigator', { language: 'pt-BR' });

describe('Which language to answer and listen in', () => {
  it('answers in the language the question was asked in when Auto Detect is on, even if the app is set to another', () => {
    expect(answerLanguage('en', true, 'es')).toBe('en');
  });

  it("falls back to the app's language when the question's language could not be told", () => {
    expect(answerLanguage(null, true, 'es')).toBe('es');
  });

  it("uses the browser's language only when the app has none", () => {
    expect(answerLanguage(null, true, null)).toBe('pt');
  });

  it("keeps the app's language when Auto Detect is off — the user chose it", () => {
    expect(answerLanguage('en', false, 'es')).toBe('es');
  });

  it('lets speech-to-text detect the spoken language with Auto Detect on, instead of forcing one that may be wrong', () => {
    expect(listenLanguage(true, 'es')).toBe('auto');
    expect(listenLanguage(false, 'es')).toBe('es');
  });
});
