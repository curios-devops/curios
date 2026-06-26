// Share URL builders — replicate Search's working ShareMenu exactly so Fast
// Search previews carry the same title/snippet/image. The crawler-meta networks
// (X / Bluesky / LinkedIn / Facebook / Reddit) point at the proven Netlify
// social-share function (the same one Search uses). WhatsApp/Email use the raw
// deep link.
//
// NOTE: we tried serving this from a Supabase edge function via a curiosai.com
// /api/social-share proxy, but it didn't work reliably for previews, so we
// reverted to Netlify. Kept here for reference:
//   const SHARE_FN = 'https://curiosai.com/api/social-share';

import type { SocialNetwork, SharePayload } from './shareConfig';

const SHARE_FN = 'https://curiosai.com/.netlify/functions/social-share';

// First-sentence snippet, matching ShareMenu's logic: clamp to 160 and pad short
// snippets toward LinkedIn's optimal 70-160 char window.
function buildSnippet(source: string | undefined, fallbackQuery: string): string {
  let snippet = '';
  if (source && source.length > 20) {
    const clean = source.replace(/\*\*/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    const firstSentence = clean.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 15 && firstSentence.length < 150) {
      snippet = firstSentence + '.';
    }
  }
  if (!snippet) {
    snippet = `Get AI-powered insights and comprehensive analysis for "${fallbackQuery}" with CuriosAI.`;
  }
  if (snippet.length > 160) {
    snippet = snippet.substring(0, 157) + '...';
  } else if (snippet.length < 70 && snippet.length > 0) {
    snippet = `${snippet} Discover comprehensive AI insights with CuriosAI.`;
    if (snippet.length > 160) {
      snippet = snippet.substring(0, 157) + '...';
    }
  }
  return snippet;
}

// Pick the first usable image URL, skipping obvious placeholders.
function firstValidImageUrl(urls: string[] | undefined): string {
  if (!urls) return '';
  return (
    urls.find((u) => u && u.startsWith('http') && !/placeholder|no-image|default/.test(u)) || ''
  );
}

// Crawler-friendly URL that renders OG meta tags for X / LinkedIn / Facebook.
function buildCrawlerShareUrl(payload: SharePayload): string {
  // Curiosity Share links (/s/:slug) are already short AND serve OG tags via the
  // node-share-og edge function, so share them directly — no long wrapper needed.
  const deep = payload.deepLink || '';
  if (/^https:\/\/curiosai\.com\/s\/[^/?#]+$/i.test(deep)) return deep;

  const query = (payload.title || '').trim();
  const snippet = buildSnippet(payload.description || payload.text, query);
  const image = firstValidImageUrl(payload.imageUrls);
  const params = new URLSearchParams({ query, snippet });
  if (image) params.set('image', image);
  // Carry the page's own deep link so the share function returns a human visitor to
  // the right service (Stories / new Search) instead of the legacy /search fallback.
  // Only forward prod curiosai.com links; the function re-validates the origin too.
  const deepLink = payload.deepLink || '';
  if (/^https:\/\/curiosai\.com\//i.test(deepLink)) params.set('redirect', deepLink);
  return `${SHARE_FN}?${params.toString()}`;
}

// Returns the share-intent URL for a network, or null for networks handled
// client-side (copy). Open the result with window.open.
export function buildShareHref(network: SocialNetwork, payload: SharePayload): string | null {
  const query = (payload.title || '').trim();
  const crawlerUrl = encodeURIComponent(buildCrawlerShareUrl(payload));
  const encodedTitle = encodeURIComponent(query);
  const encodedSnippet = encodeURIComponent(buildSnippet(payload.description || payload.text, query));
  const encodedDeepLink = encodeURIComponent(payload.deepLink || '');

  switch (network) {
    case 'x':
      return `https://twitter.com/intent/tweet?url=${crawlerUrl}&text=${encodedTitle}`;
    case 'bluesky':
      // Bluesky composes from text; it unfurls the URL into an OG link card.
      return `https://bsky.app/intent/compose?text=${encodedTitle}%20${crawlerUrl}`;
    case 'linkedin':
      return `https://www.linkedin.com/shareArticle?mini=true&url=${crawlerUrl}&title=${encodedTitle}&text=${encodedTitle}&summary=${encodedSnippet}&source=CuriosAI`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${crawlerUrl}`;
    case 'whatsapp':
      return `https://api.whatsapp.com/send?text=${encodedTitle}%0A${encodedDeepLink}`;
    case 'reddit':
      return `https://www.reddit.com/submit?url=${crawlerUrl}&title=${encodedTitle}`;
    case 'email':
      return `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(payload.text || '')}%0A%0A${encodedDeepLink}`;
    case 'copy':
      return null;
  }
}
