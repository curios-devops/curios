// The reader's city and current weather in one word (clear, cloudy, foggy, rainy, snowy, stormy),
// looked up once per visit and kept 30 min across reloads: readerGeo + the weather-now edge fn.
// Nothing waits on it — the Home greeting peeks at what is already known, and the Character's
// personal touch uses it once it arrives.
import { supabase } from '../lib/supabase.ts';
import { readerGeo } from './readerGeo.ts';

export interface LocalWeather { city: string; weather: string | null }

const KEY = 'curios_local_weather';
const TTL_MS = 30 * 60 * 1000;

function read(): LocalWeather | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null') as (LocalWeather & { at: number }) | null;
    return saved && Date.now() - saved.at < TTL_MS ? { city: saved.city, weather: saved.weather } : null;
  } catch {
    return null;
  }
}

let known: LocalWeather | null = read();
let lookup: Promise<LocalWeather> | null = known ? Promise.resolve(known) : null;

/** What is known right now (null until the first lookup finishes). */
export const peekLocalWeather = (): LocalWeather | null => known;

export function localWeather(): Promise<LocalWeather> {
  return (lookup ??= (async () => {
    const geo = await readerGeo();
    let weather: string | null = null;
    if (geo.lat != null && geo.lng != null) {
      const { data } = await supabase.functions.invoke('weather-now', { body: { lat: geo.lat, lng: geo.lng } }).catch(() => ({ data: null }));
      weather = typeof data?.weather === 'string' ? data.weather : null;
    }
    known = { city: geo.city, weather };
    try { sessionStorage.setItem(KEY, JSON.stringify({ ...known, at: Date.now() })); } catch { /* storage blocked */ }
    return known;
  })());
}
