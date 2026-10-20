import { describe, expect, it } from 'vitest';
import { captionChunks, captionFit, chunkAt, pickClip, validatePlan } from './cinematicPlan.ts';

const video = (id: number, w: number, h: number, duration: number, fileWidths: number[]) => ({
  id, width: w, height: h, duration, url: `https://pexels.com/video/${id}`, user: { name: `user${id}` },
  video_files: fileWidths.map((fw) => ({ width: fw, height: Math.round((fw * h) / w), link: `https://cdn/${id}/${fw}.mp4`, file_type: 'video/mp4' })),
});

describe('validatePlan', () => {
  const shot = { narration: 'Barcelona wakes up by the sea.', search: 'barcelona aerial' };

  it('rejects a plan too short to make a film (the page then falls back to Video)', () => {
    expect(validatePlan({ title: 't', shots: [shot, shot] })).toBeNull();
    expect(validatePlan({ title: 't' })).toBeNull();
    expect(validatePlan(null)).toBeNull();
  });

  it('drops malformed shots and caps the film at 6 shots', () => {
    const plan = validatePlan({ title: 'x', shots: [shot, { narration: 3 }, ...Array(8).fill(shot)] });
    expect(plan?.shots).toHaveLength(6);
  });

  it('caps narration length so a caption card can never overflow', () => {
    const plan = validatePlan({ title: 'x', shots: Array(3).fill({ narration: 'a '.repeat(500), search: 'q' }) });
    expect(plan!.shots[0].narration.length).toBeLessThanOrEqual(220);
  });
});

describe('pickClip', () => {
  it('prefers landscape HD around 1280px over 4K, and never reuses a clip already in the film', () => {
    const vids = [video(1, 1080, 1920, 10, [1080]), video(2, 3840, 2160, 12, [3840, 1920, 1280]), video(3, 1920, 1080, 8, [1920])];
    const clip = pickClip(vids, new Set());
    expect(clip?.id).toBe(2);
    expect(clip?.width).toBe(1280);
    expect(pickClip(vids, new Set([2]))?.id).toBe(3);
  });

  it('returns null when nothing fits a 16:9 player', () => {
    expect(pickClip([video(1, 1080, 1920, 10, [1080])], new Set())).toBeNull();
  });
});

describe('captionChunks', () => {
  it('never exceeds 2 lines of 42 characters per caption card', () => {
    const text = 'Barcelona is changing fast: new superblocks give streets back to people, while tourism and rents reshape old neighbourhoods.';
    const chunks = captionChunks(text);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(2);
      for (const line of c) expect(line.length).toBeLessThanOrEqual(42);
    }
    expect(chunks.flat().join(' ')).toBe(text);
  });
});

describe('chunkAt', () => {
  it('shows each caption card for a share of the narration proportional to its length', () => {
    const chunks = [['aaaa'], ['bbbb']];
    expect(chunkAt(chunks, 0.1, 4)).toBe(0);
    expect(chunkAt(chunks, 2.5, 4)).toBe(1);
    expect(chunkAt(chunks, 99, 4)).toBe(1);
  });
});

describe('captionFit', () => {
  it('keeps captions readable on a phone: never under 15px, and short enough lines to fit', () => {
    const phone = captionFit(358);
    expect(phone.fontPx).toBe(15);
    expect(phone.maxChars * phone.fontPx * 0.62 + phone.fontPx).toBeLessThanOrEqual(358 * 0.86);
    const desktop = captionFit(1056);
    expect(desktop.fontPx).toBe(30);
    expect(desktop.maxChars).toBeLessThanOrEqual(42);
  });
});
