// Simple direct test of share function
async function testShare() {
  console.log('Testing share function directly...');
  
  // Mock the function locally
  const handler = async (event, context) => {
    try {
      const query = event.queryStringParameters?.query || "CuriosAI - AI-Powered Search";
      const snippet = event.queryStringParameters?.snippet || "Discover insights with AI-powered search and analysis";
      const userAgent = event.headers['user-agent'] || '';
      const isBot = /bot|crawler|spider|facebookexternalhit|twitterbot|linkedinbot|whatsapp|slackbot/i.test(userAgent);
      
      console.log('Function called:', { query: query.slice(0, 30), isBot, userAgent: userAgent.slice(0, 50) });
      
      const baseUrl = "https://curiosai.com";
      const searchResultsUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
      
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>${query}</title>
  <meta property="og:title" content="${query}" />
  <meta property="og:description" content="${snippet}" />
  ${!isBot ? `<meta http-equiv="refresh" content="0; url=${searchResultsUrl}" />` : ''}
</head>
<body>
  ${!isBot ? `<script>window.location.replace('${searchResultsUrl}');</script>` : `<p>Content for bots</p>`}
</body>
</html>`;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: html
      };
    } catch (error) {
      console.error('Error:', error);
      return { statusCode: 500, body: 'Error' };
    }
  };
  
  // Test bot request
  const botEvent = {
    queryStringParameters: { query: 'test query', snippet: 'test snippet' },
    headers: { 'user-agent': 'LinkedInBot/1.0' }
  };
  
  const botResult = await handler(botEvent, {});
  console.log('Bot test result:', {
    status: botResult.statusCode,
    hasMetaRefresh: botResult.body.includes('meta http-equiv="refresh"'),
    hasJSRedirect: botResult.body.includes('window.location.replace'),
    hasOGTitle: botResult.body.includes('og:title')
  });
  
  // Test user request
  const userEvent = {
    queryStringParameters: { query: 'test query', snippet: 'test snippet' },
    headers: { 'user-agent': 'Mozilla/5.0' }
  };
  
  const userResult = await handler(userEvent, {});
  console.log('User test result:', {
    status: userResult.statusCode,
    hasMetaRefresh: userResult.body.includes('meta http-equiv="refresh"'),
    hasJSRedirect: userResult.body.includes('window.location.replace'),
    redirectsToSearch: userResult.body.includes('/search?q=')
  });
}

testShare().catch(console.error);
