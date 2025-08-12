// Netlify Function for LinkedIn Sharing with Dynamic OG Meta Tags
exports.handler = async (event) => {
  // Get query parameters from the URL - these will come from real-time app data
  const query = event.queryStringParameters?.query || "CuriosAI - AI-Powered Search";
  const snippet = event.queryStringParameters?.snippet || "Discover insights with AI-powered search and analysis";
  const image = event.queryStringParameters?.image || "";

  // Check if this is a social media crawler or a human user
  const userAgent = event.headers['user-agent'] || '';
  const isBot = /linkedinbot|facebookexternalhit|twitterbot|whatsapp/i.test(userAgent);

  // If it's a human user, redirect immediately to the search page
  if (!isBot) {
    return {
      statusCode: 302,
      headers: {
        'Location': `https://curiosai.com/search?q=${encodeURIComponent(query)}`,
        'Cache-Control': 'no-cache'
      }
    };
  }

  // For bots/crawlers, serve the full HTML with meta tags
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
  const safeSnippet = escapeHtml(snippet.slice(0, 155)); // LinkedIn description limit
  
  // Use dynamic OG image if not provided, fallback to static
  const baseUrl = "https://curios.netlify.app";
  const ogImage = image || 
    (query !== "CuriosAI - AI-Powered Search" 
      ? `${baseUrl}/.netlify/functions/og-image?query=${encodeURIComponent(query)}&snippet=${encodeURIComponent(snippet.slice(0, 200))}`
      : `${baseUrl}/og-image.png`);

  // Generate shareable URL for this specific content
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
      
      <!-- Enhanced meta description for LinkedIn -->
      <meta name="description" content="${safeSnippet}" />

      <!-- Twitter Card Support -->
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${safeQuery}" />
      <meta name="twitter:description" content="${safeSnippet}" />
      <meta name="twitter:image" content="${ogImage}" />

      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          background: #f8f9fa;
          color: #333;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          text-align: center;
        }
        .logo {
          color: #0095FF;
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #1a1a1a;
        }
        .snippet {
          font-size: 16px;
          color: #666;
          line-height: 1.5;
          margin-bottom: 30px;
        }
        .cta {
          background: #0095FF;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          text-decoration: none;
          display: inline-block;
          transition: background 0.2s;
        }
        .cta:hover {
          background: #0080FF;
        }
        .footer {
          margin-top: 30px;
          font-size: 14px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">CuriosAI</div>
        <h1 class="title">${safeQuery}</h1>
        <p class="snippet">${safeSnippet}</p>
        <a href="https://curiosai.com/search?q=${encodeURIComponent(query)}" class="cta">Explore More with CuriosAI</a>
        <div class="footer">
          AI-powered search and insights
        </div>
      </div>
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
