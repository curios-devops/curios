// Sunrise / sunset (the standard sunrise equation, ±2 min) — Terra's automatic DAY / NIGHT.
const RAD = Math.PI / 180;
const J1970 = 2440587.5;
const J2000 = 2451545;

/** Today's sunrise and sunset at a place; null during polar day or night. */
export function sunTimes(date: Date, lat: number, lng: number): { sunrise: Date; sunset: Date } | null {
  const n = Math.round(date.getTime() / 86400000 + J1970 - J2000 + 0.0008 - lng / 360);
  const jStar = n - lng / 360;
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const transit = J2000 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const sinDec = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosW = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
  if (cosW < -1 || cosW > 1) return null;
  const w = Math.acos(cosW) / RAD / 360;
  const toDate = (j: number) => new Date((j - J1970) * 86400000);
  return { sunrise: toDate(transit - w), sunset: toDate(transit + w) };
}

/** Is it daytime? By the sun when the place is known, else 07:00–20:00 local. */
export function isDaytime(now: Date, lat: number | null, lng: number | null): boolean {
  const sun = lat !== null && lng !== null ? sunTimes(now, lat, lng) : null;
  if (sun) return now >= sun.sunrise && now < sun.sunset;
  const h = now.getHours();
  return h >= 7 && h < 20;
}
