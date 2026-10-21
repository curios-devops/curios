import { describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('../../../lib/supabase.ts', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));
vi.mock('../core/llm.ts', () => ({ callMovieLLMJson: vi.fn() }));

const { findClips, findRelatedPosters } = await import('./cinematicPlan.ts');

const plan = {
  related: [] as string[],
  relatedSearch: [] as string[],
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

describe('findRelatedPosters', () => {
  const withImage = (id: number) => ({ ...clip(id), image: `https://poster/${id}.jpg` });
  const scenes = [1, 2].map((id) => ({ narration: 'x', search: 'x', clip: { id, url: '', width: 1280, height: 720, duration: 10, credit: '', pageUrl: '', image: `https://poster/${id}.jpg` } }));

  it('never shows a chapter\'s own clip or the same picture twice in Continue exploring', async () => {
    // Pexels keeps returning the film's clips (1, 2) and one new clip (3).
    invoke.mockImplementation(async (fn: string) => fn === 'pexels-search'
      ? { data: { videos: [withImage(1), withImage(2), withImage(3)] }, error: null }
      : { data: { videos: [{ id: 900, image: 'https://pixabay/900.jpg', width: 1920, height: 1080 }, { id: 901, image: 'https://pixabay/901.jpg', width: 1920, height: 1080 }] }, error: null });
    const posters = await findRelatedPosters({ ...plan, related: ['a', 'b', 'c'], relatedSearch: ['a', 'b', 'c'] }, scenes);
    expect(posters.every(Boolean)).toBe(true);
    expect(new Set(posters).size).toBe(3);
    expect(posters).not.toContain('https://poster/1.jpg');
    expect(posters).not.toContain('https://poster/2.jpg');
  });

  it('prefers the clip that matches the card over a loosely related first result', async () => {
    invoke.mockImplementation(async (fn: string) => fn === 'pexels-search'
      ? { data: { videos: [{ ...withImage(7), url: 'https://www.pexels.com/video/istanbul-skyline-7/' }] }, error: null }
      : { data: { videos: [{ id: 950, image: 'https://pixabay/950.jpg', width: 1920, height: 1080, tags: 'eiffel tower, antenna, radio' }] }, error: null });
    const posters = await findRelatedPosters({ ...plan, related: ['¿Para qué sirven sus antenas?'], relatedSearch: ['Eiffel Tower radio antennas'] }, scenes);
    expect(posters).toEqual(['https://pixabay/950.jpg']);
  });
});
