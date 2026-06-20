// Share URL builders — replicate Search's working ShareMenu exactly so Fast
// Search previews carry the same title/snippet/image. The crawler-meta networks
// (X / Bluesky / LinkedIn / Facebook / Reddit) point at the Supabase social-share
// function, fronted by the curiosai.com /api/social-share proxy (brand domain so
// LinkedIn doesn't choke on *.supabase.co). WhatsApp/Email use the raw deep link.

import type { SocialNetwork, SharePayload } from './shareConfig';

const SHARE_FN = 'https://curiosai.com/api/social-share';

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
  const query = (payload.title || '').trim();
  const snippet = buildSnippet(payload.description || payload.text, query);
  const image = firstValidImageUrl(payload.imageUrls);
  const params = new URLSearchParams({ query, snippet });
  if (image) params.set('image', image);
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
