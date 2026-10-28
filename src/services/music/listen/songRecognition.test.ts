import { describe, expect, it } from 'vitest';
import { heardPage, songPage, TRY_AT_MS, type HeardSong } from './songRecognition.ts';

describe('Song recognition', () => {
  it('opens the Music page of exactly the song heard, not a free-text search that could land on a cover or the artist', () => {
    const url = new URL(songPage({ title: 'Blinding Lights', artist: 'The Weeknd', album: null, year: null }), 'https://x.test');
    expect(url.pathname).toBe('/music-results');
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'Blinding Lights The Weeknd', kind: 'track', artist: 'The Weeknd', title: 'Blinding Lights' });
  });

  it('carries the album and year Shazam heard, so the page shows VIDA and 2017, not a later remix single or the album year', () => {
    const p = new URL(songPage({ title: 'Despacito', artist: 'Luis Fonsi & Daddy Yankee', album: 'VIDA', year: '2017' }), 'https://x.test').searchParams;
    expect([p.get('album'), p.get('year')]).toEqual(['VIDA', '2017']);
  });

  it('tries early and stops at 12 s — the most a Shazam-style fingerprint needs (longer only makes people wait)', () => {
    expect(TRY_AT_MS[0]).toBeLessThan(TRY_AT_MS[TRY_AT_MS.length - 1]);
    expect(TRY_AT_MS[TRY_AT_MS.length - 1]).toBeLessThanOrEqual(12000);
  });

  describe('Listening in Auto (a song or someone talking)', () => {
    const song = { title: 'Despacito', artist: 'Luis Fonsi & Daddy Yankee', album: 'VIDA', year: '2017' } as HeardSong;

    it('opens the song when one was recognized, even though its lyrics were transcribed too', () => {
      expect(heardPage(song, 'Despacito quiero respirar tu cuello despacito')).toBe(songPage(song));
    });

    it('hands what the person said, word for word, to the Character as their first line', () => {
      const url = new URL(heardPage(null, '¿Por qué el cielo es azul?')!, 'https://x.test');
      expect(url.pathname).toBe('/character');
      expect(url.searchParams.get('q')).toBe('¿Por qué el cielo es azul?');
    });

    it('drops quotes around the whole line — the question shows and is asked as said, not as a quotation', () => {
      expect(new URL(heardPage(null, '"Why do cats purr?"')!, 'https://x.test').searchParams.get('q')).toBe('Why do cats purr?');
    });

    it('opens nothing for sound tags alone — an unnamed song must not start an avatar conversation', () => {
      expect(heardPage(null, '(music) [Música]')).toBeNull();
      expect(heardPage(null, '')).toBeNull();
      expect(heardPage(null, 'Subtítulos realizados por la comunidad de Amara.org')).toBeNull(); // Whisper on noise
    });
  });
});
