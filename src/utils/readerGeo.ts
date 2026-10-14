// The reader's place, once per visit: IP geolocation from /api/geo (Netlify edge), else the
// time zone's city ("America/Santiago" → "Santiago"; a time zone like Europe/Madrid covers
// all of Spain, so it's only the fallback). Magazine's Local and Terra's DAY/NIGHT use it.
export interface ReaderGeo { city: string; lat: number | null; lng: number | null }

const tzCity = () => (Intl.DateTimeFormat().resolvedOptions().timeZone?.split('/').pop() ?? '').replace(/_/g, ' ');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

let lookup: Promise<ReaderGeo> | null = null;
export const readerGeo = (): Promise<ReaderGeo> => (lookup ??= fetch('/api/geo', { signal: AbortSignal.timeout(2000) })
  .then((r) => r.json() as Promise<{ city?: string; latitude?: number; longitude?: number }>)
  .then((g) => ({ city: g.city || tzCity(), lat: num(g.latitude), lng: num(g.longitude) }))
  .catch(() => ({ city: tzCity(), lat: null, lng: null })));
