// deno-lint-ignore-file no-import-prefix
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { signPaapiRequest } from "../_shared/awsSigV4.ts";

/**
 * Supabase Edge Function: Search Amazon Products via the Product Advertising API
 * (PA-API 5.0) — a DIRECT, signed call to Amazon's own API, not a third-party
 * scraper. Two separate Associates accounts/credential sets are supported (US and
 * EU); the buyer's detected country picks which one signs the request, and which
 * EU marketplace (amazon.es, amazon.de, ...) to query within the EU account.
 * Everything not recognized as European defaults to the US account/marketplace.
 *
 * No SerpAPI fallback by design: if PA-API errors or finds nothing, this returns
 * an empty product list and the caller (FastSearchResults / legacy search) already
 * falls back to the regular image carousel — no extra API spend on a second
 * provider for the same query.
 */

interface PaapiAccount {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
}

function readAccount(prefix: 'PAAPI_US' | 'PAAPI_EU'): PaapiAccount | null {
  // @ts-ignore
  const accessKey = Deno.env.get(`${prefix}_ACCESS_KEY`);
  // @ts-ignore
  const secretKey = Deno.env.get(`${prefix}_SECRET_KEY`);
  // @ts-ignore
  const partnerTag = Deno.env.get(`${prefix}_PARTNER_TAG`);
  if (!accessKey || !secretKey || !partnerTag) return null;
  return { accessKey, secretKey, partnerTag };
}

// Countries covered by Amazon's EU Associates/PA-API program — one account can sign
// requests against any of these marketplaces. Everything else (including unmapped/
// unknown countries) defaults to the US account+marketplace.
const EU_MARKETPLACES: Record<string, { host: string; marketplace: string }> = {
  GB: { host: 'webservices.amazon.co.uk', marketplace: 'www.amazon.co.uk' },
  UK: { host: 'webservices.amazon.co.uk', marketplace: 'www.amazon.co.uk' },
  IE: { host: 'webservices.amazon.ie', marketplace: 'www.amazon.ie' },
  DE: { host: 'webservices.amazon.de', marketplace: 'www.amazon.de' },
  FR: { host: 'webservices.amazon.fr', marketplace: 'www.amazon.fr' },
  IT: { host: 'webservices.amazon.it', marketplace: 'www.amazon.it' },
  ES: { host: 'webservices.amazon.es', marketplace: 'www.amazon.es' },
  NL: { host: 'webservices.amazon.nl', marketplace: 'www.amazon.nl' },
  SE: { host: 'webservices.amazon.se', marketplace: 'www.amazon.se' },
  PL: { host: 'webservices.amazon.pl', marketplace: 'www.amazon.pl' },
  BE: { host: 'webservices.amazon.com.be', marketplace: 'www.amazon.com.be' },
  TR: { host: 'webservices.amazon.com.tr', marketplace: 'www.amazon.com.tr' },
};

const US_MARKETPLACE = { host: 'webservices.amazon.com', marketplace: 'www.amazon.com' };

interface ResolvedRoute {
  region: 'us-east-1' | 'eu-west-1';
  account: 'US' | 'EU';
  host: string;
  marketplace: string;
  domain: string; // e.g. "amazon.es" — for building fallback product URLs
}

function resolveRoute(country?: string): ResolvedRoute {
  const code = (country || '').trim().toUpperCase();
  const eu = EU_MARKETPLACES[code];
  if (eu) {
    return { region: 'eu-west-1', account: 'EU', ...eu, domain: eu.marketplace.replace(/^www\./, '') };
  }
  return { region: 'us-east-1', account: 'US', ...US_MARKETPLACE, domain: 'amazon.com' };
}

interface PaapiItem {
  ASIN: string;
  DetailPageURL?: string;
  Images?: { Primary?: { Large?: { URL?: string } } };
  ItemInfo?: { Title?: { DisplayValue?: string }; Features?: { DisplayValues?: string[] } };
  Offers?: { Listings?: Array<{ Price?: { DisplayAmount?: string } }> };
}

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

/** Direct, signed PA-API 5.0 SearchItems call — no third-party scraper involved. */
async function searchPaapi(
  query: string,
  maxResults: number,
  route: ResolvedRoute,
  account: PaapiAccount,
): Promise<AmazonProductOut[]> {
  const body = JSON.stringify({
    Keywords: query,
    ItemCount: Math.min(Math.max(maxResults, 1), 10), // PA-API caps SearchItems at 10 per page
    PartnerTag: account.partnerTag,
    PartnerType: 'Associates',
    Marketplace: route.marketplace,
    // Kept deliberately conservative: every entry here must be a currently-valid
    // PA-API resource name or the ENTIRE request 400s. Ratings/reviews resources
    // have shifted across API revisions, so they're left out rather than guessed —
    // rating/reviewCount below are simply null when using this path.
    Resources: ['Images.Primary.Large', 'ItemInfo.Title', 'ItemInfo.Features', 'Offers.Listings.Price'],
  });

  const path = '/paapi5/searchitems';
  const signed = await signPaapiRequest({
    accessKey: account.accessKey,
    secretKey: account.secretKey,
    region: route.region,
    host: route.host,
    path,
    target: 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
    body,
  });

  const res = await fetch(signed.url, { method: 'POST', headers: signed.headers, body });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PA-API ${route.account} ${res.status}: ${errText.slice(0, 300)}`);
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
      // DetailPageURL already carries the correct marketplace + PartnerTag — no manual tag-appending needed.
      productUrl: item.DetailPageURL || `https://${route.marketplace}/dp/${item.ASIN}`,
      rating: null,
      reviewCount: null,
    }));
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

    const route = resolveRoute(country);
    const account = readAccount(route.account === 'EU' ? 'PAAPI_EU' : 'PAAPI_US');

    console.log('[Amazon Products] Searching:', query, 'country:', country || '(none)', 'account:', route.account, 'marketplace:', route.marketplace);

    if (!account) {
      // Account not configured yet — fail empty, no crash. The carousel falls back
      // to images; this just means the sponsor carousel isn't live for this region yet.
      console.warn(`[Amazon Products] ${route.account} account not configured (missing PAAPI_${route.account}_* secrets)`);
      return new Response(
        JSON.stringify({ success: false, products: [], query, domain: route.domain, error: `${route.account} account not configured` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const products = await searchPaapi(query, maxResults, route, account);
    console.log('[Amazon Products] Found products:', products.length, 'via', route.account);

    return new Response(
      JSON.stringify({ success: true, products, query, domain: route.domain }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Amazon Products] Unexpected error:', error);
    // No SerpAPI fallback by design — empty result, caller falls back to images.
    return new Response(
      JSON.stringify({
        success: false,
        products: [],
        query: '',
        error: `PA-API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
