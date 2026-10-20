import { describe, expect, it } from 'vitest';
import { movieModeFor, parseVideoType, resolveVideoType } from './videoType.ts';

describe('video type', () => {
  it('treats a missing or unknown ?type= as Auto (Decisions picks)', () => {
    expect(parseVideoType(null)).toBe('auto');
    expect(parseVideoType('sora')).toBe('auto');
    expect(parseVideoType('cinematic')).toBe('cinematic');
  });

  it('never passes an ordinary clip off as a world model: Explore falls back to Video with a notice', () => {
    const r = resolveVideoType('explore');
    expect(r.type).toBe('video');
    expect(r.notice).toBeTruthy();
    expect(resolveVideoType('cinematic')).toEqual({ type: 'cinematic' });
  });

  it('makes Animation with the generated-video pipeline in the Cartoon style', () => {
    expect(movieModeFor('animation')).toBe('cartoon');
    expect(movieModeFor('video')).toBeUndefined();
  });
});
