// Exa web search proxy. The browser can't call api.exa.ai directly (no CORS,
// and it would expose the key), so this edge function makes the call
// server-side and returns Exa's raw JSON. Mirrors brave-web-search.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

console.log("Exa Search function up and running!")

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, numResults = 10 } = await req.json()

    if (!query || typeof query !== 'string' || !query.trim()) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // @ts-ignore
    const EXA_API_KEY = Deno.env.get('EXA_API_KEY')
    if (!EXA_API_KEY) {
      console.error('❌ EXA_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Exa API key not configured. Please set EXA_API_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const exaResponse = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': EXA_API_KEY,
      },
      body: JSON.stringify({
        query: query.trim(),
        type: 'auto',
        numResults,
        contents: { text: { maxCharacters: 600 } },
      }),
    })

    if (!exaResponse.ok) {
      const errorText = await exaResponse.text()
      console.error('Exa API error:', exaResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: `Exa API error: ${exaResponse.status}`, details: errorText }),
        { status: exaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const exaData = await exaResponse.json()
    return new Response(
      JSON.stringify(exaData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in exa-search:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
