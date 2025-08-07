// Netlify Function for Dynamic Open Graph Images - Consolidated Version
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
  
  // Generate dynamic SVG (optimized for social sharing)
  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0095FF;stop-opacity:0.1" />
        <stop offset="100%" style="stop-color:#0095FF;stop-opacity:0.05" />
      </linearGradient>
    </defs>
    
    <rect width="1200" height="630" fill="#ffffff"/>
    <rect width="1200" height="630" fill="url(#bg)"/>
    
    <!-- CuriosAI Branding -->
    <text x="80" y="120" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#0095FF">CuriosAI</text>
    
    <!-- Query Title -->
    <text x="80" y="200" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#1a1a1a">${query.slice(0, 60).replace(/[<>&]/g, (c) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'}[c] || c))}</text>
    
    ${displaySnippet ? `
    <!-- Snippet -->
    <text x="80" y="280" font-family="Arial, sans-serif" font-size="20" fill="#666">${displaySnippet.replace(/[<>&]/g, (c) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'}[c] || c))}</text>
    ` : ''}
    
    <!-- Bottom accent -->
    <rect x="80" y="580" width="200" height="4" fill="#0095FF"/>
  </svg>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'Content-Disposition': 'inline; filename="og-image.svg"'
    },
    body: svg
  };
};
    
    <!-- Logo -->
    <circle cx="120" cy="120" r="60" fill="url(#accent)" opacity="0.1"/>
    <circle cx="120" cy="120" r="40" fill="#0095FF"/>
    
    <!-- Search Icon -->
    <g transform="translate(95, 95)">
      <circle cx="25" cy="25" r="18" fill="none" stroke="white" stroke-width="3"/>
      <path d="m39 39 8 8" stroke="white" stroke-width="3" stroke-linecap="round"/>
    </g>
    
    <!-- Dynamic Query Title -->
    <text x="220" y="140" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="#1a1a1a">
      ${query.slice(0, 60)}${query.length > 60 ? '...' : ''}
    </text>
    
    <!-- CuriosAI Branding -->
    <text x="220" y="190" font-family="Arial, sans-serif" font-size="20" font-weight="500" fill="#0095FF">
      curiosai.com
    </text>
    
    <!-- Dynamic Snippet with Teaser -->
    ${displaySnippet ? `
      <text x="220" y="250" font-family="Arial, sans-serif" font-size="18" fill="#666666">
        ${line1}
      </text>
      ${line2 ? `<text x="220" y="280" font-family="Arial, sans-serif" font-size="18" fill="#666666">
        ${line2}
      </text>` : ''}
      <text x="220" y="320" font-family="Arial, sans-serif" font-size="16" fill="#0095FF" font-style="italic">
        Read full analysis →
      </text>
    ` : `
      <text x="220" y="250" font-family="Arial, sans-serif" font-size="18" fill="#666666">
        AI-powered search results with comprehensive
      </text>
      <text x="220" y="280" font-family="Arial, sans-serif" font-size="18" fill="#666666">
        insights and analysis
      </text>
      <text x="220" y="320" font-family="Arial, sans-serif" font-size="16" fill="#0095FF" font-style="italic">
        Discover more →
      </text>
    `}
    
    <!-- Domain -->
    <text x="220" y="380" font-family="Arial, sans-serif" font-size="16" fill="#999999">
      curiosai.com
    </text>
    
    <!-- Decorative Elements -->
    <circle cx="1000" cy="150" r="8" fill="#0095FF" opacity="0.3"/>
    <circle cx="1050" cy="200" r="6" fill="#0095FF" opacity="0.4"/>
    <circle cx="950" cy="250" r="4" fill="#0095FF" opacity="0.5"/>
    
    <!-- Bottom Accent -->
    <rect x="0" y="600" width="1200" height="30" fill="url(#accent)" opacity="0.1"/>
  </svg>`;
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600'
    },
    body: svg
  };
};
