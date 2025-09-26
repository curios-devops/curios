import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q');
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter q is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const apiKey = Deno.env.get('BRAVE_API_KEY') || Deno.env.get('VITE_BRAVE_API_KEY');
    if (!apiKey) {
      throw new Error('Brave API key not configured');
    }

    const params = new URLSearchParams({
      q: query,
      safesearch: url.searchParams.get('safesearch') || 'strict',
      count: url.searchParams.get('count') || '20',
      search_lang: url.searchParams.get('search_lang') || 'en',
      country: url.searchParams.get('country') || 'us',
      spellcheck: url.searchParams.get('spellcheck') || '1'
    });

    const response = await fetch(`https://api.search.brave.com/res/v1/images/search?${params}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Brave images search error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Brave images search failed',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
