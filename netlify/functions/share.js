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

  // Build a LinkedIn-friendly description by merging query + snippet
  // Target ~200 chars (LinkedIn truncates around this length)
  const targetMax = 200;
  const minQueryReserve = 60; // keep at most 60-80 chars of query for balance
  const maxQueryReserve = 80;
  const q = (query || '').trim();
  const s = (snippet || '').trim();

  // Trim query to a balanced size first
  let qTrim = q.slice(0, Math.min(Math.max(minQueryReserve, Math.ceil(targetMax * 0.35)), maxQueryReserve));
  if (q.length > qTrim.length) qTrim += '…';

  // Now allocate remaining for snippet
  const separator = ' — ';
  let remaining = targetMax - (qTrim.length + separator.length);
  if (remaining < 0) remaining = 0;
  let sTrim = s.slice(0, remaining);
  if (s.length > sTrim.length && remaining > 3) sTrim = sTrim.slice(0, Math.max(0, remaining - 1)) + '…';

  // If no snippet provided, just use query or add a short tagline
  let mergedDescription = sTrim ? `${qTrim}${separator}${sTrim}` : qTrim;
  if (!sTrim && mergedDescription.length < 70) {
    const tagline = ' — Discover insights with CuriosAI';
    const room = targetMax - mergedDescription.length;
    mergedDescription += room > tagline.length ? tagline : '';
  }

  const safeDescription = escapeHtml(mergedDescription);

  // Build absolute base URL from the incoming request
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers['x-forwarded-host'] || event.headers['host'] || 'curiosai.com';
  const base = `${proto}://${host}`;

  // Use provided image or generate dynamic one
  const hasCustomImage = !!image;
  const ogImageSvg = hasCustomImage
    ? image
    : `${base}/.netlify/functions/og-image?query=${encodeURIComponent(q)}&snippet=${encodeURIComponent(s.slice(0, 100))}`;
  const ogImagePng = hasCustomImage
    ? null
    : `${base}/.netlify/functions/og-image-png?query=${encodeURIComponent(q)}&snippet=${encodeURIComponent(s.slice(0, 100))}`;

  // Generate share URL (canonical for crawlers)
  const shareUrl = `${base}/.netlify/functions/share?query=${encodeURIComponent(q)}&snippet=${encodeURIComponent(s)}${image ? `&image=${encodeURIComponent(image)}` : ''}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>

  <!-- Primary Meta -->
  <meta name="description" content="${safeDescription}" />

  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  ${ogImagePng ? `<!-- Prefer PNG for broad compatibility (LinkedIn) -->
  <meta property=\"og:image\" content=\"${ogImagePng}\" />
  <meta property=\"og:image:type\" content=\"image/png\" />
  <meta property=\"og:image:secure_url\" content=\"${ogImagePng}\" />` : ''}
  <!-- Also provide primary image (SVG or custom) -->
  <meta property="og:image" content="${ogImageSvg}" />
  <meta property="og:image:alt" content="CuriosAI preview image for: ${safeTitle}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="627" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="CuriosAI" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${ogImagePng || ogImageSvg}" />

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
