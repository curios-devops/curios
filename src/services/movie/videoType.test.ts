import { describe, expect, it } from 'vitest';
import { movieModeFor, parseVideoType, VIDEO_TYPES } from './videoType.ts';

describe('video type', () => {
  it('treats a missing or unknown ?type= as Auto (Decisions picks)', () => {
    expect(parseVideoType(null)).toBe('auto');
    expect(parseVideoType('sora')).toBe('auto');
    expect(parseVideoType('cinematic')).toBe('cinematic');
  });

  it('sends old ?type=explore links to the 360 Tour, and no longer offers HD (it is Mejorar now)', () => {
    expect(parseVideoType('explore')).toBe('tour');
    expect(parseVideoType('hd')).toBe('auto');
    expect(VIDEO_TYPES.map((v) => v.id)).not.toContain('hd');
  });

  it('opens ?type=immersion (and the older experience/tour links) as Immersion, and ?type=clip as Clips', () => {
    expect(parseVideoType('immersion')).toBe('tour');
    expect(parseVideoType('experience')).toBe('tour');
    expect(parseVideoType('tour')).toBe('tour');
    expect(parseVideoType('clip')).toBe('clip');
  });

  it('makes Animation with the generated-video pipeline in the Cartoon style', () => {
    expect(movieModeFor('animation')).toBe('cartoon');
    expect(movieModeFor('video')).toBeUndefined();
  });
});
