import { Handler } from '@netlify/functions';

// Helper function to log request details
function logRequest(event: any) {
  console.log('=== Request Details ===');
  console.log('Method:', event.httpMethod);
  console.log('Path:', event.path);
  console.log('Headers:', JSON.stringify(event.headers, null, 2));
  console.log('Query Params:', JSON.stringify(event.queryStringParameters, null, 2));
  console.log('Body:', event.body ? JSON.parse(event.body) : null);
  console.log('Environment Variables:', {
    NODE_ENV: process.env.NODE_ENV,
    HAS_OPENAI_KEY: !!process.env.OPENAI_API_KEY,
    HAS_ORG_ID: !!process.env.OPENAI_ORG_ID,
    HAS_PROJECT_ID: !!process.env.OPENAI_PROJECT_ID
  });
  console.log('========================');
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, HEAD',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Vary': 'Origin',
  'Access-Control-Allow-Credentials': 'true',
};

export const handler: Handler = async (event) => {
  // Log incoming request
  logRequest(event);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No Content
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    const error = {
      error: 'Method Not Allowed',
      message: 'Only POST requests are supported',
      allowedMethods: ['POST', 'OPTIONS']
    };
    console.error('Method not allowed:', error);
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(error),
    };
  }

  try {
    // Parse request body
    let body: any;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      const error = {
        error: 'Bad Request',
        message: 'Invalid JSON in request body',
        details: e.message
      };
      console.error('Invalid JSON:', error);
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
      };
    }

    // Validate required fields
    const { query } = body;
    if (!query) {
      const error = {
        error: 'Bad Request',
        message: 'Missing required field: query',
        requiredFields: ['query']
      };
      console.error('Missing required field:', error);
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
      };
    }

    console.log(`Processing query: "${query}"`);

    // Check for required environment variables
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      console.error('OpenAI API key is not configured');
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Configuration Error',
          message: 'OpenAI API key is not configured',
          hint: 'Please set the OPENAI_API_KEY environment variable in your Netlify site settings',
        }),
      };
    }

    // Parse the query to extract system and user messages
    let systemPrompt = 'You are a helpful AI assistant.';
    let userMessage = query;
    
    // Check if the query contains a System: directive
    if (query.includes('System:')) {
      const parts = query.split('\n\nUser:');
      if (parts.length > 1) {
        systemPrompt = parts[0].replace('System:', '').trim();
        userMessage = parts[1].trim();
      }
    }

    console.log('Calling OpenAI Responses API with:', { systemPromptPreview: systemPrompt.slice(0, 60), userMessagePreview: userMessage.slice(0, 60) });

    // Call the modern OpenAI Responses API
    const openaiUrl = 'https://api.openai.com/v1/responses';

    console.log('Making request to OpenAI Responses API');
    const response = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
        ...(process.env.OPENAI_ORG_ID && { 'OpenAI-Organization': process.env.OPENAI_ORG_ID }),
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1',
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_output_tokens: 2000,
        // force text output to stay simple
        text: { format: { type: 'text' } }
      }),
      // @ts-ignore fetch on Netlify supports timeout
      timeout: 15000, // 15s
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Responses API error:', { status: response.status, errorText });
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Robustly extract plain text from Responses API
    let textContent = '';
    if (typeof data.text === 'string' && data.text.length > 0) {
      textContent = data.text;
    } else if (Array.isArray(data.output)) {
      // Find first message.output_text
      for (const item of data.output) {
        if (item?.type === 'message' && Array.isArray(item.content)) {
          const textNode = item.content.find((c: any) => c?.type === 'output_text' && typeof c.text === 'string');
          if (textNode?.text) { textContent = textNode.text; break; }
        }
      }
    }

    if (!textContent) {
      console.warn('Responses API returned no text content, using stringified body');
      textContent = JSON.stringify(data);
    }

    const result = {
      success: true,
      results: [{
        content: textContent,
        followUpQuestions: [],
        citations: []
      }],
      model: data.model,
      usage: data.usage ? {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.total_tokens
      } : undefined
    };

    console.log('OpenAI Responses API call successful', {
      model: data.model,
      total_tokens: data.usage?.total_tokens
    });

    console.log('Sending response:', JSON.stringify({
      ...result,
      results: result.results.map(r => ({
        ...r,
        content: r.content.substring(0, 120) + (r.content.length > 120 ? '...' : '')
      }))
    }, null, 2));
    
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    };
    
  } catch (error) {
    console.error('Unhandled error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }),
    };
  }
};
