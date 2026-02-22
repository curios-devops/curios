// Supabase social-share removed: Netlify implementation is canonical.
// Keep a lightweight placeholder to avoid accidental scraping of an outdated endpoint.
export default {
  fetch: () => new Response('This function has been removed. Use the Netlify social-share endpoint.', { status: 410, headers: { 'Content-Type': 'text/plain' } })
};
