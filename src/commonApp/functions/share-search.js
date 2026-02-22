// Simple function to handle search URLs and redirect crawlers to share function
exports.handler = async (event, context) => {
  try {
    const userAgent = event.headers['user-agent'] || '';
    const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}`);
    const query = url.searchParams.get('q') || url.searchParams.get('query') || '';
    const snippet = url.searchParams.get('snippet') || '';
    
    // Enhanced bot detection for LinkedIn and other crawlers
    const isBot = /bot|crawler|spider|facebookexternalhit|twitterbot|linkedinbot|whatsapp|slackbot|linkedin/i.test(userAgent) ||
                  userAgent === '' ||
                  !userAgent.includes('Mozilla');

    console.log('Share-search function called', {
      isBot,
      userAgent: userAgent.slice(0, 100),
      query: query.slice(0, 50),
      path: event.path
    });

    // If it's a bot and we have a query, redirect to share function
    if (isBot && query) {
      // Hotfix: point crawlers directly to Netlify function to avoid Supabase proxy/stale content.
      const shareUrl = `/.netlify/functions/social-share?query=${encodeURIComponent(query)}${snippet ? `&snippet=${encodeURIComponent(snippet)}` : ''}`;
      
      return {
        statusCode: 302,
        headers: {
          'Location': shareUrl
        },
        body: ''
      };
    }

    // For regular users, serve the normal search page (redirect to React app)
    return {
      statusCode: 302,
      headers: {
        'Location': `/search${url.search}`
      },
      body: ''
    };

  } catch (error) {
    console.error('Share-search function error:', error);
    
    // Fallback: redirect to home page
    return {
      statusCode: 302,
      headers: {
        'Location': '/'
      },
      body: ''
    };
  }
};
