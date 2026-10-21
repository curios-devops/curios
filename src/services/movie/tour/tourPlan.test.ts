import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase.ts', () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock('../core/llm.ts', () => ({ fetchOpenAI: vi.fn() }));
const { tourKey, validateTourPlan } = await import('./tourPlan.ts');

describe('tourKey', () => {
  it('makes the same tour for the same question however it is typed — a scene costs money, never pay twice', () => {
    expect(tourKey('¿Cómo es el Patio de los Leones?')).toBe(tourKey('cómo es el patio  de los leones'));
  });
});

describe('validateTourPlan', () => {
  it('needs a real scene prompt — without one there is nothing to build', () => {
    expect(validateTourPlan({ title: 'x', scene: '' })).toBeNull();
    expect(validateTourPlan(null)).toBeNull();
  });

  it('caps the prompt at Viggle\'s 1000 characters and keeps 4 follow-ups with their stock search', () => {
    const plan = validateTourPlan({
      title: 'Sagrada Familia', scene: 'Standing in the central nave '.repeat(60), overview: 'Estás en la nave.',
      related: [{ question: '¿Y la cripta?', search: 'crypt' }, 'Otra', { question: 'a' }, { question: 'b' }, { question: 'c' }],
    });
    expect(plan!.prompt.length).toBeLessThanOrEqual(1000);
    expect(plan!.related).toEqual(['¿Y la cripta?', 'Otra', 'a', 'b']);
    expect(plan!.relatedSearch).toEqual(['crypt', '', '', '']);
  });
});
