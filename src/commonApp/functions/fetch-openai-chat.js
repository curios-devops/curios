// Netlify function using Chat Completions API (WORKING FALLBACK)
exports.handler = async (event, context) => {
  // Handle CORS
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { input, query, searchResults, model = 'gpt-4o-mini', ...rest } = requestBody;

    // Handle different input formats for swarm architecture
    let messages = [];

    if (query && searchResults) {
      // Swarm architecture: combine query with search results
      const searchContext = Array.isArray(searchResults) ? searchResults
        .slice(0, 5)
        .map((result, index) => `[${index + 1}] ${result.title}: ${result.content?.slice(0, 200)}...`)
        .join('\n\n') : '';
      
      messages = [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that provides comprehensive answers based on search results. Cite your sources when possible.'
        },
        {
          role: 'user',
          content: `Query: ${query}\n\nRelevant Search Results:\n${searchContext}\n\nPlease provide a comprehensive answer based on the search results above.`
        }
      ];
    } else if (input) {
      // Direct input format
      if (typeof input === 'string') {
        messages = [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: input }
        ];
      } else if (Array.isArray(input)) {
        messages = input;
      } else {
        messages = [
          { role: 'user', content: input.content || input.toString() }
        ];
      }
    } else {
      throw new Error('Either input or (query + searchResults) must be provided');
    }

    // Chat Completions API request
    const openAIRequestBody = {
      model: model,
      messages: messages,
      max_tokens: rest.max_tokens || 1500,
      temperature: rest.temperature ?? 0.7,
      top_p: rest.top_p ?? 1.0
    };

    console.log('Sending to OpenAI Chat Completions:', { model, messageCount: messages.length });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(openAIRequestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Chat Completions API error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: `OpenAI API error: ${response.status}`,
          details: errorText
        })
      };
    }

    const data = await response.json();
    console.log('Successfully received response from OpenAI Chat Completions');
    
    // Transform response to match expected format
    const transformedResponse = {
      output_text: data.choices[0]?.message?.content || '',
      usage: data.usage,
      model: data.model,
      id: data.id,
      created: data.created
    };
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify(transformedResponse)
    };
  } catch (error) {
    console.error('OpenAI Chat proxy error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: error.message || 'OpenAI Chat proxy failed',
        timestamp: new Date().toISOString()
      })
    };
  }
};
