// SEO/GEO + social rendering for Curiosity Share links — path /s/:slug.
//
// Humans pass straight through to the SPA (NodeSharePage renders the snapshot).
// Search + AI crawlers (Googlebot, Bingbot, GPTBot, PerplexityBot, ClaudeBot, …)
// get a fully server-rendered, indexable HTML page built from the node: title,
// meta description, canonical, Open Graph/Twitter cards, schema.org JSON-LD
// (Article + QAPage), and the full answer + sources as real HTML — so the page
// can be indexed and *cited* by generative engines (GEO). This is dynamic
// rendering of the same content the user sees (not cloaking).
//
// Any failure falls back to serving the SPA — a broken render never breaks the page.

const CRAWLER_REGEX = /bot|crawler|spider|facebookexternalhit|facebot|embedly|quora link preview|whatsapp|slackbot|telegram|pinterest|discord|vkshare|redditbot|linkedinbot|twitterbot|googlebot|google-extended|bingbot|applebot|duckduckbot|yandex|baiduspider|gptbot|oai-searchbot|chatgpt-user|perplexitybot|claudebot|claude-web|anthropic-ai|cohere-ai|ccbot|amazonbot|youbot/i;
const SITE = 'https://curiosai.com';
const FALLBACK_IMAGE = `${SITE}/curios-og-image-1200x627.png`;
const LOGO = `${SITE}/curios-og-image-1200x627.png`;
const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') || 'https://gpfccicfqynahflehpqo.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY') || '';

const escapeHtml = (text = '') =>
  String(text).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c));

// Strip markdown to readable plain text (for meta description + JSON-LD answer text).
function toPlainText(md = '') {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // links -> text
    .replace(/\(([a-z0-9]+)(\s*\+\d+)?\)/gi, '') // (sitename +N) citation markers
    .replace(/[#*`>_~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Light markdown -> HTML for the indexable body. Intentionally small: headings,
// lists, bold, links and paragraphs are enough for crawlers to read the content.
function toHtml(md = '') {
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  const inline = (s) =>
    escapeHtml(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_m, t, u) => `<a href="${escapeHtml(u)}" rel="nofollow noopener">${t}</a>`);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    if (/^#{1,6}\s/.test(line)) { closeList(); const t = line.replace(/^#{1,6}\s/, ''); html += `<h2>${inline(t)}</h2>`; continue; }
    if (/^[-*]\s/.test(line)) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(line.replace(/^[-*]\s/, ''))}</li>`; continue; }
    if (/^[-–—]{3,}$/.test(line)) { continue; }
    closeList();
    html += `<p>${inline(line)}</p>`;
  }
  closeList();
  return html;
}

function buildPage(node, slug) {
  const shareUrl = `${SITE}/s/${slug}`;
  const title = escapeHtml((node.query || 'CuriosAI').slice(0, 110));
  const plain = toPlainText(node.short_summary || node.answer || '');
  const description = escapeHtml(plain.slice(0, 200)) || 'Discover AI-powered insights with CuriosAI';
  const image = node.cover_image || node.images?.[0]?.url || FALLBACK_IMAGE;
  const topics = Array.isArray(node.topics) ? node.topics : [];
  const sources = Array.isArray(node.sources) ? node.sources : [];
  const followUps = Array.isArray(node.follow_ups) ? node.follow_ups : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: node.query,
        description: plain.slice(0, 250),
        image: [image],
        datePublished: node.created_at,
        dateModified: node.updated_at || node.created_at,
        author: { '@type': 'Organization', name: 'CuriosAI', url: SITE },
        publisher: { '@type': 'Organization', name: 'CuriosAI', logo: { '@type': 'ImageObject', url: LOGO } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': shareUrl },
        ...(topics.length ? { keywords: topics.join(', '), about: topics.map((t) => ({ '@type': 'Thing', name: t })) } : {}),
      },
      {
        '@type': 'QAPage',
        mainEntity: {
          '@type': 'Question',
          name: node.query,
          text: node.query,
          answerCount: 1,
          dateCreated: node.created_at,
          author: { '@type': 'Organization', name: 'CuriosAI' },
          acceptedAnswer: {
            '@type': 'Answer',
            text: plain.slice(0, 5000),
            url: shareUrl,
            dateCreated: node.updated_at || node.created_at,
            author: { '@type': 'Organization', name: 'CuriosAI' },
          },
        },
      },
    ],
  };

  const sourcesHtml = sources.length
    ? `<section><h2>Sources</h2><ul>${sources
        .map((s) => `<li><a href="${escapeHtml(s.url)}" rel="nofollow noopener">${escapeHtml(s.title || s.url)}</a></li>`)
        .join('')}</ul></section>`
    : '';
  const relatedHtml = followUps.length
    ? `<section><h2>Related questions</h2><ul>${followUps
        .map((q) => `<li><a href="${SITE}/?q=${encodeURIComponent(q)}">${escapeHtml(q)}</a></li>`)
        .join('')}</ul></section>`
    : '';

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} — CuriosAI</title>
<meta name="description" content="${description}" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
<link rel="canonical" href="${shareUrl}" />
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
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head><body>
<main>
<article>
<h1>${title}</h1>
${node.cover_image ? `<img src="${escapeHtml(node.cover_image)}" alt="${title}" width="1200" height="627" />` : ''}
${toHtml(node.answer || '')}
${sourcesHtml}
${relatedHtml}
</article>
<p><a href="${SITE}/?q=${encodeURIComponent(node.query || '')}">Ask your own question on CuriosAI</a></p>
</main>
</body></html>`;
}

export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\/s\//, '').split('/')[0];
    const ua = request.headers.get('user-agent') || '';
    const isCrawler = CRAWLER_REGEX.test(ua);

    // Humans (and anything we can't classify) get the real app.
    if (!isCrawler || !slug || !SUPABASE_ANON_KEY) return context.next();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/curiosity_nodes?share_slug=eq.${encodeURIComponent(slug)}&select=query,answer,short_summary,cover_image,images,sources,follow_ups,topics,created_at,updated_at&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    const rows = res.ok ? await res.json() : [];
    const node = rows[0];
    if (!node) return context.next();

    return new Response(buildPage(node, slug), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
    });
  } catch {
    return context.next();
  }
};

export const config = { path: '/s/*' };
