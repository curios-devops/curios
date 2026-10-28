import { describe, expect, it } from 'vitest';
import { videoSize } from './recorder.ts';

describe('videoSize', () => {
  // The saved video keeps the player's shape: a phone's portrait player gives a TikTok-shaped video.
  it('keeps the player shape with 1280 on the long side', () => {
    expect(videoSize(640, 360)).toEqual({ w: 1280, h: 720 });
    expect(videoSize(360, 640)).toEqual({ w: 720, h: 1280 });
  });

  // H.264 needs even sizes; an odd one makes the recording fail on some phones.
  it('always gives even sizes', () => {
    const { w, h } = videoSize(358, 637);
    expect(w % 2).toBe(0);
    expect(h % 2).toBe(0);
  });
});
