// Simplified Meta Tags Utility - Client-side only, server handles social crawlers
export interface MetaTagData {
  title: string;
  description: string;
  image: string;
  url: string;
}

function updateMetaTag(property: string, content: string) {
  // Remove existing meta tag
  const existing = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
  if (existing) {
    existing.remove();
  }
  
  // Create new meta tag
  const metaTag = document.createElement('meta');
  if (property.startsWith('og:') || property.startsWith('article:')) {
    metaTag.setAttribute('property', property);
  } else {
    metaTag.setAttribute('name', property);
  }
  metaTag.setAttribute('content', content);
  document.head.appendChild(metaTag);
}

export function generateShareableMetaTags(query: string, answer?: string, imageUrl?: string) {
  const baseUrl = window.location.origin;
  const currentUrl = window.location.href;
  
  const title = query || 'CuriosAI Web Search';
  const description = answer ? 
    `${answer.slice(0, 155)}...` : 
    `Search results for "${query}" - AI-powered insights and comprehensive analysis`;
  const image = imageUrl || `${baseUrl}/og-image.svg`;
  
  return {
    title,
    description,
    image,
    url: currentUrl
  };
}

// Simplified meta tag update for dynamic content
export function updateMetaTags(data: MetaTagData) {
  document.title = data.title;
  updateMetaTag('og:title', data.title);
  updateMetaTag('og:description', data.description);
  updateMetaTag('og:image', data.image);
  updateMetaTag('og:url', data.url);
  updateMetaTag('twitter:title', data.title);
  updateMetaTag('twitter:description', data.description);
  updateMetaTag('twitter:image', data.image);
}

// LinkedIn-specific meta tag update (backward compatibility)
export function updateLinkedInMetaTags(data: MetaTagData) {
  updateMetaTags(data); // Use the simplified version
  updateMetaTag('og:type', 'article');
  updateMetaTag('og:site_name', 'CuriosAI');
  updateMetaTag('twitter:card', 'summary_large_image');
}

// Dynamic OG image generation - simplified
export function generateDynamicOGImage(query: string, snippet?: string): string {
  const baseUrl = window.location.origin;
  const encodedQuery = encodeURIComponent(query);
  const encodedSnippet = snippet ? encodeURIComponent(snippet.slice(0, 200)) : '';
  
  return `${baseUrl}/.netlify/functions/og-image?query=${encodedQuery}${encodedSnippet ? `&snippet=${encodedSnippet}` : ''}`;
}
