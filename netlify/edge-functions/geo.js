// /api/geo — the reader's city and coordinates from Netlify's IP geolocation (nothing stored).
// Magazine's Local needs the real city (Europe/Madrid covers all of Spain); Terra's
// automatic DAY / NIGHT needs the coordinates for sunrise and sunset.
export default async (_request, context) =>
  Response.json(
    {
      city: context.geo?.city ?? '',
      country: context.geo?.country?.name ?? '',
      latitude: context.geo?.latitude ?? null,
      longitude: context.geo?.longitude ?? null,
    },
    { headers: { 'Cache-Control': 'private, max-age=3600' } },
  );

export const config = { path: '/api/geo' };
