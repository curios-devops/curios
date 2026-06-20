// Netlify function to proxy Brave Images Search API
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    };
  }

  const { q, safesearch, count, search_lang, country, spellcheck } = event.queryStringParameters || {};
  
  if (!q) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Query parameter q is required' })
    };
  }

  try {
    const apiKey = process.env.BRAVE_API_KEY || process.env.VITE_BRAVE_API_KEY;
    if (!apiKey) {
      throw new Error('Brave API key not configured');
    }

    const params = new URLSearchParams({
      q,
      safesearch: safesearch || 'strict',
      count: count || '20',
      search_lang: search_lang || 'en',
      country: country || 'us',
      spellcheck: spellcheck || '1'
    });

    const response = await fetch(`https://api.search.brave.com/res/v1/images/search?${params}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Brave images search error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message || 'Brave images search failed',
        timestamp: new Date().toISOString()
      })
    };
  }
};
