// The first answer opens with something personal and of the moment, like a host who knows you:
// the name (signed in), the part of the day, the city and the weather — "a rainy morning in
// Barcelona, Marcelo". Open-Meteo needs no key. Anything missing is simply left out, and the
// whole lookup gives up after 1.5 s so it never holds the answer back.
import type { User } from '@supabase/supabase-js';
import { readerGeo } from '../../utils/readerGeo';
import { getUserFirstName } from '../../utils/userName';

/** WMO weather code (Open-Meteo) → a word the answer can use. */
export function weatherWord(code: number): string | null {
  if (code === 0) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'foggy';
  if (code >= 51 && code <= 67) return 'rainy';
  if (code >= 71 && code <= 77) return 'snowy';
  if (code >= 80 && code <= 82) return 'rainy';
  if (code >= 85 && code <= 86) return 'snowy';
  if (code >= 95) return 'stormy';
  return null;
}

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

async function weatherNow(lat: number, lng: number): Promise<string | null> {
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weather_code`, { signal: AbortSignal.timeout(1500) });
  const code = (await r.json())?.current?.weather_code;
  return typeof code === 'number' ? weatherWord(code) : null;
}

export async function personalTouch(user: User | null | undefined): Promise<string> {
  const lookup = (async () => {
    const geo = await readerGeo();
    const weather = geo.lat != null && geo.lng != null ? await weatherNow(geo.lat, geo.lng).catch(() => null) : null;
    return { city: geo.city, weather };
  })();
  const late = new Promise<{ city: string; weather: string | null }>((resolve) => setTimeout(() => resolve({ city: '', weather: null }), 1500));
  const { city, weather } = await Promise.race([lookup, late]);
  return describeMoment({ name: getUserFirstName(user), city, weather, hour: new Date().getHours() });
}
