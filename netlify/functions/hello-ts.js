// Netlify Function using CommonJS format as required
// Using Config export for reliable routing as per project memory

exports.handler = async (event, context) => {
  // Extract query parameters
  const queryParams = event.queryStringParameters || {};
  const name = queryParams.name || 'World';
  const message = queryParams.message || 'Hello';
  
  // Handle different HTTP methods
  if (event.httpMethod === 'POST') {
    try {
      const body = event.body || '';
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          method: 'POST',
          message: `${message}, ${name}!`,
          receivedBody: body,
          timestamp: new Date().toISOString(),
          path: event.path,
          functionName: 'hello-ts (CommonJS with Config)',
          routingMethod: 'Config export',
          success: true
        })
      };
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Invalid request body',
          message: error.message 
        })
      };
    }
  }
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }
  
  // Default GET response
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({
      method: event.httpMethod,
      message: `${message}, ${name}!`,
      timestamp: new Date().toISOString(),
      path: event.path,
      queryStringParameters: event.queryStringParameters,
      headers: event.headers,
      functionName: 'hello-ts (CommonJS with Config)',
      routingMethod: 'Config export',
      userAgent: event.headers['user-agent'],
      example_urls: {
        with_name: `${event.path}?name=Developer`,
        with_custom_message: `${event.path}?message=Greetings&name=TypeScript`,
        post_example: `POST to ${event.path} with JSON body`
      },
      netlify_context: {
        requestId: context.awsRequestId,
        functionName: context.functionName,
        functionVersion: context.functionVersion
      },
      success: true
    })
  };
};

// Export config for reliable routing - as per project memory
exports.config = {
  path: '/api/hello-ts'
};