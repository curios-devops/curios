// Tavily web search proxy. Keeps TAVILY_API_KEY server-side (it used to ship in the
// browser bundle as VITE_TAVILY_API_KEY) and returns Tavily's raw JSON. Mirrors exa-search.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, searchDepth = 'basic' } = await req.json()

    if (!query || typeof query !== 'string' || !query.trim()) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // @ts-ignore
    const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY')
    if (!TAVILY_API_KEY) {
      console.error('❌ TAVILY_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Tavily API key not configured. Please set TAVILY_API_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query.trim(),
        search_depth: searchDepth === 'advanced' ? 'advanced' : 'basic', // advanced costs more
        max_results: 10,
        include_images: true,
        include_image_descriptions: true,
        include_answer: false,
        chunks_per_source: 1,
      }),
    })

    if (!tavilyResponse.ok) {
      const errorText = await tavilyResponse.text()
      console.error('Tavily API error:', tavilyResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: `Tavily API error: ${tavilyResponse.status}`, details: errorText }),
        { status: tavilyResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tavilyData = await tavilyResponse.json()
    return new Response(
      JSON.stringify(tavilyData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in tavily-search:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
