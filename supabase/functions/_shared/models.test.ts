import { describe, expect, it } from 'vitest';
import { modelsFrom, tierOf } from './models.ts';

const models = (vars: Record<string, string>) => modelsFrom((name) => vars[name]);

describe('modelsFrom', () => {
  it('pairs each OpenAI model with its Claude fallback, as the tiers were agreed', () => {
    const m = models({ CLAUDE_API_KEY: 'k' });
    expect([m.claude('luna'), m.openai('luna')]).toEqual(['claude-haiku-5-5', 'gpt-6-luna']);
    expect([m.claude('sol'), m.openai('sol')]).toEqual(['claude-sonnet-5-5', 'gpt-6.1-sol']);
    expect([m.claude('astra'), m.openai('astra')]).toEqual(['claude-opus-5-5', 'gpt-6-astra']);
  });

  it('takes the ids from the environment, so a new version needs no code', () => {
    expect(models({ CLAUDE_API_KEY: 'k', MODEL_HAIKU: 'claude-haiku-6' }).claude('luna')).toBe('claude-haiku-6');
    expect(models({ MODEL_SOL: 'gpt-7-sol' }).openai('sol')).toBe('gpt-7-sol');
  });

  it('has no fallback without the key, instead of calling Claude with nothing', () => {
    expect(models({}).claude('luna')).toBeNull();
  });

  it('turns the fallback off for one tier with OFF, leaving the others', () => {
    const m = models({ CLAUDE_API_KEY: 'k', MODEL_HAIKU: 'OFF' });
    expect(m.claude('luna')).toBeNull();
    expect(m.claude('sol')).toBe('claude-sonnet-5-5');
  });
});

describe('tierOf', () => {
  it('finds the tier of a stored model of either provider', () => {
    expect(['claude-haiku-5-5', 'gpt-6-luna', 'claude-sonnet-5-5', 'gpt-6.1-sol', 'claude-opus-5-5', 'gpt-6-astra'].map(tierOf))
      .toEqual(['luna', 'luna', 'sol', 'sol', 'astra', 'astra']);
  });
});
