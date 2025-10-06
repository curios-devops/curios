// supabase/functions/test-openai-key/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
console.info('Test OpenAI key server started');
// @ts-ignore
Deno.serve(async (req: Request) => {
  // @ts-ignore
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers
    });
  }
  if (!openAiKey) {
    return new Response(JSON.stringify({
      error: "OpenAI API key not found"
    }), {
      status: 500,
      headers
    });
  }
  const data = {
    apiKey: openAiKey
  };
  return new Response(JSON.stringify(data), {
    status: 200,
    headers
  });
});
