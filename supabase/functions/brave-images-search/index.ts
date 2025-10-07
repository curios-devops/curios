// Removed Deno triple-slash reference for local TypeScript compatibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

console.log("Brave Images Search function up and running!")

// @ts-ignore
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    
    console.log('🚀 Brave Images Search called with query:', query);
    
    if (!query) {
      console.error('❌ No query provided');
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // @ts-ignore
    const BRAVE_API_KEY = Deno.env.get('BRAVE_API_KEY')
    console.log('🔑 API Key check:', {
      hasKey: !!BRAVE_API_KEY,
      keyLength: BRAVE_API_KEY?.length || 0
    });
    
    if (!BRAVE_API_KEY) {
      console.error('❌ BRAVE_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Brave API key not configured. Please set BRAVE_API_KEY environment variable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Calling Brave Images API with query:', query)
    
    // Call Brave Images Search API following official documentation
    const braveUrl = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=20&safesearch=strict&search_lang=en&country=us&spellcheck=1`
    
    console.log('Brave Images API URL:', braveUrl)
    
    const braveResponse = await fetch(braveUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    })

    if (!braveResponse.ok) {
      const errorText = await braveResponse.text()
      console.error('Brave Images API error:', braveResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `Brave Images API error: ${braveResponse.status}`,
          details: errorText 
        }),
        { status: braveResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const braveData = await braveResponse.json()
    
    // Return the raw Brave Images API response
    return new Response(
      JSON.stringify(braveData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in brave-images-search:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})