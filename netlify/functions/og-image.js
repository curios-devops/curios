// Simple Netlify Function for Dynamic Open Graph Images
exports.handler = async (event) => {
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
  const escapeHtml = (text) => 
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
    <rect width="1200" height="627" fill="white"/>
    <rect width="1200" height="627" fill="url(#bg)"/>
    
    <!-- Header accent bar -->
    <rect width="1200" height="6" fill="url(#accent)"/>
    
    <!-- Logo area -->
    <circle cx="120" cy="120" r="35" fill="#0095FF" opacity="0.1"/>
    <text x="120" y="130" text-anchor="middle" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="24" font-weight="bold" fill="#0095FF">C</text>
    
    <!-- Brand text -->
    <text x="180" y="100" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="32" font-weight="bold" fill="#0095FF">CuriosAI</text>
    <text x="180" y="130" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="16" fill="#666">AI-Powered Search</text>
    
    <!-- Main content -->
    <text x="100" y="220" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="48" font-weight="600" fill="#1a1a1a">${safeQuery}</text>
    
    <!-- Snippet text (if available) -->
    ${safeSnippet ? `<text x="100" y="300" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="24" fill="#666" opacity="0.8">${safeSnippet}</text>` : ''}
    
    <!-- Bottom accent -->
    <rect x="100" y="450" width="80" height="4" fill="url(#accent)" rx="2"/>
    <text x="100" y="500" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="18" fill="#999">Discover insights with AI</text>
    
    <!-- Subtle decorative elements -->
    <circle cx="1050" cy="150" r="60" fill="#0095FF" opacity="0.03"/>
    <circle cx="1100" cy="500" r="40" fill="#0095FF" opacity="0.03"/>
  </svg>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
    body: svg
  };
};
