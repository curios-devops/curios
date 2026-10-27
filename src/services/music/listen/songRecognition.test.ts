import { describe, expect, it } from 'vitest';
import { songPage, TRY_AT_MS } from './songRecognition.ts';

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
});
