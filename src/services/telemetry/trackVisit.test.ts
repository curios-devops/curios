import { describe, it, expect } from 'vitest';
import { featureOf } from './trackVisit.ts';

// /tele's "visits by feature" is only as good as this mapping: each mode's pages must land in
// its own bucket, and the Made with AI catalog must not be counted as games.
describe('featureOf', () => {
  it('maps every mode to its feature', () => {
    expect(featureOf('/')).toBe('home');
    expect(featureOf('/fast-search')).toBe('search');
    expect(featureOf('/movie-results')).toBe('movies');
    expect(featureOf('/movie/share/abc')).toBe('movies');
    expect(featureOf('/music-results')).toBe('music');
    expect(featureOf('/song/123')).toBe('music');
    expect(featureOf('/games-results')).toBe('games');
    expect(featureOf('/arcade/42')).toBe('games');
    expect(featureOf('/stories-results')).toBe('stories');
    expect(featureOf('/character')).toBe('character');
  });

  it('keeps the Made with AI catalog apart from playing a game', () => {
    expect(featureOf('/arcade')).toBe('made-with-ai');
  });

  it('anything unknown is "other", never dropped', () => {
    expect(featureOf('/settings')).toBe('other');
  });
});
