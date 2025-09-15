// Netlify function to proxy OpenAI Images Generation API
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Following Netlify tutorial: only use OPENAI_API_KEY (no VITE_ prefix)
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 Debug: API key check - Length:', apiKey?.length, 'Starts with sk-:', apiKey?.startsWith('sk-'));
    if (!apiKey) {
      console.error('Missing OpenAI API key. Available env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI')));
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in Netlify environment variables.');
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    const orgId = process.env.OPENAI_ORG_ID;
    const projectId = process.env.OPENAI_PROJECT_ID;
    if (orgId) headers['OpenAI-Organization'] = orgId;
    if (projectId) headers['OpenAI-Project'] = projectId;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Images API error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: `OpenAI API error: ${response.status}`,
          details: errorText
        })
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('OpenAI Images proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message || 'OpenAI Images proxy failed',
        timestamp: new Date().toISOString()
      })
    };
  }
};
