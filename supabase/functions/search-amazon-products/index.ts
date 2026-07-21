// deno-lint-ignore-file no-import-prefix
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { signPaapiRequest } from "../_shared/awsSigV4.ts";

/**
 * Supabase Edge Function: Search Amazon Products — US store only, no location/
 * region gating. Buy intent alone is enough to show the sponsor carousel,
 * regardless of where the buyer is (simplified from an earlier per-country/
 * per-store design — country detection and the Spain store were removed).
 *
 * Tries the Product Advertising API (PA-API 5.0, direct/signed) first; since real
 * PA-API Access/Secret Key credentials aren't configured yet, that attempt no-ops
 * and this falls straight through to SerpAPI's "amazon" engine + the US Associate
 * tag. No further fallback beyond that — an error or zero results just means an
 * empty product list, and the caller (FastSearchResults / legacy search) already
 * shows the regular image carousel instead.
 */

// @ts-ignore Deno.env is available in the Supabase Edge Functions runtime
const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');
// @ts-ignore
const AMAZON_US_STORE_ID = (Deno.env.get('AMAZON_US_STORE_ID') || '').trim();
// @ts-ignore
const AMAZON_US_ENABLED = (Deno.env.get('AMAZON_US_ENABLED') || '').trim().toLowerCase() === 'true';
// @ts-ignore
const PAAPI_ACCESS_KEY = Deno.env.get('PAAPI_US_ACCESS_KEY');
// @ts-ignore
const PAAPI_SECRET_KEY = Deno.env.get('PAAPI_US_SECRET_KEY');
// @ts-ignore
const PAAPI_PARTNER_TAG = Deno.env.get('PAAPI_US_PARTNER_TAG');

const DOMAIN = 'amazon.com';
const PAAPI_HOST = 'webservices.amazon.com';
const PAAPI_REGION = 'us-east-1';
const PAAPI_MARKETPLACE = 'www.amazon.com';

interface AmazonProductOut {
  asin: string;
  title: string;
  price: string;
  imageUrl: string;
  description: string;
  productUrl: string;
  rating: number | null;
  reviewCount: number | null;
}

interface PaapiItem {
  ASIN: string;
  DetailPageURL?: string;
  Images?: { Primary?: { Large?: { URL?: string } } };
  ItemInfo?: { Title?: { DisplayValue?: string }; Features?: { DisplayValues?: string[] } };
  Offers?: { Listings?: Array<{ Price?: { DisplayAmount?: string } }> };
}

/** Direct, signed PA-API 5.0 SearchItems call. Returns null when not configured. */
async function searchViaPaapi(query: string, maxResults: number): Promise<AmazonProductOut[] | null> {
  if (!PAAPI_ACCESS_KEY || !PAAPI_SECRET_KEY || !PAAPI_PARTNER_TAG) return null;

  const body = JSON.stringify({
    Keywords: query,
    ItemCount: Math.min(Math.max(maxResults, 1), 10),
    PartnerTag: PAAPI_PARTNER_TAG,
    PartnerType: 'Associates',
    Marketplace: PAAPI_MARKETPLACE,
    // Conservative resource list — an invalid entry 400s the whole request, so
    // ratings/reviews (unstable field name across API revisions) are left out.
    Resources: ['Images.Primary.Large', 'ItemInfo.Title', 'ItemInfo.Features', 'Offers.Listings.Price'],
  });

  const signed = await signPaapiRequest({
    accessKey: PAAPI_ACCESS_KEY,
    secretKey: PAAPI_SECRET_KEY,
    region: PAAPI_REGION,
    host: PAAPI_HOST,
    path: '/paapi5/searchitems',
    target: 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
    body,
  });

  const res = await fetch(signed.url, { method: 'POST', headers: signed.headers, body });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PA-API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const items: PaapiItem[] = data?.SearchResult?.Items || [];
  return items
    .filter((item) => !!item.ASIN)
    .map((item) => ({
      asin: item.ASIN,
      title: item.ItemInfo?.Title?.DisplayValue || 'Product',
      price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || 'N/A',
      imageUrl: item.Images?.Primary?.Large?.URL || '',
      description: item.ItemInfo?.Features?.DisplayValues?.slice(0, 2).join(' ') || item.ItemInfo?.Title?.DisplayValue || '',
      productUrl: item.DetailPageURL || `https://${PAAPI_MARKETPLACE}/dp/${item.ASIN}`,
      rating: null,
      reviewCount: null,
    }));
}

/** SerpAPI "amazon" engine fallback — used because PA-API credentials aren't configured yet. */
async function searchViaSerpApi(query: string, maxResults: number): Promise<AmazonProductOut[]> {
  if (!SERPAPI_API_KEY || !AMAZON_US_ENABLED || !AMAZON_US_STORE_ID) return [];

  const serpApiUrl = new URL('https://serpapi.com/search');
  serpApiUrl.searchParams.set('engine', 'amazon');
  serpApiUrl.searchParams.set('amazon_domain', DOMAIN);
  serpApiUrl.searchParams.set('k', query);
  serpApiUrl.searchParams.set('api_key', SERPAPI_API_KEY);

  const response = await fetch(serpApiUrl.toString());
  if (!response.ok) {
    console.error('[Amazon Products] SerpAPI request failed:', response.status, await response.text());
    return [];
  }

  const data = await response.json();
  const results = data.organic_results || [];
  const products: AmazonProductOut[] = [];

  for (let i = 0; i < Math.min(results.length, maxResults); i++) {
    const result = results[i];
    if (!result.asin) continue;

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
      productUrl: `https://www.${DOMAIN}/dp/${result.asin}?tag=${AMAZON_US_STORE_ID}`,
      rating,
      reviewCount,
    });
  }

  return products;
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
    const { query, maxResults = 4 } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let products: AmazonProductOut[] | null = null;
    try {
      products = await searchViaPaapi(query, maxResults);
    } catch (error) {
      console.warn('[Amazon Products] PA-API failed, falling back to SerpAPI:', error instanceof Error ? error.message : error);
      products = null;
    }

    const source = products !== null ? 'paapi' : 'serpapi';
    if (products === null) {
      products = await searchViaSerpApi(query, maxResults);
    }

    console.log('[Amazon Products] Found products:', products.length, 'via', source);

    return new Response(
      JSON.stringify({ success: true, products, query, domain: DOMAIN }),
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
