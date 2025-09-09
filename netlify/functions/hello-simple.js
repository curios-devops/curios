exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({
      message: 'Hello from simple JavaScript function!',
      method: event.httpMethod,
      timestamp: new Date().toISOString(),
      path: event.path,
      queryStringParameters: event.queryStringParameters
    })
  };
};