import { describe, expect, it } from 'vitest';
import { transcriptDigest, validateClipPlan, validatePick, type Candidate } from './clipPlan.ts';
import { transcriptUntil, validateAnswer } from './clipAsk.ts';
import { belowWatermark } from './clipFrames.ts';
import type { Clip } from './clipPlan.ts';

const lines = (n: number) => Array.from({ length: n }, (_, i) => ({ t: i * 10, d: 9, text: `line ${i}` }));
const candidate: Candidate = { videoId: 'DJLMysTpwhg', title: 'Feynman', channel: 'x', thumbnail: '', url: '', transcript: lines(30) }; // 0..299 s

describe('clip plan', () => {
  it('turns a scene with neither title nor quote into a YouTube search (find-scene needs one of them)', () => {
    const plan = validateClipPlan({ kind: 'scene', searches: ['red pill scene'] }, 'q');
    expect(plan?.kind).toBe('video');
  });

  it('always has something to search on YouTube, the fallback for every clip', () => {
    expect(validateClipPlan({ kind: 'scene', title: 'The Matrix' }, '¿La escena de la pastilla roja?')?.searches).toEqual(['¿La escena de la pastilla roja?']);
  });
});

describe('segment pick', () => {
  it('rejects a video the director invented (only real candidates can be embedded)', () => {
    expect(validatePick({ videoId: 'nope', start: 10, end: 40 }, [candidate])).toBeNull();
  });

  it('keeps the segment inside the video and between 15 and 120 seconds', () => {
    const short = validatePick({ videoId: candidate.videoId, start: 100, end: 102 }, [candidate])!;
    expect(short.end - short.start).toBe(15);
    const long = validatePick({ videoId: candidate.videoId, start: 0, end: 900 }, [candidate])!;
    expect(long.end - long.start).toBeLessThanOrEqual(120);
    const tail = validatePick({ videoId: candidate.videoId, start: 290, end: 330 }, [candidate])!;
    expect(tail.end).toBeLessThanOrEqual(299);
    expect(validatePick({ videoId: candidate.videoId, start: 500, end: 530 }, [candidate])).toBeNull();
  });

  it('reads times written as seconds or as m:ss (the director uses both)', () => {
    const pick = validatePick({ videoId: candidate.videoId, start: '1:05', end: '1:50', moments: [{ t: '2:00', label: 'x' }] }, [candidate])!;
    expect([pick.start, pick.end, pick.moments[0].t]).toEqual([65, 110, 120]);
  });

  it('fits the transcript in the prompt budget', () => {
    expect(transcriptDigest(lines(1000), 500).length).toBeLessThanOrEqual(500);
  });
});

const clip = (fiction: boolean): Clip => ({
  id: 'c', question: 'q', source: 'youtube', videoId: 'DJLMysTpwhg', start: 0, end: 60, title: 't', credit: 'c', sourceUrl: '',
  thumbnail: '', why: '', overview: '', fiction, moments: [], transcript: lines(30), related: [],
});

describe('talking to the clip', () => {
  it('never puts words in a real person\'s mouth: their answers are narrated over illustrations', () => {
    const raw = { answer: 'Porque el fuego libera la luz del sol.', voice: 'character', shots: [{ prompt: 'p', line: 'I say this', imagePrompt: 'tree in sunlight' }] };
    const plan = validateAnswer(raw, false)!;
    expect(plan.voice).toBe('narrator');
    expect(plan.shots[0].line).toBe('');
  });

  it('lets a fictional character answer in the scene, at most 3 shots', () => {
    const shots = Array.from({ length: 5 }, () => ({ prompt: 'Sheldon keeps explaining', line: 'Spock vaporizes rock.' }));
    const plan = validateAnswer({ answer: 'Spock vaporizes rock.', voice: 'character', shots }, true)!;
    expect(plan.voice).toBe('character');
    expect(plan.shots).toHaveLength(3);
  });

  it('only shows the director what was said up to the pause (no spoilers)', () => {
    expect(transcriptUntil(clip(false), 45).every((l) => l.t <= 45)).toBe(true);
    expect(transcriptUntil(clip(false), 45)).toHaveLength(5);
  });

  it('crops find-scene\'s top-left watermark away and keeps a 16:9 frame', () => {
    const r = belowWatermark(1916, 1080);
    expect(r.top).toBeGreaterThanOrEqual(108);
    expect(r.top + r.height).toBe(1080);
    expect(Math.abs(r.width / r.height - 16 / 9)).toBeLessThan(0.01);
  });
});
