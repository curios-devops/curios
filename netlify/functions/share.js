// Simple Netlify Function for LinkedIn Sharing
exports.handler = async (event) => {
  // Get query parameters
  const query = event.queryStringParameters?.query || "CuriosAI - AI-Powered Search";
  const snippet = event.queryStringParameters?.snippet || "Get comprehensive AI-powered search results with insights, analysis, and curated information from multiple sources.";
  const image = event.queryStringParameters?.image || "";

  // Simple bot detection
  const userAgent = event.headers['user-agent'] || '';
  const isBot = /linkedinbot|facebookexternalhit|twitterbot|whatsapp|bot|crawler|spider|LinkedInBot/i.test(userAgent);
  
  console.log('🔍 Share Function Debug:');
  console.log('- Bot detected:', isBot);
  console.log('- User Agent:', userAgent);
  console.log('- Query:', query);
  console.log('- Snippet length:', snippet.length);
  console.log('- Snippet:', snippet.substring(0, 100) + (snippet.length > 100 ? '...' : ''));

  // Redirect humans to search page
  if (!isBot) {
    return {
      statusCode: 302,
      headers: {
        'Location': `https://curiosai.com/search?q=${encodeURIComponent(query)}`,
        'Cache-Control': 'no-cache'
      }
    };
  }

  // Simple HTML sanitization and length optimization
  const clean = (text) => text.replace(/[<>&"']/g, (c) => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'}[c] || c));
  
  const safeQuery = clean(query.slice(0, 100));
  let safeSnippet = clean(snippet.slice(0, 160));
  
  // Ensure snippet is in optimal range for LinkedIn (70-160 chars)
  if (safeSnippet.length < 70 && safeSnippet.length > 0) {
    safeSnippet = safeSnippet + ' - Explore comprehensive AI insights with CuriosAI.';
    if (safeSnippet.length > 160) {
      safeSnippet = safeSnippet.substring(0, 157) + '...';
    }
  }
  
  // Use provided image or generate dynamic one
  const ogImage = image || `https://curiosai.com/.netlify/functions/og-image?query=${encodeURIComponent(query)}&snippet=${encodeURIComponent(snippet.slice(0, 100))}`;
  
  // Generate share URL
  const shareUrl = `https://curiosai.com/.netlify/functions/share?query=${encodeURIComponent(query)}&snippet=${encodeURIComponent(snippet)}${image ? `&image=${encodeURIComponent(image)}` : ''}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeQuery}</title>

  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="${safeQuery}" />
  <meta name="description" property="og:description" content="${safeSnippet}" />
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
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
    <h1 style="color: #0095FF; margin-bottom: 20px;">CuriosAI</h1>
    <h2 style="color: #333; margin-bottom: 16px;">${safeQuery}</h2>
    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">${safeSnippet}</p>
    <a href="https://curiosai.com/search?q=${encodeURIComponent(query)}" style="background: #0095FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">Explore More with CuriosAI</a>
  </div>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    },
    body: html
  };
};
