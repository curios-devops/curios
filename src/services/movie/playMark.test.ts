import { describe, expect, it } from 'vitest';
import { withPlayMark } from './playMark.ts';

describe('withPlayMark', () => {
  it('marks a cover, so a LinkedIn reader can tell the link is a video', () => {
    expect(withPlayMark('https://res.cloudinary.com/x/image/upload/v1/frames/a.jpg')).toMatch(/^https:\/\/res\.cloudinary\.com\/x\/image\/upload\/l_text:.+\/v1\/frames\/a\.jpg$/);
  });

  it("doesn't draw a second mark on a recorded poster", () => {
    const poster = 'https://res.cloudinary.com/x/image/upload/v1/animations/render-1-poster.jpg';
    expect(withPlayMark(poster)).toBe(poster);
  });

  it("leaves pictures Cloudinary doesn't serve as they are", () => {
    expect(withPlayMark('https://image.tmdb.org/a.jpg')).toBe('https://image.tmdb.org/a.jpg');
  });

  it('is nothing without a picture: the share falls back to the site card', () => {
    expect(withPlayMark(null)).toBeUndefined();
  });
});
