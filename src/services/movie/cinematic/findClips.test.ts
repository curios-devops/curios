import { describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('../../../lib/supabase.ts', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));
vi.mock('../core/llm.ts', () => ({ callMovieLLMJson: vi.fn() }));

const { findClips } = await import('./cinematicPlan.ts');

const plan = {
  title: 'Barcelona',
  shots: ['barcelona aerial city', 'sagrada familia facade', 'barceloneta beach', 'las ramblas crowd'].map((search) => ({ narration: `About ${search}.`, search })),
};
const clip = (id: number) => ({
  id, width: 1920, height: 1080, duration: 12, url: `https://pexels.com/video/${id}`, user: { name: 'x' },
  video_files: [{ width: 1280, height: 720, link: `https://cdn/${id}.mp4`, file_type: 'video/mp4' }],
});

describe('findClips', () => {
  it('fails (so the page falls back to Video) instead of showing a film of unrelated or missing footage', async () => {
    invoke.mockResolvedValue({ data: { videos: [] }, error: null });
    await expect(findClips(plan)).rejects.toThrow(/footage/);
  });

  it('gives every shot its own clip when the footage exists', async () => {
    let n = 0;
    invoke.mockImplementation(async () => ({ data: { videos: [clip(++n)] }, error: null }));
    const scenes = await findClips(plan);
    expect(new Set(scenes.map((s) => s.clip.id)).size).toBe(4);
  });

  it('lets a shot with no footage borrow another shot\'s clip when most shots have their own', async () => {
    let n = 0;
    invoke.mockImplementation(async (_fn: string, { body }: { body: { query: string } }) =>
      ({ data: { videos: /ramblas|las/.test(body.query) ? [] : [clip(++n)] }, error: null }));
    const scenes = await findClips(plan);
    expect(scenes).toHaveLength(4);
    expect(scenes[3].clip).toBeTruthy();
  });
});
