

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

  // This endpoint is deprecated and no longer processes OpenAI requests.
  return {
    statusCode: 501,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error: 'This endpoint is deprecated. All OpenAI completions must go through the Supabase Edge Function.',
    }),
  };
};
