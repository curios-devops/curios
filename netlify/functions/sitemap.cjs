// Dynamic sitemap of public Curiosity nodes — served at /sitemap.xml (via _redirects).
// Lists every shared node so search + AI crawlers can discover and index them.

const SITE = 'https://curiosai.com';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gpfccicfqynahflehpqo.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const STATIC_PATHS = ['/', '/explore', '/feed'];

exports.handler = async () => {
  const topicSlug = (t) => String(t).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  let nodes = [];
  try {
    if (SUPABASE_ANON_KEY) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/curiosity_nodes?is_public=eq.true&select=share_slug,updated_at,topics&order=updated_at.desc&limit=5000`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
      );
      if (res.ok) nodes = await res.json();
    }
  } catch {
    nodes = [];
  }

  const topics = new Set();
  for (const n of nodes) {
    if (Array.isArray(n.topics)) n.topics.forEach((t) => { const s = topicSlug(t); if (s) topics.add(s); });
  }

  const urls = [
    ...STATIC_PATHS.map((p) => `<url><loc>${SITE}${p}</loc></url>`),
    ...nodes
      .filter((n) => n.share_slug)
      .map((n) => {
        const lastmod = n.updated_at ? `<lastmod>${new Date(n.updated_at).toISOString()}</lastmod>` : '';
        return `<url><loc>${SITE}/s/${n.share_slug}</loc>${lastmod}<changefreq>weekly</changefreq></url>`;
      }),
    ...[...topics].map((s) => `<url><loc>${SITE}/topic/${s}</loc><changefreq>weekly</changefreq></url>`),
  ].join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    body: xml,
  };
};
