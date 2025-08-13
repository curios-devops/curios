// Simple test function to debug LinkedIn crawling
exports.handler = async (event) => {
  const query = event.queryStringParameters?.query || "Test Query";
  const snippet = event.queryStringParameters?.snippet || "This is a test snippet for LinkedIn crawling.";
  
  // Always return HTML (no bot detection for testing)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${query}</title>
  
  <!-- Simple meta tags for debugging -->
  <meta property="og:title" content="${query}" />
  <meta property="og:description" content="${snippet}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://curiosai.com" />
  <meta property="og:image" content="https://curiosai.com/og-image.svg" />
  <meta property="og:site_name" content="CuriosAI" />
  
  <!-- Multiple description formats -->
  <meta name="description" content="${snippet}" />
  <meta name="twitter:description" content="${snippet}" />
  <meta itemprop="description" content="${snippet}" />
  
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto; }
    .debug { background: #e3f2fd; padding: 10px; margin: 10px 0; border-radius: 4px; }
    .success { color: #2e7d32; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 LinkedIn Share Test Page</h1>
    
    <div class="debug">
      <h3>Query:</h3>
      <p>${query}</p>
    </div>
    
    <div class="debug">
      <h3>Snippet:</h3>
      <p>${snippet}</p>
    </div>
    
    <div class="debug">
      <h3>User Agent:</h3>
      <p>${event.headers['user-agent'] || 'Not provided'}</p>
    </div>
    
    <div class="debug">
      <h3 class="success">✅ Meta Tags Status:</h3>
      <p>✅ og:title: ${query}</p>
      <p>✅ og:description: ${snippet}</p>
      <p>✅ og:image: Set to CuriosAI logo</p>
      <p>✅ Multiple description formats included</p>
    </div>
    
    <p><strong>This page should show proper previews on LinkedIn with the snippet above.</strong></p>
  </div>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    body: html
  };
};
