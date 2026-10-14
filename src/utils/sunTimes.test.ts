import { describe, it, expect } from 'vitest';
import { sunTimes, isDaytime } from './sunTimes';

// Terra switches DAY/NIGHT at the reader's real sunrise and sunset — a wrong formula would
// flip the whole app to dark in the afternoon.
describe('sunTimes', () => {
  const BCN = { lat: 41.39, lng: 2.17 };
  const minutes = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();

  it('matches Barcelona on 14 Oct 2026 (sunrise ≈ 06:05 UTC, sunset ≈ 17:15 UTC)', () => {
    const sun = sunTimes(new Date(Date.UTC(2026, 9, 14, 12)), BCN.lat, BCN.lng)!;
    expect(Math.abs(minutes(sun.sunrise) - (6 * 60 + 5))).toBeLessThanOrEqual(6);
    expect(Math.abs(minutes(sun.sunset) - (17 * 60 + 15))).toBeLessThanOrEqual(6);
  });

  it('is day at noon and night at midnight there', () => {
    expect(isDaytime(new Date(Date.UTC(2026, 9, 14, 12)), BCN.lat, BCN.lng)).toBe(true);
    expect(isDaytime(new Date(Date.UTC(2026, 9, 14, 22)), BCN.lat, BCN.lng)).toBe(false);
  });

  it('has no sunrise in polar night (Tromsø, December)', () => {
    expect(sunTimes(new Date(Date.UTC(2026, 11, 21, 12)), 69.65, 18.96)).toBeNull();
  });
});
