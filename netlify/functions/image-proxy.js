// Lightweight image proxy to reliably serve external raster images from curiosai.com
// Purpose: ensure LinkedIn/Twitter can fetch og:image from our domain even if the source blocks bots/HEAD/Range

exports.handler = async (event) => {
  try {
    const getParam = (name, fallback = '') => {
      const raw = event.queryStringParameters?.[name];
      if (!raw) return fallback;
      try { return decodeURIComponent(raw); } catch { return raw; }
    };

    const src = getParam('src');
    if (!src) {
      return { statusCode: 400, body: 'Missing src' };
    }

    // Only allow http/https and reject obvious SVGs (LinkedIn ignores SVG anyway)
    if (!/^https?:\/\//i.test(src)) {
      return { statusCode: 400, body: 'Invalid src' };
    }
    if (/\.svg($|\?)/i.test(src) || /image\/svg\+xml/i.test(src) || src.toLowerCase().startsWith('data:image/svg+xml')) {
      return { statusCode: 415, body: 'SVG not supported' };
    }

    const ua = 'CuriosAI-ImageProxy/1.0 (+https://curiosai.com)';

    const doFetch = async (method, extraHeaders = {}) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000);
      try {
        return await fetch(src, {
          method,
          headers: { 'User-Agent': ua, 'Accept': 'image/*', ...extraHeaders },
          redirect: 'follow',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(id);
      }
    };

    const isHead = event.httpMethod === 'HEAD';
    let res = await doFetch(isHead ? 'HEAD' : 'GET');

    // Fallback: Some servers block HEAD; try a tiny ranged GET to obtain headers
    if (isHead && (!res.ok || !res.headers.get('content-type'))) {
      res = await doFetch('GET', { Range: 'bytes=0-0' });
    }

    if (!res.ok) {
      return { statusCode: res.status, body: `Upstream error: ${res.status}` };
    }

    // Accept common raster types (jpeg/png/gif/webp). If missing, default to image/jpeg.
    const ct = res.headers.get('content-type') || '';
    const isRaster = /(image\/(jpeg|jpg|png|gif|webp))/i.test(ct);
    const contentType = isRaster ? ct : 'image/jpeg';

    // Propagate caching headers generously
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=604800, immutable',
      'Access-Control-Allow-Origin': '*',
    };

    // HEAD: return headers only
    if (isHead) {
      const len = res.headers.get('content-length');
      if (len) headers['Content-Length'] = len;
      return { statusCode: 200, headers };
    }

    // GET: stream body
    const ab = await res.arrayBuffer();
    headers['Content-Length'] = String(ab.byteLength);

    return {
      statusCode: 200,
      headers,
      body: Buffer.from(ab).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    return { statusCode: 500, body: 'Proxy error' };
  }
};
