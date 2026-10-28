// The first answer opens with something personal and of the moment, like a host who knows you:
// the name (signed in), the part of the day, the city and the weather — "a rainy morning in
// Barcelona, Marcelo". Nothing here ever holds an answer back: the city and weather are looked up
// when the conversation starts, the first answer uses whatever is known by then, and weather that
// arrives later is offered to the next answer instead. City and weather: localWeather (shared
// with the Home greeting).
import type { User } from '@supabase/supabase-js';
import { localWeather } from '../../utils/localWeather';
import { getUserFirstName } from '../../utils/userName';

export function partOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 19) return 'afternoon';
  if (hour >= 19 && hour < 23) return 'evening';
  return 'night';
}

/** "It's a rainy morning in Barcelona for Marcelo." — from whatever is known. */
export function describeMoment(m: { name: string | null; city: string; weather: string | null; hour: number }): string {
  const moment = m.weather ? `a ${m.weather} ${partOfDay(m.hour)}` : partOfDay(m.hour);
  return `It's ${moment}${m.city ? ` in ${m.city}` : ''}${m.name ? ` for ${m.name}` : ''}.`;
}

export interface Moment {
  /** First answer: everything known right now. */
  opening: () => string;
  /** A later answer: the weather, once, if it arrived after the first answer. */
  late: () => string | undefined;
}

export function trackMoment(user: User | null | undefined): Moment {
  const name = getUserFirstName(user);
  let city = '';
  let weather: string | null = null;
  let weatherSaid = false;
  void localWeather().then((local) => { city = local.city; weather = local.weather; });
  return {
    opening: () => {
      weatherSaid = Boolean(weather);
      return describeMoment({ name, city, weather, hour: new Date().getHours() });
    },
    late: () => {
      if (weatherSaid || !weather) return undefined;
      weatherSaid = true;
      return `It's ${weather} ${city ? `in ${city} ` : ''}right now.`;
    },
  };
}
