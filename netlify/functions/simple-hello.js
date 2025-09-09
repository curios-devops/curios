// Super simple CommonJS Netlify function for basic testing
exports.handler = async (event, context) => {
  console.log('🎯 Simple hello function called!');
  console.log('Method:', event.httpMethod);
  console.log('Path:', event.path);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    },
    body: 'Hello from simple function!'
  };
};