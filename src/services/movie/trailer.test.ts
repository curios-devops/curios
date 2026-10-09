import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockVideos: Array<{ url: string; title: string; thumbnail?: string }> = [];
vi.mock('../search/providers/mediaSearchProvider', () => ({
  searchVideos: async () => mockVideos,
}));

import { findMovieTrailer, youTubeId } from './trailer.ts';

describe('youTubeId', () => {
  it('reads the id from every YouTube URL shape Brave returns', () => {
    expect(youTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youTubeId('https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('rejects non-YouTube hosts (they cannot be embedded)', () => {
    expect(youTubeId('https://vimeo.com/123456')).toBeNull();
  });
});

describe('findMovieTrailer', () => {
  beforeEach(() => { mockVideos = []; });

  // The trailer is the point of Movie mode: prefer an embeddable YouTube result even if it isn't first.
  it('embeds the first YouTube trailer, skipping non-embeddable results', async () => {
    mockVideos = [
      { url: 'https://www.imdb.com/video/vi1', title: 'IMDb', thumbnail: 'https://img/imdb.jpg' },
      { url: 'https://www.youtube.com/watch?v=abcdefghijk', title: 'Official Trailer' },
    ];
    const t = await findMovieTrailer('Star Wars');
    expect(t.embedUrl).toContain('youtube-nocookie.com/embed/abcdefghijk');
    expect(t.coverUrl).toBe('https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
  });

  // No trailer must still give the page a cover instead of an empty player.
  it('falls back to a cover image when no YouTube trailer exists', async () => {
    mockVideos = [{ url: 'https://www.imdb.com/video/vi1', title: 'IMDb', thumbnail: 'https://img/imdb.jpg' }];
    expect(await findMovieTrailer('Star Wars')).toEqual({ embedUrl: null, coverUrl: 'https://img/imdb.jpg' });
  });

  it('returns nothing when search finds nothing (the page keeps its normal viewer)', async () => {
    expect(await findMovieTrailer('Star Wars')).toEqual({ embedUrl: null, coverUrl: null });
  });
});
