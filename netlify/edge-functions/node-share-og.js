// Edge OG for Curiosity Share links — path /s/:slug.
// Humans pass straight through to the SPA (NodeSharePage renders the snapshot).
// Social crawlers get server-rendered Open Graph tags built from the node, so a
// short link like https://curiosai.com/s/<slug> still unfurls a rich preview.
// Any failure falls back to serving the SPA — a broken preview never breaks the page.

const BOT_REGEX = /linkedinbot|facebookexternalhit|facebookbot|twitterbot|whatsapp|whatsappbot|slackbot|telegrambot|bot|crawler|spider|facebot|embedly|quora link preview|pinterest|redditbot|discordbot|bingbot|googlebot/i;
const FALLBACK_IMAGE = 'https://curiosai.com/curios-og-image-1200x627.png';
const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') || 'https://gpfccicfqynahflehpqo.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY') || '';

const escapeHtml = (text = '') =>
  text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c));

function ogHtml({ title, description, image, shareUrl }) {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:secure_url" content="${image}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="627" />
<meta property="og:url" content="${shareUrl}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="CuriosAI" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
<link rel="canonical" href="${shareUrl}" />
</head><body><h1>${title}</h1><p>${description}</p></body></html>`;
}

export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\/s\//, '').split('/')[0];
    const ua = request.headers.get('user-agent') || '';
    const isBot = BOT_REGEX.test(ua);

    // Humans (and anything we can't classify) get the real app.
    if (!isBot || !slug || !SUPABASE_ANON_KEY) return context.next();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/curiosity_nodes?share_slug=eq.${encodeURIComponent(slug)}&select=query,short_summary,answer,cover_image,images&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    const rows = res.ok ? await res.json() : [];
    const node = rows[0];
    if (!node) return context.next();

    const title = escapeHtml((node.query || 'CuriosAI').slice(0, 100));
    const description = escapeHtml((node.short_summary || node.answer || '').replace(/[#*`>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)) || 'Discover insights with CuriosAI';
    const image = node.cover_image || node.images?.[0]?.url || FALLBACK_IMAGE;
    const shareUrl = `https://curiosai.com/s/${slug}`;

    return new Response(ogHtml({ title, description, image, shareUrl }), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  } catch {
    return context.next();
  }
};

export const config = { path: '/s/*' };
