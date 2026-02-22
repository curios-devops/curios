// Simple Netlify Function for LinkedIn Sharing (refactored)
exports.handler = async (event) => {
  // Helper: decode query params safely
  const getParam = (name, fallback = '') => {
    const raw = event.queryStringParameters?.[name];
    if (!raw) return fallback;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  };

  // Get query parameters
  const query = getParam('query', 'CuriosAI - AI-Powered Search');
  const snippet = getParam('snippet', 'Get comprehensive AI-powered search results with insights, analysis, and curated information from multiple sources.');
  const image = getParam('image', '');

  // Simple bot detection
  const userAgent = event.headers['user-agent'] || '';
  const isBot = /linkedinbot|facebookexternalhit|twitterbot|whatsapp|bot|crawler|spider|LinkedInBot/i.test(userAgent);

  console.log('🔍 Share Function Debug:');
  console.log('- Bot detected:', isBot);
  console.log('- User Agent:', userAgent);
  console.log('- Query:', query);
  console.log('- Snippet length:', snippet.length);
  console.log('- Snippet preview:', snippet.substring(0, 140) + (snippet.length > 140 ? '…' : ''));

  // Redirect humans to search page
  if (!isBot) {
    return {
      statusCode: 302,
      headers: {
        'Location': `https://curiosai.com/search?q=${encodeURIComponent(query)}`,
        'Cache-Control': 'no-cache'
      }
    };
  }

  // Simple HTML sanitization
  const escapeHtml = (text) =>
    (text || '').replace(/[<>&"']/g, (c) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;'
    }[c] || c));

  // Build safe title (prefer concise)
  const rawTitle = (query || '').trim();
  let safeTitle = escapeHtml(rawTitle.slice(0, 100));
  if (rawTitle.length > 100) safeTitle += '…';

  // Build a LinkedIn-friendly description prioritizing the snippet (distinct from title)
  const targetMax = 200; // LinkedIn truncates around this length
  const minIdeal = 70;
  const q = (query || '').trim();
  const s = (snippet || '').trim();

  // Prefer the first sentence of the snippet if available
  const firstSentence = s.split(/[.!?]+/).map(t => t.trim()).filter(Boolean)[0] || '';
  let desc = firstSentence || s;
  if (desc.length > targetMax) desc = desc.slice(0, 197) + '…';
  if (!desc) {
    // Fallback: use query and a short tagline when no snippet
    desc = q.slice(0, Math.min(120, q.length));
    if (q.length > desc.length) desc += '…';
    const tagline = ' — Discover insights with CuriosAI';
    if (desc.length < minIdeal && desc.length + tagline.length <= targetMax) {
      desc += tagline;
    }
  } else if (desc.length < minIdeal) {
    // Lightly enhance too-short snippets
    const add = ' Discover insights with CuriosAI';
    if (desc.length + add.length <= targetMax) desc += add;
  }

  const safeDescription = escapeHtml(desc);

  // Use canonical site base to avoid malformed Host headers from proxies.
  // Keep this hard-coded to ensure scrapers always receive a valid absolute URL.
  const base = 'https://curiosai.com';

  // Use provided image or fall back to a static site asset (Supabase OG image removed)
  // Static fallback ensures crawlers still see an image after Supabase removal.
  const ogImage = image || `${base}/curiosai-og-image-1200x627.png`;

  // Generate share URL (canonical for crawlers)
  // Use direct Netlify function path (hotfix) to avoid accidental Supabase proxy/stale responses.
  const shareUrl = `${base}/.netlify/functions/social-share?query=${encodeURIComponent(q)}&snippet=${encodeURIComponent(s)}${image ? `&image=${encodeURIComponent(image)}` : ''}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>

  <!-- Primary Meta -->
  <meta name="description" content="${safeDescription}" />
  <!-- Combined name+property tags as per LinkedIn Inspector guidance -->
  <meta name="title" property="og:title" content="${safeTitle}" />
  <meta name="description" property="og:description" content="${safeDescription}" />

  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:alt" content="CuriosAI preview image for: ${safeTitle}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="627" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="CuriosAI" />

  <!-- Twitter Card - Twitter-specific tags (isolated from Open Graph for LinkedIn) -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@CuriosAI" />
  <meta name="twitter:creator" content="@CuriosAI" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta name="twitter:image:alt" content="CuriosAI Search: ${safeTitle}" />

  <link rel="canonical" href="${shareUrl}" />
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
    <h1 style="color: #0095FF; margin-bottom: 20px;">CuriosAI</h1>
    <h2 style="color: #333; margin-bottom: 16px;">${safeTitle}</h2>
    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">${safeDescription}</p>
    <a href="https://curiosai.com/search?q=${encodeURIComponent(q)}" style="background: #0095FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">Explore More with CuriosAI</a>
  </div>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    },
    body: html
  };
};
