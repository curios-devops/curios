// Pexels Search Edge Function
// Securely proxies Pexels API calls to prevent API key exposure
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

console.log("Pexels Search function up and running!")

// @ts-ignore: Deno runtime
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, type = 'videos', perPage = 5, orientation = 'portrait' } = await req.json()
    
    console.log('🎬 Pexels Search called:', { query, type, perPage, orientation });
    
    if (!query) {
      console.error('❌ No query provided');
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // @ts-ignore: Deno environment variable
    const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY')
    console.log('🔑 API Key check:', {
      hasKey: !!PEXELS_API_KEY,
      keyLength: PEXELS_API_KEY?.length || 0
    });
    
    if (!PEXELS_API_KEY) {
      console.error('❌ PEXELS_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Pexels API key not configured. Please set PEXELS_API_KEY environment variable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine API endpoint based on type
    const baseUrl = type === 'videos' 
      ? 'https://api.pexels.com/videos/search'
      : 'https://api.pexels.com/v1/search';

    // Build query parameters
    const params = new URLSearchParams({
      query,
      per_page: perPage.toString(),
      ...(type === 'photos' && orientation ? { orientation } : {})
    });

    const pexelsUrl = `${baseUrl}?${params}`;
    console.log('📡 Calling Pexels API:', pexelsUrl);
    
    const pexelsResponse = await fetch(pexelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': PEXELS_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!pexelsResponse.ok) {
      const errorText = await pexelsResponse.text();
      console.error('Pexels API error:', pexelsResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Pexels API error: ${pexelsResponse.status}`,
          details: errorText 
        }),
        { status: pexelsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const pexelsData = await pexelsResponse.json();
    
    console.log('✅ Pexels search successful:', {
      type,
      totalResults: type === 'videos' ? pexelsData.total_results : pexelsData.total_results,
      returned: type === 'videos' ? pexelsData.videos?.length : pexelsData.photos?.length
    });
    
    // Return the raw Pexels API response
    return new Response(
      JSON.stringify(pexelsData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in pexels-search:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
