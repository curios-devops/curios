// Netlify Function for LinkedIn Sharing with Dynamic OG Meta Tags
exports.handler = async (event) => {
  // Get query parameters from the URL - these will come from real-time app data
  const query = event.queryStringParameters?.query || "CuriosAI - AI-Powered Search";
  const snippet = event.queryStringParameters?.snippet || "Discover insights with AI-powered search and analysis";
  const image = event.queryStringParameters?.image || "";

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

      <!-- LinkedIn-Optimized Open Graph Meta Tags -->
      <meta property="og:title" content="${safeQuery}" />
      <meta property="og:description" content="${safeSnippet}" />
      <meta property="og:image" content="${ogImage}" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="627" />
      <meta property="og:url" content="${shareUrl}" />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="CuriosAI" />

      <!-- Twitter Card Support -->
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${safeQuery}" />
      <meta name="twitter:description" content="${safeSnippet}" />
      <meta name="twitter:image" content="${ogImage}" />

      <!-- Immediate redirect to search results -->
      <meta http-equiv="refresh" content="0; url=${searchResultsUrl}" />
    </head>
    <body>
      <script>
        // Immediate redirect to search results page
        window.location.replace('${searchResultsUrl}');
      </script>
      <p>Redirecting to <a href="${searchResultsUrl}">CuriosAI search results</a>...</p>
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
};
