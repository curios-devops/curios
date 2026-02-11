import "jsr:@supabase/functions-js/edge-runtime.d.ts"

/**
 * Supabase Edge Function: Google Images Light Search via SerpAPI
 * Searches for images based on text queries using Google Images Light API
 */

const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');

interface GoogleImagesLightResponse {
  search_metadata: {
    id: string;
    status: string;
    created_at: string;
    processed_at: string;
    total_time_taken: number;
  };
  search_parameters: {
    engine: string;
    q: string;
    google_domain: string;
    hl: string;
    gl: string;
    device: string;
  };
  search_information: {
    image_results_state: string;
  };
  images_results: Array<{
    position: number;
    title: string;
    source: string;
    link: string;
    original: string;
    original_width: number;
    original_height: number;
    thumbnail: string;
    serpapi_thumbnail?: string;
  }>;
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate API key
    if (!SERPAPI_API_KEY) {
      console.error('[Google Images Search] SERPAPI_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          images: [],
          error: 'SerpAPI not configured' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { query, count = 10, hl = 'en', gl = 'us' } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build SerpAPI request URL for Google Images Light
    const serpApiUrl = new URL('https://serpapi.com/search');
    serpApiUrl.searchParams.set('engine', 'google_images_light');
    serpApiUrl.searchParams.set('q', query);
    serpApiUrl.searchParams.set('hl', hl); // Language (e.g., 'en')
    serpApiUrl.searchParams.set('gl', gl); // Country (e.g., 'us')
    serpApiUrl.searchParams.set('api_key', SERPAPI_API_KEY);

    console.log('[Google Images Search] Searching:', { query, count, hl, gl });

    // Make request to SerpAPI
    const response = await fetch(serpApiUrl.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Google Images Search] Request failed:', response.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          images: [],
          query,
          error: `SerpAPI error: ${response.status}` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: GoogleImagesLightResponse = await response.json();
    
    console.log('[Google Images Search] Response received:', {
      has_images: !!data.images_results,
      images_count: data.images_results?.length || 0,
      status: data.search_metadata?.status
    });

    // Extract and transform images
    const images = [];
    const results = data.images_results || [];
    
    if (results.length === 0) {
      console.warn('[Google Images Search] No images_results found');
    }

    // Limit to requested count
    for (let i = 0; i < Math.min(results.length, count); i++) {
      const result = results[i];
      
      // Transform to our standard format (compatible with BraveImage)
      images.push({
        url: result.original, // Full resolution image URL
        title: result.title,
        source: result.link, // Source page URL
        thumbnail: result.thumbnail,
        width: result.original_width,
        height: result.original_height,
        position: result.position
      });
    }

    console.log('[Google Images Search] Returning:', {
      query,
      images_returned: images.length,
      images_available: results.length
    });

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        query,
        images,
        total_available: results.length,
        returned: images.length
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Google Images Search] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        images: [],
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
