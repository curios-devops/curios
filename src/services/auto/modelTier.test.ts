import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/supabase.ts', () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import { pickAnswerModel } from './modelTier.ts';

const models = {
  router: true,
  luna: 'luna-model',
  sol: 'sol-model',
  astra: 'astra-model',
  deep: 'deep-model',
  utility: 'utility-model',
  image: 'image-model',
};
const yes = vi.fn(async () => true);
const no = vi.fn(async () => false);

describe('pickAnswerModel (Luna / Sol / Astra routing)', () => {
  // The cheap model must handle easy questions and Sol the everyday ones — and neither may
  // touch the user's Pro credits.
  it('easy → Luna, normal → Sol, with no credit spent', async () => {
    const spend = vi.fn(async () => true);
    expect(await pickAnswerModel('easy', spend, models)).toEqual({ model: 'luna-model', tier: 'easy', astraBlocked: false });
    expect(await pickAnswerModel('normal', spend, models)).toEqual({ model: 'sol-model', tier: 'normal', astraBlocked: false });
    expect(spend).not.toHaveBeenCalled();
  });

  // Astra is the paid tier: it is only used when a credit was actually spent.
  it('complex → Astra when a credit is spent', async () => {
    expect(await pickAnswerModel('complex', yes, models)).toEqual({ model: 'astra-model', tier: 'complex', astraBlocked: false });
  });

  // Out of credits must never block the answer: Sol answers and the UI is told to offer the upgrade.
  it('complex without credits → Sol, flagged so the upgrade notice shows', async () => {
    expect(await pickAnswerModel('complex', no, models)).toEqual({ model: 'sol-model', tier: 'complex', astraBlocked: true });
  });

  // A failed/slow difficulty rating must not cost the user anything — default to Sol.
  it('unknown tier → Sol without spending', async () => {
    const spend = vi.fn(async () => true);
    expect((await pickAnswerModel(null, spend, models)).model).toBe('sol-model');
    expect(spend).not.toHaveBeenCalled();
  });

  // MODEL_ROUTER = OFF in app-settings.md means "always Sol" — even for complex questions.
  it('router OFF → always Sol, never charges', async () => {
    const spend = vi.fn(async () => true);
    const off = { ...models, router: false };
    expect((await pickAnswerModel('complex', spend, off)).model).toBe('sol-model');
    expect((await pickAnswerModel('easy', spend, off)).model).toBe('sol-model');
    expect(spend).not.toHaveBeenCalled();
  });
});
