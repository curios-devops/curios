// Basic test function - simplest possible implementation with Config export
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Hello from basic test function!',
      method: event.httpMethod,
      timestamp: new Date().toISOString(),
      path: event.path,
      routingMethod: 'Config export',
      working: true
    })
  };
};

// Export config for reliable routing
exports.config = {
  path: '/api/test-basic'
};