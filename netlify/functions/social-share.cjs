const DEFAULT_TITLE = 'CuriosAI - AI-Powered Search';
const DEFAULT_DESCRIPTION = 'Get comprehensive AI-powered search results with insights, analysis, and curated information from multiple sources.';
const FALLBACK_IMAGE = 'https://curiosai.com/curiosai-og-image-1200x627.png';

const escapeHtml = (text = '') =>
  text.replace(/[<>&"']/g, (char) => (
    {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;'
    }[char] || char
  ));

const buildTitle = (query) => {
  const trimmed = (query || '').trim() || DEFAULT_TITLE;
  let safe = escapeHtml(trimmed.slice(0, 100));
  if (trimmed.length > 100) safe += '…';
  return safe;
};

const buildDescription = (query, snippet) => {
  const targetMax = 200;
  const minIdeal = 70;
  const q = (query || '').trim();
  const s = (snippet || '').trim();

  const firstSentence = s.split(/[.!?]+/).map((t) => t.trim()).filter(Boolean)[0] || '';
  let desc = firstSentence || s || DEFAULT_DESCRIPTION;

  if (desc.length > targetMax) desc = desc.slice(0, 197) + '…';

  if (!firstSentence && !s) {
    desc = q.slice(0, Math.min(120, q.length)) || DEFAULT_DESCRIPTION;
    if (q.length > desc.length) desc += '…';
  }

  if (desc.length < minIdeal) {
    const add = ' Discover insights with CuriosAI';
    if (desc.length + add.length <= targetMax) desc += add;
  }

  return escapeHtml(desc);
};

const getHeader = (headers = {}, name) => {
  if (!headers) return '';
  const lower = name.toLowerCase();
  return headers[name] || headers[lower] || '';
};

const buildShareHtml = ({ title, description, ogImage, imageWidth, imageHeight, query }) => {
  const searchUrl = `https://curiosai.com/search?q=${encodeURIComponent(query)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:secure_url" content="${ogImage}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:alt" content="CuriosAI - ${title}" />
  <meta property="og:image:width" content="${imageWidth}" />
  <meta property="og:image:height" content="${imageHeight}" />
  <meta property="og:url" content="${searchUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="CuriosAI" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />
  <link rel="canonical" href="${searchUrl}" />
  <meta http-equiv="refresh" content="0;url=${searchUrl}" />
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
    <h1 style="color: #0095FF; margin-bottom: 20px;">CuriosAI</h1>
    <h2 style="color: #333; margin-bottom: 16px;">${title}</h2>
    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">${description}</p>
    <a href="${searchUrl}" style="background: #0095FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">Explore with CuriosAI →</a>
  </div>
</body>
</html>`;
};

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const query = params.query || DEFAULT_TITLE;
  const snippet = params.snippet || DEFAULT_DESCRIPTION;
  const image = params.image || '';

  const title = buildTitle(query);
  const description = buildDescription(query, snippet);
  const ogImage = image && image.startsWith('http') ? image : FALLBACK_IMAGE;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    },
    body: buildShareHtml({ title, description, ogImage, imageWidth: '1200', imageHeight: '627', query })
  };
};
