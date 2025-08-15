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

  // Helpers to avoid title/description duplication
  const normalize = (str) => (str || '')
    .toLowerCase()
    .replace(/[‘’‚‛“”„‟"'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const isTooSimilar = (a, b) => {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.length > 12 && (nb.includes(na) || na.includes(nb))) return true;
    const aSet = new Set(na.split(' ').filter(Boolean));
    const bSet = new Set(nb.split(' ').filter(Boolean));
    const inter = [...aSet].filter(w => bSet.has(w)).length;
    const ratio = inter / Math.max(aSet.size, 1);
    return ratio >= 0.7;
  };
  const sentences = s
    ? s.split(/[.!?]+/).map(t => t.trim()).filter(Boolean)
    : [];

  // Prefer the first sentence, but ensure it differs from the title
  let primary = sentences[0] || s;
  if (isTooSimilar(primary, q)) {
    // Try the next sentence if available
    const alt = sentences.find((sent, idx) => idx > 0 && !isTooSimilar(sent, q));
    if (alt) primary = alt;
    else {
      // Derive an alternate by removing the title words from the snippet
      const titleWords = new Set(normalize(q).split(' ').filter(Boolean));
      const filtered = (normalize(s).split(' ').filter(Boolean)
        .filter(w => !titleWords.has(w))).join(' ');
      if (filtered.length > 20) primary = filtered;
    }
  }

  let desc = primary || s || '';
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
    // Lightly enhance too-short snippets (keep distinct from title)
    const add = ' Discover insights with CuriosAI';
    if (desc.length + add.length <= targetMax && !isTooSimilar(desc + add, q)) desc += add;
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

  // Light fetch with timeout helper
  const fetchWithTimeout = async (url, opts = {}, ms = 2500) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  };

  // Parse minimal dimensions from PNG/JPEG/GIF buffers
  const parseImageDimensions = (buf) => {
    if (!buf || buf.length < 10) return null;
    // PNG
    if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      return { w, h, type: 'png' };
    }
    // GIF
    if (buf.length > 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
      const w = buf.readUInt16LE(6);
      const h = buf.readUInt16LE(8);
      return { w, h, type: 'gif' };
    }
    // JPEG (scan for SOF0/1/2)
    if (buf.length > 4 && buf[0] === 0xFF && buf[1] === 0xD8) {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xFF) { i++; continue; }
        const marker = buf[i + 1];
        const hasSize = marker !== 0xD8 && marker !== 0xD9 && marker !== 0xDA;
        if (!hasSize) { i += 2; continue; }
        const len = buf.readUInt16BE(i + 2);
        if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
          const h = buf.readUInt16BE(i + 5);
          const w = buf.readUInt16BE(i + 7);
          return { w, h, type: 'jpg' };
        }
        i += 2 + len;
      }
    }
    return null;
  };

  // Validate raster: correct content-type, reasonable size, and minimum dimensions for good LinkedIn layout.
  const validateRasterOgImage = async (url) => {
    let headContentType = '';
    let headContentLength = '';
    try {
      const head = await fetchWithTimeout(url, { method: 'HEAD' }, 2500);
      headContentType = head.headers.get('content-type') || '';
      const isRaster = /image\/(jpeg|jpg|png|gif|webp)/i.test(headContentType);
      if (!isRaster) {
        console.log('🖼️ Skipping image - unsupported content-type:', headContentType);
        return '';
      }
      headContentLength = head.headers.get('content-length') || '';
      if (headContentLength && Number(headContentLength) > 5 * 1024 * 1024) {
        console.log('🖼️ Skipping image - too large:', headContentLength);
        return '';
      }
    } catch (e) {
      // Some servers disallow HEAD; continue with ranged GET
    }

    try {
      const res = await fetchWithTimeout(url, { headers: { Range: 'bytes=0-65535' } }, 3000);
      if (!res.ok) {
        console.log('🖼️ Skipping image - fetch not OK:', res.status);
        return '';
      }
      const type = res.headers.get('content-type') || headContentType || '';
      if (!/image\/(jpeg|jpg|png|gif|webp)/i.test(type)) {
        console.log('🖼️ Skipping image - fetched non-raster type:', type);
        return '';
      }

      // If we have a definitive large size from HEAD, enforce 5MB cap
      if (headContentLength && Number(headContentLength) > 5 * 1024 * 1024) {
        console.log('🖼️ Skipping image - too large by HEAD after GET:', headContentLength);
        return '';
      }

      const ab = await res.arrayBuffer();
      const buf = Buffer.from(ab);
      const dims = parseImageDimensions(buf);

      // Prefer large-card thresholds, but be permissive to avoid skipping valid images
      const minLargeW = 600; // LinkedIn large image minimum guidance
      const minLargeH = 315;
      const minAcceptW = 400; // accept smaller, may render as smaller card/thumbnail
      const minAcceptH = 209;

      if (dims) {
        if (dims.w >= minLargeW && dims.h >= minLargeH) {
          return url;
        }
        if (dims.w >= minAcceptW && dims.h >= minAcceptH) {
          console.log(`🖼️ Using image - small but acceptable ${dims.w}x${dims.h}`);
          return url;
        }
        console.log(`🖼️ Skipping image - too small ${dims.w}x${dims.h} (< ${minAcceptW}x${minAcceptH})`);
        return '';
      }

      // Could not parse dimensions. If type looks right and HEAD didn't flag size issues, accept.
      console.log('🖼️ Using image - dimensions unknown but type/size look OK');
      return url;
    } catch (err) {
      console.log('🖼️ Skipping image - error fetching/parsing:', err?.message || err);
      return '';
    }
  };

  // Raster image: prefer provided raster; else fall back to a PNG-converted dynamic OG image.
  // Build a PNG transformer (uses wsrv.nl so we don't ship heavy raster libs)
  const toPng1200x627 = (srcUrl) => `https://wsrv.nl/?url=${encodeURIComponent(srcUrl)}&w=1200&h=627&fit=cover&output=png`;

  let rasterOgImage = '';
  const hasCandidateRaster = image && !isLikelySvg(image);
  const absCandidate = hasCandidateRaster ? absoluteHttps(image) : '';

  // Fallback dynamic SVG (text-only) -> convert to PNG for LinkedIn
  const dynSvg = `${base}/.netlify/functions/og-image?query=${encodeURIComponent(q)}&snippet=${encodeURIComponent(s.slice(0, 120))}`;
  const preferredSrc = hasCandidateRaster ? absCandidate : dynSvg;

  // If we have a candidate raster, keep it; otherwise, use PNG version of the dynamic SVG
  const pngified = toPng1200x627(preferredSrc);
  rasterOgImage = `${base}/.netlify/functions/image-proxy?src=${encodeURIComponent(pngified)}`;

  console.log('🧩 Image selection:');
  console.log('- hasCandidateRaster:', !!hasCandidateRaster);
  console.log('- preferredSrc:', preferredSrc);
  console.log('- pngified:', pngified);
  console.log('- rasterOgImage (proxied):', rasterOgImage);

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
  const imageWidth = 1200;
  const imageHeight = 627;
  const combinedImageMeta = rasterOgImage
    ? `<meta name="image" property="og:image" content="${rasterOgImage}" />\n  <meta property="og:image:secure_url" content="${rasterOgImage}" />\n  <meta property="og:image:width" content="${imageWidth}" />\n  <meta property="og:image:height" content="${imageHeight}" />`
    : '';
  const ogImageMeta = rasterOgImage
    ? [`<meta property="og:image" content="${rasterOgImage}" />`,
       `<meta property="og:image:secure_url" content="${rasterOgImage}" />`,
       `<meta property="og:image:width" content="${imageWidth}" />`,
       `<meta property="og:image:height" content="${imageHeight}" />`,
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

  <!-- Image first to help crawlers prioritize it -->
  ${combinedImageMeta}
  ${ogImageMeta}
  ${rasterOgImage ? `<link rel="image_src" href="${rasterOgImage}" />` : ''}

  <!-- Primary Meta -->
  <meta name="description" content="${safeDescription}" />
  <!-- Combined name+property tags as per LinkedIn Inspector guidance -->
  <meta name="title" property="og:title" content="${safeTitle}" />
  <meta name="description" property="og:description" content="${safeDescription}" />
  <meta name="url" property="og:url" content="${shareUrl}" />
  <meta name="site_name" property="og:site_name" content="CuriosAI" />
  <meta name="locale" property="og:locale" content="${ogLocale}" />

  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
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
