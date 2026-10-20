import { describe, expect, it } from 'vitest';
import { pickVideoModel, stepUp } from './modelTier.ts';

const models = { router: true, luna: 'luna', sol: 'sol', astra: 'astra', deep: 'deep' } as const;

describe('pickVideoModel', () => {
  it('answers easy and medium video questions with Luna (fast, cheapest)', () => {
    expect(pickVideoModel('easy', models as never)).toBe('luna');
    expect(pickVideoModel('normal', models as never)).toBe('luna');
    expect(pickVideoModel(null, models as never)).toBe('luna');
  });

  it('never starts on Astra: complex questions get Sol; Astra only via the HD step-up', () => {
    expect(pickVideoModel('complex', models as never)).toBe('sol');
    expect(stepUp('sol', models as never)).toBe('astra');
    expect(stepUp('luna', models as never)).toBe('sol');
  });

  it('uses Sol for everything when the model router is off', () => {
    expect(pickVideoModel('easy', { ...models, router: false } as never)).toBe('sol');
  });
});
