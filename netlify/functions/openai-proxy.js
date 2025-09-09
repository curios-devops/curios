// Netlify function to proxy OpenAI API requests
import { OpenAI } from 'openai';

export const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Openai-Organization, Openai-Project',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const requestBody = JSON.parse(event.body || '{}');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Forward additional headers for organization/project if present
    const requestHeaders = {};
    if (event.headers['openai-organization']) {
      requestHeaders['OpenAI-Organization'] = event.headers['openai-organization'];
    }
    if (event.headers['openai-project']) {
      requestHeaders['OpenAI-Project'] = event.headers['openai-project'];
    }

    // Handle the responses API format
    const response = await openai.responses.create({
      ...requestBody,
      headers: requestHeaders,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: error.response?.data || null,
      }),
    };
  }
};
