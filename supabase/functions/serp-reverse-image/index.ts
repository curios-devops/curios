// Supabase Edge Function for SERP API Reverse Image Search
// This function handles SERP API calls server-side to avoid CORS issues
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-ignore: Deno is available in Supabase Edge Functions runtime
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚀 SERP Reverse Image Function called:', {
    method: req.method,
    url: req.url,
  });

  try {
    // Get the SERP API key from environment
    const serpApiKey = Deno.env.get('SERPAPI_KEY');
    console.log('🔑 API Key check:', {
      hasKey: !!serpApiKey,
      keyLength: serpApiKey?.length || 0
    });

    if (!serpApiKey) {
      console.error('❌ SERPAPI_KEY environment variable not found');
      return new Response(
        JSON.stringify({ error: 'SERP API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📝 Request body parsed:', requestBody);
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { imageUrl } = requestBody;

    if (!imageUrl) {
      console.error('❌ imageUrl parameter missing');
      return new Response(
        JSON.stringify({ error: 'imageUrl parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔍 Starting reverse image search for: ${imageUrl.substring(0, 100)}...`);

    // Build SERP API URL
    const apiUrl = new URL('https://serpapi.com/search.json');
    apiUrl.searchParams.set('engine', 'google_reverse_image');
    apiUrl.searchParams.set('image_url', imageUrl);
    apiUrl.searchParams.set('api_key', serpApiKey);

    console.log(`🌐 Calling SERP API: ${apiUrl.toString().replace(serpApiKey, 'REDACTED')}`);

    // Call SERP API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`📡 SERP API Response:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ SERP API error response:`, errorText);
        return new Response(
          JSON.stringify({
            error: 'SERP API request failed',
            status: response.status,
            details: errorText
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const data = await response.json();

      // Log preview of response
      const dataStr = JSON.stringify(data, null, 2);
      console.log(
        `🟢 SERP API Response PREVIEW:\n` +
        dataStr.substring(0, 1000) +
        (dataStr.length > 1000 ? '\n...TRUNCATED...' : '')
      );

      // Return the SERP API response
      return new Response(JSON.stringify({
        success: true,
        imageUrl,
        data
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('💥 Fetch error:', fetchError);
      
      let errorMessage = 'Unknown error';
      if (fetchError instanceof Error) {
        errorMessage = fetchError.message;
      } else if (typeof fetchError === 'string') {
        errorMessage = fetchError;
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to fetch from SERP API',
          details: errorMessage
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('💥 Edge function error:', error);
    let details = 'Unknown error';
    if (error instanceof Error) {
      details = error.message;
    } else if (typeof error === 'string') {
      details = error;
    }
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
