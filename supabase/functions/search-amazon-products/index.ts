// deno-lint-ignore-file no-import-prefix
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

/**
 * Supabase Edge Function: Search Amazon Products via SerpAPI, gated per-store.
 *
 * Each "store" (US, ES, ...) has its own Associate tag and an ON/OFF flag. A buyer
 * only sees the sponsor carousel if their detected country matches an ENABLED
 * store's country — a country whose store is OFF, or that doesn't match any
 * configured store at all, gets an empty result and the caller falls back to the
 * regular image carousel. No cross-store fallback (a US buyer never sees ES ads).
 *
 * NOTE: this uses SerpAPI's "amazon" engine (not a direct PA-API call) — direct
 * PA-API (AWS-signed) code exists in git history / _shared/awsSigV4.ts and can be
 * wired back in once real PA-API Access/Secret Key credentials are available; for
 * now only a plain Associates tag (Store ID) is configured per store, which is all
 * SerpAPI + a manually-built affiliate URL needs.
 */

// @ts-ignore Deno.env is available in the Supabase Edge Functions runtime
const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');

interface Store {
  /** ISO 3166-1 alpha-2 countries this store serves. */
  countries: string[];
  domain: string;
  storeId: string;
  enabled: boolean;
}

function readStore(prefix: 'AMAZON_US' | 'AMAZON_ES', domain: string, countries: string[]): Store {
  // @ts-ignore
  const storeId = (Deno.env.get(`${prefix}_STORE_ID`) || '').trim();
  // @ts-ignore
  const enabled = (Deno.env.get(`${prefix}_ENABLED`) || '').trim().toLowerCase() === 'true';
  return { countries, domain, storeId, enabled: enabled && !!storeId };
}

// Add a new store here (+ its two env vars) to open a new market — no other code changes needed.
const STORES: Store[] = [
  readStore('AMAZON_US', 'amazon.com', ['US']),
  readStore('AMAZON_ES', 'amazon.es', ['ES']),
];

function resolveStore(country?: string): Store | null {
  const code = (country || '').trim().toUpperCase();
  return STORES.find((s) => s.enabled && s.countries.includes(code)) || null;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { query, maxResults = 4, country } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const store = resolveStore(country);
    console.log('[Amazon Products] Searching:', query, 'country:', country || '(none)', 'store:', store?.domain || '(none open for this country)');

    if (!store) {
      // No open store for this buyer's country — no external call at all.
      // The caller falls back to the regular image carousel.
      return new Response(
        JSON.stringify({ success: false, products: [], query, error: 'No store open for this region' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SERPAPI_API_KEY) {
      console.error('[Amazon Products] SERPAPI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, products: [], query, error: 'SerpAPI not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serpApiUrl = new URL('https://serpapi.com/search');
    serpApiUrl.searchParams.set('engine', 'amazon');
    serpApiUrl.searchParams.set('amazon_domain', store.domain);
    serpApiUrl.searchParams.set('k', query);
    serpApiUrl.searchParams.set('api_key', SERPAPI_API_KEY);

    const response = await fetch(serpApiUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Amazon Products] Request failed:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, products: [], query, domain: store.domain, error: `SerpAPI error: ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const results = data.organic_results || [];

    const products = [];
    for (let i = 0; i < Math.min(results.length, maxResults); i++) {
      const result = results[i];
      if (!result.asin) continue;

      const productUrl = `https://www.${store.domain}/dp/${result.asin}?tag=${store.storeId}`;

      let price = 'N/A';
      if (result.price) price = result.price;
      else if (result.price_string) price = result.price_string;

      let rating: number | null = null;
      if (result.rating) rating = parseFloat(result.rating);

      let reviewCount: number | null = null;
      if (result.reviews) {
        const match = String(result.reviews).match(/[\d,]+/);
        if (match) reviewCount = parseInt(match[0].replace(/,/g, ''), 10);
      } else if (result.reviews_count) {
        reviewCount = result.reviews_count;
      }

      products.push({
        asin: result.asin,
        title: result.title || 'Product',
        price,
        imageUrl: result.thumbnail || result.image || '',
        description: result.snippet || result.description || `${result.title} - Available on Amazon`,
        productUrl,
        rating,
        reviewCount,
      });
    }

    console.log('[Amazon Products] Found products:', products.length, 'via', store.domain);

    return new Response(
      JSON.stringify({ success: true, products, query, domain: store.domain }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Amazon Products] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        products: [],
        query: '',
        error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
