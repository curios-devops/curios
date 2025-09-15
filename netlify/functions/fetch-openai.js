const { OpenAI } = require('openai');

// Ensure API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is not set');
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Organization and project headers are automatically handled by the SDK
  // when using environment variables OPENAI_ORG_ID and OPENAI_PROJECT_ID
});

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { 
      input, 
      model = 'gpt-4.1', // Updated to use gpt-4.1 as per official example
      temperature = 0.3,
      max_output_tokens = 2000, // Changed from max_completion_tokens
      response_format, // Will be converted to text.format
      reasoning_effort = 'medium'
    } = JSON.parse(event.body);

    if (!input) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Input is required' }),
      };
    }

    console.log('OpenAI Responses API call:', {
      model, 
      inputLength: typeof input === 'string' ? input.length : JSON.stringify(input).length 
    });

    // Use the official OpenAI Responses API format
    const requestParams = {
      model,
      input
    };

    // Add optional parameters only if provided
    if (temperature !== undefined) requestParams.temperature = temperature;
    if (max_output_tokens !== undefined) requestParams.max_output_tokens = max_output_tokens;
    
    // Note: reasoning_effort is not supported with gpt-4.1, so we don't include it
    // if (reasoning_effort) {
    //   requestParams.reasoning = { effort: reasoning_effort };
    // }
    
    // Handle response_format according to new API format
    if (response_format) {
      if (response_format.type === 'json_object') {
        requestParams.text = { format: { type: 'json_object' } };
      } else if (response_format.type === 'text') {
        requestParams.text = { format: { type: 'text' } };
      } else {
        // Default to text format
        requestParams.text = { format: { type: 'text' } };
      }
    }

    const response = await client.responses.create(requestParams);

    // Extract the output text according to the official API response format
    let output_text = '';
    
    // Handle the official response format from the example
    if (response.output && Array.isArray(response.output)) {
      const messageOutput = response.output.find(item => item.type === 'message');
      if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
        const textContent = messageOutput.content.find(content => content.type === 'output_text');
        if (textContent && textContent.text) {
          output_text = textContent.text;
        }
      }
    }

    // Log successful response
    console.log('OpenAI Responses API success:', {
      model: response.model,
      status: response.status,
      outputLength: output_text.length,
      usage: response.usage
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        content: output_text,
        output_text: output_text, // for backward compatibility
        model: response.model,
        usage: response.usage,
        response_id: response.id
      }),
    };

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to process request',
        details: error.message,
      }),
    };
  }
};
