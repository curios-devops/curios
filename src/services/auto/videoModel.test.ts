import { describe, expect, it } from 'vitest';
import { pickVideoModel } from './modelTier.ts';

const models = { router: true, luna: 'luna', sol: 'sol', astra: 'astra', deep: 'deep' } as const;

describe('pickVideoModel', () => {
  it('answers easy and medium video questions with Luna (fast, cheapest)', () => {
    expect(pickVideoModel('easy', false, models as never)).toBe('luna');
    expect(pickVideoModel('normal', true, models as never)).toBe('luna');
    expect(pickVideoModel(null, false, models as never)).toBe('luna');
  });

  it('keeps Astra for Premium accounts; everyone else gets Sol on complex questions', () => {
    expect(pickVideoModel('complex', true, models as never)).toBe('astra');
    expect(pickVideoModel('complex', false, models as never)).toBe('sol');
  });

  it('uses Sol for everything when the model router is off', () => {
    expect(pickVideoModel('easy', false, { ...models, router: false } as never)).toBe('sol');
  });
});
