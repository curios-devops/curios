// Simple hello world Netlify function for testing
exports.handler = async (event, context) => {
  console.log('🌟 Hello World function called!');
  console.log('📊 Event method:', event.httpMethod);
  console.log('📊 Event path:', event.path);
  console.log('📊 Query params:', event.queryStringParameters);

  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  // Simple response
  const response = {
    message: 'Hello World from Netlify!',
    timestamp: new Date().toISOString(),
    method: event.httpMethod,
    success: true,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      envVarCount: Object.keys(process.env).length
    }
  };

  console.log('✅ Sending response:', JSON.stringify(response, null, 2));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
};