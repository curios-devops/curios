// Debug function to see what headers LinkedIn sends
exports.handler = async (event, context) => {
  const headers = event.headers || {};
  const query = event.queryStringParameters?.query || "Test LinkedIn Debug";
  
  console.log('DEBUG: LinkedIn crawler detected headers:', {
    userAgent: headers['user-agent'],
    referer: headers['referer'] || headers['referrer'],
    accept: headers['accept'],
    secFetchSite: headers['sec-fetch-site'],
    secFetchMode: headers['sec-fetch-mode'],
    secFetchDest: headers['sec-fetch-dest'],
    allHeaders: Object.keys(headers)
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${query} - Debug Headers</title>
  <meta name="description" content="This is a test page to debug LinkedIn crawler headers and behavior">
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="${query} - Debug Headers">
  <meta property="og:description" content="This is a test page to debug LinkedIn crawler headers and behavior">
  <meta property="og:image" content="https://curiosai.com/og-image.png">
  <meta property="og:url" content="${event.headers.host ? `https://${event.headers.host}${event.path}` : 'https://curiosai.com'}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="CuriosAI">
</head>
<body>
  <h1>${query} - Debug Headers</h1>
  <p>This is a test page to debug LinkedIn crawler headers and behavior</p>
  <pre>User-Agent: ${headers['user-agent'] || 'N/A'}</pre>
  <pre>Referer: ${headers['referer'] || headers['referrer'] || 'N/A'}</pre>
  <pre>Accept: ${headers['accept'] || 'N/A'}</pre>
  <pre>All Headers: ${JSON.stringify(headers, null, 2)}</pre>
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
};
