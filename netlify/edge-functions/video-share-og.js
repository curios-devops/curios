// Social previews for saved videos — the short link /v/:id (and the older /movie/share/:id).
//
// Humans pass straight through to the SPA (MovieSharePage plays the video). Link-preview and search
// crawlers (WhatsApp, X, LinkedIn, Facebook, Googlebot…) get a small page with the video's own Open
// Graph tags: title, the opening line, its picture with a play mark (LinkedIn and others only show the
// picture, so it has to say it is a video) and the video file, for the apps that do play it.
// Any failure falls back to the SPA.

const CRAWLER_REGEX = /bot|crawler|spider|facebookexternalhit|facebot|embedly|quora link preview|whatsapp|slackbot|telegram|pinterest|discord|vkshare|redditbot|linkedinbot|twitterbot|googlebot|bingbot|applebot|duckduckbot|yandex|gptbot|perplexitybot|claudebot|validator/i;
const SITE = 'https://curiosai.com';
const FALLBACK_IMAGE = `${SITE}/curios-og-image-1200x627.png`;
const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') || 'https://gpfccicfqynahflehpqo.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY') || '';

// As in src/services/movie/playMark.ts: a recorded poster already has its mark.
const PLAY_MARK = 'l_text:Arial_460:%E2%97%8F,co_black,o_45/fl_layer_apply,g_center/l_text:Arial_130:%E2%96%B6,co_white/fl_layer_apply,g_center,x_8';
const withPlayMark = (image) =>
  (image.includes('-poster.') || !image.includes('res.cloudinary.com/') ? image : image.replace('/image/upload/', `/image/upload/${PLAY_MARK}/`));

const esc = (text = '') =>
  String(text).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c));

function buildPage(m, id) {
  const title = (m.viral && m.viral.title) || m.title || m.question || 'CuriosAI';
  const full = String((m.viral && m.viral.caption) || m.description || '').replace(/\s+/g, ' ').trim();
  const description = full.length > 160 ? `${full.slice(0, 157)}…` : full;
  const url = `${SITE}/v/${id}`;
  const image = m.thumbnail_url ? withPlayMark(m.thumbnail_url) : FALLBACK_IMAGE;
  const [w, h] = String(m.aspect_ratio || '').split(':').map(Number);
  const [videoW, videoH] = w >= h ? [1280, Math.round((1280 * h) / w)] : [Math.round((1280 * w) / h), 1280];
  const video = m.full_video_url
    ? `<meta property="og:video" content="${esc(m.full_video_url)}"><meta property="og:video:secure_url" content="${esc(m.full_video_url)}"><meta property="og:video:type" content="video/mp4">${w && h ? `<meta property="og:video:width" content="${videoW}"><meta property="og:video:height" content="${videoH}">` : ''}`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(title)} · CuriosAI</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="video.other"><meta property="og:site_name" content="CuriosAI">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${esc(image)}">${video}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(image)}">
</head><body><h1>${esc(title)}</h1><p>${esc(full)}</p><p><a href="${url}">Watch on CuriosAI</a></p></body></html>`;
}

export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const id = url.pathname.replace(/^\/(v|movie\/share)\//, '').split('/')[0];
    const isCrawler = CRAWLER_REGEX.test(request.headers.get('user-agent') || '');
    if (!isCrawler || !/^[0-9a-f-]{36}$/i.test(id) || !SUPABASE_ANON_KEY) return context.next();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/movie_projects?id=eq.${id}&select=title,question,description,thumbnail_url,full_video_url,aspect_ratio,viral&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    const movie = res.ok ? (await res.json())[0] : null;
    if (!movie) return context.next();
    return new Response(buildPage(movie, id), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
    });
  } catch {
    return context.next();
  }
};

export const config = { path: ['/v/*', '/movie/share/*'] };
