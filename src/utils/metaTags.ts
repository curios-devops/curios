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
  updateMetaTag('og:type', 'article');
  updateMetaTag('og:site_name', 'CuriosAI');
  
  // Image handling - straightforward approach
  if (data.image && data.image.trim()) {
    updateMetaTag('og:image', data.image);
    updateMetaTag('og:image:width', '1200');
    updateMetaTag('og:image:height', '627');
    updateMetaTag('og:image:type', 'image/jpeg');
    updateMetaTag('og:image:alt', data.title);
    
    // Twitter meta tags for better compatibility
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:image', data.image);
    updateMetaTag('twitter:image:alt', data.title);
  } else {
    // Fallback to site logo if no image
    const fallbackImage = `${window.location.origin}/og-image.svg`;
    updateMetaTag('og:image', fallbackImage);
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:image', fallbackImage);
  }

  // Twitter Card meta tags
  updateMetaTag('twitter:title', data.title);
  updateMetaTag('twitter:description', data.description);
  updateMetaTag('twitter:site', '@CuriosAI');
  
  // LinkedIn specific optimizations
  updateMetaTag('article:author', 'CuriosAI');
  updateMetaTag('og:locale', 'en_US');
}

function updateMetaTag(property: string, content: string) {
  // Remove existing tags (both property and name attributes)
  let existingTag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
  if (existingTag) {
    existingTag.remove();
  }
  
  existingTag = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
  if (existingTag) {
    existingTag.remove();
  }
  
  // Create new meta tag
  const metaTag = document.createElement('meta');
  
  // Use 'property' for Open Graph tags, 'name' for Twitter and others
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
  
  // Dynamic title: Just the user query
  const title = query || 'CuriosAI Web Search';
  
  // Dynamic description: Short snippet from AI overview
  const description = answer ? 
    `${answer.slice(0, 155)}...` : 
    `Search results for "${query}" - AI-powered insights and comprehensive analysis`;
  
  // Dynamic image: Use actual search result image if available
  const image = imageUrl || `${baseUrl}/og-image.svg`;
  
  return {
    title,
    description,
    image,
    url: currentUrl
  };
}

// Enhanced LinkedIn meta tag update for dynamic content
export function updateLinkedInMetaTags(data: MetaTagData) {
  // Standard meta tags
  updateMetaTags(data);
  
  // LinkedIn-specific requirements
  updateMetaTag('og:type', 'article');
  updateMetaTag('og:site_name', 'CuriosAI');
  updateMetaTag('twitter:card', 'summary_large_image');
  updateMetaTag('twitter:site', '@CuriosAI');
  
  // Dynamic content for better engagement
  updateMetaTag('article:author', 'CuriosAI');
  updateMetaTag('article:publisher', 'https://curiosai.com');
  updateMetaTag('article:section', 'Search Results');
  
  // Image specifications for LinkedIn (optimal dimensions and size limits)
  if (data.image) {
    updateMetaTag('og:image:width', '1200');
    updateMetaTag('og:image:height', '627');
    // Detect image type
    const imageType = data.image.includes('.png') ? 'image/png' : 
                     data.image.includes('.jpg') || data.image.includes('.jpeg') ? 'image/jpeg' :
                     'image/svg+xml';
    updateMetaTag('og:image:type', imageType);
    updateMetaTag('og:image:alt', `Search results for: ${data.title}`);
  }
}

// Function to generate a dynamic Open Graph image URL based on query and results
export function generateDynamicOGImage(query: string, snippet?: string, searchImage?: string): string {
  const baseUrl = window.location.origin;
  
  // If we have a search result image that's valid, use it
  if (searchImage && isValidImageUrl(searchImage)) {
    return searchImage;
  }
  
  // Otherwise, generate a dynamic OG image using our Netlify function
  const encodedQuery = encodeURIComponent(query);
  const encodedSnippet = snippet ? encodeURIComponent(snippet.slice(0, 200)) : '';
  
  // Use Netlify function for dynamic image generation
  return `${baseUrl}/.netlify/functions/og-image?query=${encodedQuery}&snippet=${encodedSnippet}`;
}

// Helper function to validate image URLs
function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && 
           (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp'));
  } catch {
    return false;
  }
}
