// Utility functions for dynamic meta tags for social sharing

export interface MetaTagData {
  title: string;
  description: string;
  image?: string;
  url: string;
}

export function updateMetaTags(data: MetaTagData) {
  // Update document title
  document.title = data.title;

  // Update or create Open Graph meta tags
  updateMetaTag('og:title', data.title);
  updateMetaTag('og:description', data.description);
  updateMetaTag('og:url', data.url);
  
  if (data.image) {
    updateMetaTag('og:image', data.image);
  }

  // Update Twitter Card meta tags
  updateMetaTag('twitter:title', data.title);
  updateMetaTag('twitter:description', data.description);
  
  if (data.image) {
    updateMetaTag('twitter:image', data.image);
  }
}

function updateMetaTag(property: string, content: string) {
  let metaTag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
  
  if (!metaTag) {
    metaTag = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
  }
  
  if (!metaTag) {
    metaTag = document.createElement('meta');
    if (property.startsWith('og:') || property === 'twitter:card') {
      metaTag.setAttribute('property', property);
    } else {
      metaTag.setAttribute('name', property);
    }
    document.head.appendChild(metaTag);
  }
  
  metaTag.setAttribute('content', content);
}

export function generateShareableMetaTags(query: string, answer?: string, imageUrl?: string) {
  const baseUrl = window.location.origin;
  const currentUrl = window.location.href;
  
  return {
    title: query,
    description: answer ? 
      `${answer.slice(0, 150)}...` : 
      'CuriosAI Web Search - Advanced AI-powered search results',
    image: imageUrl || `${baseUrl}/compass.svg`,
    url: currentUrl
  };
}
