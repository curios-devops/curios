// Supabase Edge Function for Brave Search API
// This function handles Brave Search API calls server-side for security
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

  console.log('🚀 Edge Function called:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  try {
    // Get the Brave API key from environment
    const braveApiKey = Deno.env.get('BRAVE_API_KEY');
    console.log('🔑 API Key check:', {
      hasKey: !!braveApiKey,
      keyLength: braveApiKey?.length || 0
    });

    if (!braveApiKey) {
      console.error('❌ BRAVE_API_KEY environment variable not found');
      return new Response(
        JSON.stringify({ error: 'Brave API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check for authorization header or allow anonymous access for API functions
    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('apikey');

    console.log('🔐 Auth check:', {
      hasAuthHeader: !!authHeader,
      hasApiKey: !!apiKey,
      authHeaderPrefix: authHeader?.substring(0, 20) + '...',
      apiKeyPrefix: apiKey?.substring(0, 10) + '...'
    });

    // Allow the request to proceed (anonymous access for API functions)
    console.log('✅ Authentication passed - allowing anonymous access for API function');

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

    let query, types;
    if (typeof requestBody === 'object' && Array.isArray(requestBody.types)) {
      query = requestBody.query;
      types = requestBody.types;
    } else {
      query = requestBody.query;
      types = [requestBody.type || 'web'];
    }

    if (!query) {
      console.error('❌ Query parameter missing');
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!Array.isArray(types) || types.length === 0) {
      types = ['web'];
    }

    console.log(`🔍 Processing multi-type search for query: "${query}", types: ${types.join(', ')}`);

    // Helper to build Brave API URL for each type
    function getApiUrl(type: string, query: string): string {
      if (type === 'web') {
        return `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&text_decorations=false&extra_snippets=true`;
      } else if (type === 'images') {
        return `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&safesearch=strict&count=20&search_lang=en&country=us&spellcheck=1`;
      } else if (type === 'news') {
        return `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=20&search_lang=en&country=us&spellcheck=1`;
      } else if (type === 'videos') {
        return `https://api.search.brave.com/res/v1/videos/search?q=${encodeURIComponent(query)}&count=20&search_lang=en&country=us&spellcheck=1`;
      }
      return '';
    }

    // Fetch all types in parallel
    const results: Record<string, any> = {};
    const errors: Record<string, any> = {};
    await Promise.all(types.map(async (type) => {
      const apiUrl = getApiUrl(type, query);
      if (!apiUrl) {
        errors[type] = 'Invalid type';
        return;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': braveApiKey
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          const errorText = await response.text();
          errors[type] = { status: response.status, details: errorText };
          return;
        }
        const data = await response.json();
        // Print a preview (first 1000 chars) of the Brave API response for this type
        const dataStr = JSON.stringify(data, null, 2);
        console.log(
          `🟢 Brave API PREVIEW for type '${type}':\n` +
          dataStr.substring(0, 1000) +
          (dataStr.length > 1000 ? '\n...TRUNCATED...' : '')
        );
        results[type] = data;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error) {
          errors[type] = fetchError.message;
        } else {
          errors[type] = String(fetchError) || 'Unknown error';
        }
      }
    }));

    // Return all results
    return new Response(JSON.stringify({
      success: true,
      query,
      types,
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

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
