import "jsr:@supabase/functions-js/edge-runtime.d.ts"

/**
 * Supabase Edge Function: Search Amazon Products via SerpAPI
 */

const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');
const AMAZON_STORE_ID = Deno.env.get('AMAZON_STORE_ID') || '';

// ISO 3166-1 alpha-2 country → Amazon marketplace domain. Products from amazon.com
// are frequently unshippable to non-US buyers ("This item cannot be shipped to your
// selected delivery location"); searching the buyer's own marketplace instead returns
// products that domain actually delivers. Unmapped/unknown countries fall back to the
// US marketplace (previous, only) behavior.
//
// NOTE — affiliate tag: AMAZON_STORE_ID is a single Associates tag. Amazon's Associates
// program is region-specific — a US tag is NOT valid on amazon.es/de/fr/etc (the EU
// Associates program covers many EU domains with one tag, but non-EU marketplaces like
// amazon.co.jp/amazon.com.au need their own separate registration). Appending the same
// AMAZON_STORE_ID to every marketplace's URL only earns a referral fee on the domain(s)
// it's actually registered for — this does not (and, from an edge function, cannot)
// verify that.
const AMAZON_DOMAINS: Record<string, string> = {
  US: 'amazon.com',
  CA: 'amazon.ca',
  MX: 'amazon.com.mx',
  BR: 'amazon.com.br',
  GB: 'amazon.co.uk',
  UK: 'amazon.co.uk',
  IE: 'amazon.ie',
  DE: 'amazon.de',
  FR: 'amazon.fr',
  IT: 'amazon.it',
  ES: 'amazon.es',
  NL: 'amazon.nl',
  SE: 'amazon.se',
  PL: 'amazon.pl',
  BE: 'amazon.com.be',
  TR: 'amazon.com.tr',
  AE: 'amazon.ae',
  SA: 'amazon.sa',
  EG: 'amazon.eg',
  IN: 'amazon.in',
  JP: 'amazon.co.jp',
  SG: 'amazon.sg',
  AU: 'amazon.com.au',
};

function resolveAmazonDomain(country?: string): string {
  const code = (country || '').trim().toUpperCase();
  return AMAZON_DOMAINS[code] || 'amazon.com';
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
    const { query, maxResults = 4, country } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const domain = resolveAmazonDomain(country);

    // Build SerpAPI request URL
    const serpApiUrl = new URL('https://serpapi.com/search');
    serpApiUrl.searchParams.set('engine', 'amazon');
    serpApiUrl.searchParams.set('amazon_domain', domain);
    serpApiUrl.searchParams.set('k', query);
    serpApiUrl.searchParams.set('api_key', SERPAPI_API_KEY);

    console.log('[Amazon Products] Searching:', query, 'domain:', domain, 'country:', country || '(none)');

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

      // Build affiliate URL on the RESOLVED marketplace domain (not hardcoded .com) —
      // otherwise a Spain buyer gets an amazon.com link the item can't ship to.
      const productUrl = AMAZON_STORE_ID
        ? `https://www.${domain}/dp/${result.asin}?tag=${AMAZON_STORE_ID}`
        : result.link || `https://www.${domain}/dp/${result.asin}`;

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
        query: query,
        domain: domain
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
