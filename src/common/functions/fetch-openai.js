const process = require('node:process');
const { OpenAI } = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event, _context) => {
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
      response_format,
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
    
    // Handle reasoning_effort according to new API format
    if (reasoning_effort) {
      requestParams.reasoning = { effort: reasoning_effort };
    }
    
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

    // Extract the output text from the nested response structure
    let output_text = '';
    if (response.output && Array.isArray(response.output)) {
      const messageOutput = response.output.find(item => item.type === 'message' && item.content);
      if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
        const textContent = messageOutput.content.find(content => content.type === 'output_text' && content.text);
        if (textContent) {
          output_text = textContent.text;
        }
      }
    }

    // Fallback to response.output[0].content[0].text format if available
    if (!output_text && response.output && response.output[0] && response.output[0].content && response.output[0].content[0]) {
      output_text = response.output[0].content[0].text || '';
    }

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
        response: response
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
