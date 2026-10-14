// /api/geo — the reader's city from Netlify's IP geolocation (nothing stored). Magazine's
// Local section needs the real city: a time zone like Europe/Madrid covers all of Spain.
export default async (_request, context) =>
  Response.json(
    { city: context.geo?.city ?? '', country: context.geo?.country?.name ?? '' },
    { headers: { 'Cache-Control': 'private, max-age=3600' } },
  );

export const config = { path: '/api/geo' };
