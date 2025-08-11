// Netlify Function for Dynamic Open Graph Images (PNG compatible)
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const { query, snippet } = event.queryStringParameters || {};
  
  if (!query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Query parameter required' })
    };
  }
  
  // Process snippet for display - create teaser
  let displaySnippet = '';
  if (snippet) {
    const sentences = snippet.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 1) {
      const teaser = sentences[0].trim();
      displaySnippet = teaser.length > 90 ? teaser.substring(0, 87) + '...' : teaser + '...';
    } else {
      displaySnippet = snippet.slice(0, 90) + (snippet.length > 90 ? '...' : '');
    }
  }
  
  // Escape HTML entities for SVG
  const escapeHtml = (text: string) => 
    text.replace(/[<>&"']/g, (c) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;'
    }[c] || c));
  
  const safeQuery = escapeHtml(query.slice(0, 60));
  const safeSnippet = escapeHtml(displaySnippet);
  
  // Generate clean SVG (LinkedIn optimized: 1200x627)
  const svg = `<svg width="1200" height="627" viewBox="0 0 1200 627" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0095FF;stop-opacity:0.1" />
        <stop offset="100%" style="stop-color:#0095FF;stop-opacity:0.05" />
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#0095FF" />
        <stop offset="100%" style="stop-color:#0080FF" />
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="1200" height="627" fill="#ffffff"/>
    <rect width="1200" height="627" fill="url(#bg)"/>
    
    <!-- CuriosAI Branding -->
    <text x="80" y="120" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#0095FF">CuriosAI</text>
    
    <!-- Query Title -->
    <text x="80" y="200" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#1a1a1a">${safeQuery}${query.length > 60 ? '...' : ''}</text>
    
    ${displaySnippet ? `<!-- Snippet -->
    <text x="80" y="280" font-family="Arial, sans-serif" font-size="20" fill="#666">${safeSnippet}</text>` : `<!-- No snippet -->
    <text x="80" y="280" font-family="Arial, sans-serif" font-size="20" fill="#666">AI-powered search results with comprehensive insights</text>`}
    
    <!-- Bottom accent -->
    <rect x="80" y="577" width="200" height="4" fill="url(#accent)"/>
    
    <!-- Decorative dots -->
    <circle cx="1000" cy="150" r="8" fill="#0095FF" opacity="0.3"/>
    <circle cx="1050" cy="200" r="6" fill="#0095FF" opacity="0.4"/>
    <circle cx="950" cy="250" r="4" fill="#0095FF" opacity="0.5"/>
  </svg>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': 'inline; filename="og-image.svg"'
    },
    body: svg
  };
};
