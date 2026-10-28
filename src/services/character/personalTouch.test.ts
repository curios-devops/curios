import { describe, expect, it } from 'vitest';
import { describeMoment, partOfDay } from './personalTouch';

describe('A personal opening for the first answer', () => {
  it('says the whole moment when everything is known — what the presenter weaves into the greeting', () => {
    expect(describeMoment({ name: 'Marcelo', city: 'Barcelona', weather: 'rainy', hour: 9 }))
      .toBe("It's a rainy morning in Barcelona for Marcelo.");
  });

  it('leaves out what is unknown instead of guessing: a guest has no name, a failed lookup no weather or city', () => {
    expect(describeMoment({ name: null, city: '', weather: null, hour: 21 })).toBe("It's evening.");
    expect(describeMoment({ name: null, city: 'Santiago', weather: null, hour: 15 })).toBe("It's afternoon in Santiago.");
  });

  it('reads the day the way people say it, so 3 am is night, not morning', () => {
    expect([partOfDay(3), partOfDay(8), partOfDay(14), partOfDay(20)]).toEqual(['night', 'morning', 'afternoon', 'evening']);
  });
});
