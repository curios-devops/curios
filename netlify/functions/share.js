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
  const targetMax = 160; // LinkedIn often truncates around 140-160 chars
  const minIdeal = 70;
  const q = (query || '').trim();
  const s = (snippet || '').trim();

  // Prefer the first sentence of the snippet if available
  const firstSentence = s.split(/[.!?]+/).map(t => t.trim()).filter(Boolean)[0] || '';
  let desc = firstSentence || s;
  if (desc.length > targetMax) desc = desc.slice(0, 157) + '…';
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

  // Build absolute base URL from the incoming request
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers['x-forwarded-host'] || event.headers['host'] || 'curiosai.com';
  const base = `${proto}://${host}`;

  // Helper to ensure absolute HTTPS URLs
  const absoluteHttps = (u) => {
    if (!u) return '';
    if (u.startsWith('http://')) return u.replace('http://', 'https://');
    if (u.startsWith('https://')) return u;
    if (u.startsWith('//')) return `https:${u}`;
    return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
  };

  // Guard against SVG inputs for og:image (treat as no raster)
  const isLikelySvg = (u) => {
    if (!u || typeof u !== 'string') return false;
    const lower = u.toLowerCase();
    if (lower.startsWith('data:image/svg+xml')) return true;
    if (/\.svg($|\?)/i.test(u)) return true;
    if (/[?&](format|ext)=svg(&|$)/i.test(u)) return true;
    if (lower.includes('image/svg+xml')) return true;
    return false;
  };

  // Raster image only: if none available, omit image tags entirely (no static PNG, no SVG fallback)
  const rasterOgImage = image && !isLikelySvg(image) ? absoluteHttps(image) : '';

  // Generate share URL (canonical for crawlers)
  const shareUrl = `${base}/.netlify/functions/share?query=${encodeURIComponent(q)}&snippet=${encodeURIComponent(s)}${image ? `&image=${encodeURIComponent(image)}` : ''}`;

  // Detect locale from Accept-Language header for og:locale
  const getOgLocale = () => {
    const al = event.headers['accept-language'] || '';
    if (!al) return 'en_US';
    const primary = al.split(',')[0]?.trim() || '';
    if (!primary) return 'en_US';
    const [langRaw, regionRaw] = primary.split('-');
    const lang = (langRaw || '').toLowerCase();
    const region = regionRaw ? regionRaw.toUpperCase() : '';
    if (lang && region) return `${lang}_${region}`;
    const map = {
      en: 'en_US', es: 'es_ES', de: 'de_DE', fr: 'fr_FR', it: 'it_IT', pt: 'pt_BR', ja: 'ja_JP', ca: 'ca_ES'
    };
    return map[lang] || 'en_US';
  };
  const ogLocale = getOgLocale();

  // Conditionally include image meta tags only when we have a raster image
  const combinedImageMeta = rasterOgImage
    ? `<meta name="image" property="og:image" content="${rasterOgImage}" />`
    : '';
  const ogImageMeta = rasterOgImage
    ? [`<meta property="og:image" content="${rasterOgImage}" />`,
       `<meta property="og:image:secure_url" content="${rasterOgImage}" />`,
       `<meta property="og:image:alt" content="CuriosAI preview image for: ${safeTitle}" />`].join('\n  ')
    : '';
  const twitterCardType = rasterOgImage ? 'summary_large_image' : 'summary';
  const twitterImageMeta = rasterOgImage
    ? `<meta name="twitter:image" content="${rasterOgImage}" />`
    : '';

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
  ${combinedImageMeta}
  <meta name="url" property="og:url" content="${shareUrl}" />
  <meta name="site_name" property="og:site_name" content="CuriosAI" />
  <meta name="locale" property="og:locale" content="${ogLocale}" />

  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  ${ogImageMeta}
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="CuriosAI" />
  <meta property="og:locale" content="${ogLocale}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${twitterCardType}" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  ${twitterImageMeta}

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
