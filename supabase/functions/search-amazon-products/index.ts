import "jsr:@supabase/functions-js/edge-runtime.d.ts"

/**
 * Supabase Edge Function: Search Amazon Products via SerpAPI
 */

const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');
const AMAZON_STORE_ID = Deno.env.get('AMAZON_STORE_ID') || '';

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
      console.error('[Amazon Products] SERPAPI_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          products: [],
          error: 'SerpAPI not configured' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { query, maxResults = 4 } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build SerpAPI request URL
    const serpApiUrl = new URL('https://serpapi.com/search');
    serpApiUrl.searchParams.set('engine', 'amazon');
    serpApiUrl.searchParams.set('amazon_domain', 'amazon.com');
    serpApiUrl.searchParams.set('k', query);
    serpApiUrl.searchParams.set('api_key', SERPAPI_API_KEY);

    console.log('[Amazon Products] Searching:', query);

    // Make request to SerpAPI
    const response = await fetch(serpApiUrl.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Amazon Products] Request failed:', response.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          products: [],
          query,
          error: `SerpAPI error: ${response.status}` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    console.log('[Amazon Products] Response received:', {
      has_organic_results: !!data.organic_results,
      organic_count: data.organic_results?.length || 0
    });

    // Extract products from SerpAPI response
    const products = [];
    const results = data.organic_results || [];
    
    if (results.length === 0) {
      console.warn('[Amazon Products] No organic_results found');
    }

    for (let i = 0; i < Math.min(results.length, maxResults); i++) {
      const result = results[i];
      
      // Skip if no ASIN
      if (!result.asin) continue;

      // Build affiliate URL
      const productUrl = AMAZON_STORE_ID
        ? `https://www.amazon.com/dp/${result.asin}?tag=${AMAZON_STORE_ID}`
        : result.link || `https://www.amazon.com/dp/${result.asin}`;

      // Extract price
      let price = 'N/A';
      if (result.price) {
        price = result.price;
      } else if (result.price_string) {
        price = result.price_string;
      }

      // Extract rating
      let rating = null;
      if (result.rating) {
        rating = parseFloat(result.rating);
      }

      // Extract review count
      let reviewCount = null;
      if (result.reviews) {
        const match = String(result.reviews).match(/[\d,]+/);
        if (match) {
          reviewCount = parseInt(match[0].replace(/,/g, ''), 10);
        }
      } else if (result.reviews_count) {
        reviewCount = result.reviews_count;
      }

      products.push({
        asin: result.asin,
        title: result.title || 'Product',
        price: price,
        imageUrl: result.thumbnail || result.image || '',
        description: result.snippet || result.description || `${result.title} - Available on Amazon`,
        productUrl: productUrl,
        rating: rating,
        reviewCount: reviewCount
      });
    }

    console.log('[Amazon Products] Found products:', products.length);

    return new Response(
      JSON.stringify({
        success: true,
        products: products,
        query: query
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Amazon Products] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        products: [],
        query: '',
        error: `Server error: ${error.message || 'Unknown error'}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
