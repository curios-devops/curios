// Netlify Function for LinkedIn Sharing with Dynamic OG Meta Tags
exports.handler = async (event, context) => {
  try {
    // Get query parameters from the URL - these will come from real-time app data
    const query = event.queryStringParameters?.query || "CuriosAI - AI-Powered Search";
    const snippet = event.queryStringParameters?.snippet || "Discover insights with AI-powered search and analysis";
    const image = event.queryStringParameters?.image || "";

    // Detect if request is from a social media crawler
    const userAgent = event.headers['user-agent'] || '';
    const referer = event.headers['referer'] || event.headers['referrer'] || '';
    
    // Basic bot detection - include LinkedIn patterns but don't be too strict
    const isBot = /bot|crawler|spider|facebookexternalhit|twitterbot|linkedinbot|whatsapp|slackbot|linkedin/i.test(userAgent) ||
                  /linkedin\.com/i.test(referer) ||
                  userAgent === ''; // Empty user agent is likely a bot

    console.log('Share function called', { 
      query: query.slice(0, 50), 
      isBot, 
      userAgent: userAgent.slice(0, 100),
      referer: referer.slice(0, 100),
      fullHeaders: Object.keys(event.headers),
      secFetchSite: event.headers['sec-fetch-site'],
      secFetchMode: event.headers['sec-fetch-mode'],
      contentType: event.headers['content-type'],
      accept: event.headers['accept']
    });

  // Sanitize HTML to prevent XSS and broken meta tags
  const escapeHtml = (text) => 
    text.replace(/[<>&"']/g, (c) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;'
    }[c] || c));

  const safeQuery = escapeHtml(query.slice(0, 100)); // LinkedIn title limit
  
  // Use just the AI response snippet as description
  let enhancedDescription;
  if (snippet && snippet.trim() && query !== "CuriosAI - AI-Powered Search") {
    // Include just the snippet of the response
    const shortSnippet = snippet.slice(0, 120).trim();
    const needsEllipsis = snippet.length > 120 || !shortSnippet.endsWith('.') && !shortSnippet.endsWith('!') && !shortSnippet.endsWith('?');
    enhancedDescription = `${shortSnippet}${needsEllipsis ? '...' : ''}`;
  } else {
    enhancedDescription = "Discover insights with AI-powered search and analysis";
  }
  
  const safeSnippet = escapeHtml(enhancedDescription.slice(0, 155)); // LinkedIn description limit
  
  // Use dynamic OG image if not provided, fallback to static
  const baseUrl = "https://curiosai.com";
  const ogImage = image || 
    (query !== "CuriosAI - AI-Powered Search" 
      ? `${baseUrl}/.netlify/functions/og-image?query=${encodeURIComponent(query)}&snippet=${encodeURIComponent(snippet.slice(0, 200))}`
      : `${baseUrl}/og-image.png`);

  // Generate direct search results URL - where users should actually go
  const searchResultsUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
  
  // Generate shareable URL for this specific content (for LinkedIn crawling)
  const shareUrl = `${baseUrl}/.netlify/functions/share?query=${encodeURIComponent(query)}&snippet=${encodeURIComponent(snippet)}${image ? `&image=${encodeURIComponent(image)}` : ''}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${safeQuery}</title>
      <meta name="description" content="${safeSnippet}" />

      <!-- LinkedIn-Optimized Open Graph Meta Tags -->
      <meta property="og:title" content="${safeQuery}" />
      <meta property="og:description" content="${safeSnippet}" />
      <meta property="og:image" content="${ogImage}" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="627" />
      <meta property="og:url" content="${searchResultsUrl}" />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="CuriosAI" />

      <!-- LinkedIn specific meta tags -->
      <meta name="linkedin:owner" content="CuriosAI" />
      
      <!-- Twitter Card Support -->
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${safeQuery}" />
      <meta name="twitter:description" content="${safeSnippet}" />
      <meta name="twitter:image" content="${ogImage}" />

      <!-- Additional meta tags for better social sharing -->
      <meta name="author" content="CuriosAI" />
      <meta name="robots" content="index,follow" />

      ${!isBot ? `<!-- Immediate redirect to search results for real users -->
      <meta http-equiv="refresh" content="0; url=${searchResultsUrl}" />` : ''}
    </head>
    <body>
      ${!isBot ? `<script>
        // Immediate redirect to search results page for real users
        window.location.replace('${searchResultsUrl}');
      </script>
      <p>Redirecting to <a href="${searchResultsUrl}">CuriosAI search results</a>...</p>` : `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; text-align: center;">
        <h1>${safeQuery}</h1>
        <p>${safeSnippet}</p>
        <a href="${searchResultsUrl}" style="background: #0095FF; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View Full Results</a>
      </div>`}
    </body>
    </html>
  `;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300', // 5 minutes cache for social crawlers
    },
    body: html
  };
  } catch (error) {
    console.error('Share function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Error</h1><p>Function temporarily unavailable</p></body></html>`
    };
  }
};
