// Debug endpoint to see what LinkedIn crawler is receiving
exports.handler = async (event) => {
  const query = event.queryStringParameters?.query || "Test Query";
  const snippet = event.queryStringParameters?.snippet || "This is a test snippet to see if LinkedIn can read it properly.";
  
  // Always return the HTML for debugging
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${query}</title>
      
      <!-- Simple meta tags for testing -->
      <meta property="og:title" content="${query}" />
      <meta property="og:description" content="${snippet}" />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://curiosai.com" />
      <meta property="og:image" content="https://curios.netlify.app/og-image.png" />
      <meta name="description" content="${snippet}" />
      
      <!-- Debug info -->
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .debug { background: #f0f0f0; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>Debug Share Page</h1>
      <div class="debug">
        <h3>Query:</h3>
        <p>${query}</p>
        
        <h3>Snippet:</h3>
        <p>${snippet}</p>
        
        <h3>User Agent:</h3>
        <p>${event.headers['user-agent'] || 'Not provided'}</p>
        
        <h3>All Headers:</h3>
        <pre>${JSON.stringify(event.headers, null, 2)}</pre>
      </div>
    </body>
    </html>
  `;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
    body: html
  };
};
