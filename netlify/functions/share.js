// Ultra-simple LinkedIn Share Function - Retrofit from scratch
exports.handler = async (event, context) => {
  try {
    // Get URL parameters
    const query = event.queryStringParameters?.query || "CuriosAI Search";
    const snippet = event.queryStringParameters?.snippet || "Get AI-powered search insights and analysis";
    
    console.log('Share function called for query:', query.slice(0, 50));

    // Clean and truncate content for LinkedIn
    const title = query.slice(0, 60); // LinkedIn title limit
    const description = snippet.slice(0, 155); // LinkedIn description limit
    
    // Use static image for now to eliminate complexity
    const baseUrl = "https://curiosai.com";
    const ogImage = `${baseUrl}/og-image.svg`; // Use static fallback
    
    // Minimal HTML with only essential LinkedIn meta tags
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:url" content="${baseUrl}/search?q=${encodeURIComponent(query)}">
  <meta property="og:type" content="website">
  <meta http-equiv="refresh" content="1; url=${baseUrl}/search?q=${encodeURIComponent(query)}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <p><a href="${baseUrl}/search?q=${encodeURIComponent(query)}">View Results</a></p>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      },
      body: html
    };

  } catch (error) {
    console.error('Share function error:', error);
    return {
      statusCode: 500,
      body: 'Share error'
    };
  }
};
