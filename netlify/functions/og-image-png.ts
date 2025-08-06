import { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  const { query = 'CuriosAI Search', snippet = '' } = event.queryStringParameters || {};

  try {
    // Clean the inputs
    const cleanQuery = query.slice(0, 80);
    const cleanSnippet = snippet.slice(0, 200);

    // Create a canvas-like structure using HTML5 Canvas via node-canvas
    // Since we're in Netlify Functions, we'll generate a PNG using a different approach
    
    // For now, let's create an SVG that we can convert to PNG
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0095FF;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#007ACC;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bg)"/>
        
        <!-- Content Container -->
        <rect x="60" y="60" width="1080" height="510" rx="20" fill="rgba(255,255,255,0.1)"/>
        
        <!-- CuriosAI Logo -->
        <text x="100" y="140" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white">
          CuriosAI
        </text>
        
        <!-- Search Query Title -->
        <text x="100" y="220" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="white">
          ${cleanQuery.replace(/[<>&]/g, (c) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'}[c] || c))}
        </text>
        
        <!-- Snippet Text -->
        ${cleanSnippet ? `
          <text x="100" y="280" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.9)">
            ${cleanSnippet.slice(0, 80).replace(/[<>&]/g, (c) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'}[c] || c))}
          </text>
          ${cleanSnippet.length > 80 ? `
            <text x="100" y="310" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.9)">
              ${cleanSnippet.slice(80, 160).replace(/[<>&]/g, (c) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'}[c] || c))}...
            </text>
          ` : ''}
        ` : `
          <text x="100" y="280" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.9)">
            AI-powered search results with comprehensive insights
          </text>
        `}
        
        <!-- Search Icon -->
        <circle cx="1050" cy="180" r="40" fill="rgba(255,255,255,0.2)"/>
        <circle cx="1050" cy="180" r="25" fill="none" stroke="white" stroke-width="3"/>
        <circle cx="1050" cy="180" r="15" fill="none" stroke="white" stroke-width="2"/>
        
        <!-- Domain -->
        <text x="100" y="450" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.8)">
          curiosai.com
        </text>
      </svg>
    `;

    // Return SVG with consistent headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': 'inline; filename="og-image.svg"',
        'X-Content-Type-Options': 'nosniff'
      },
      body: svg
    };

  } catch (error) {
    console.error('Error generating OG image:', error);
    
    // Return a simple fallback SVG with consistent headers
    const fallbackSvg = `
      <svg width="1200" height="627" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="627" fill="#0095FF"/>
        <text x="600" y="313" font-family="Arial" font-size="48" fill="white" text-anchor="middle">
          CuriosAI Search
        </text>
      </svg>
    `;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': 'inline; filename="og-image-fallback.svg"',
        'X-Content-Type-Options': 'nosniff'
      },
      body: fallbackSvg
    };
  }
};

export { handler };
