/**
 * Amazon Product Search Service
 * Integrates with Amazon Product Advertising API to fetch products
 */

export interface AmazonProduct {
  asin: string; // Amazon Standard Identification Number
  title: string;
  price: string;
  imageUrl: string;
  description: string;
  productUrl: string;
  rating?: number;
  reviewCount?: number;
}

export interface AmazonSearchResult {
  success: boolean;
  products: AmazonProduct[];
  query: string;
  error?: string;
}

/**
 * Search for products on Amazon via SerpAPI (Supabase Edge Function)
 * Replaces mock implementation with real product data
 */
export async function searchAmazonProducts(
  query: string,
  maxResults: number = 4
): Promise<AmazonSearchResult> {
  try {
    console.log(`🛍️ [Amazon API] Searching for: "${query}"`);

    // Call Supabase Edge Function to search via SerpAPI
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ [Amazon API] Supabase credentials missing');
      return {
        success: false,
        products: [],
        query,
        error: 'Configuration error'
      };
    }

    const functionUrl = `${supabaseUrl}/functions/v1/search-amazon-products`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({ query, maxResults }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    // Handle HTTP errors gracefully
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Amazon API] HTTP error:', response.status, response.statusText);
      console.error('❌ [Amazon API] Error details:', errorText);

      // Return empty result to fallback gracefully
      return {
        success: false,
        products: [],
        query,
        error: `HTTP ${response.status}: API unavailable. Falling back to image search.`
      };
    }

    const data = await response.json();

    // Check if API returned an error
    if (!data.success) {
      console.warn('⚠️ [Amazon API] API returned error:', data.error);
      return {
        success: false,
        products: [],
        query,
        error: data.error || 'API returned no products'
      };
    }

    console.log(`✅ [Amazon API] Success! Found ${data.products?.length || 0} products`);

    // Validate product URLs before returning
    const validatedProducts = (data.products || []).map((product: AmazonProduct) => ({
      ...product,
      productUrl: validateAmazonUrl(product.productUrl, product.asin)
    }));

    return {
      success: true,
      products: validatedProducts,
      query: data.query || query,
      error: data.error
    };
  } catch (error) {
    console.error('❌ [Amazon API] Unexpected error:', error);

    // Return empty result on error (graceful degradation)
    return {
      success: false,
      products: [],
      query,
      error: error instanceof Error ? error.message : 'Network error. Falling back to image search.'
    };
  }
}

/**
 * Validate and sanitize Amazon product URLs
 */
function validateAmazonUrl(url: string, asin: string): string {
  try {
    // If URL is empty or invalid, build default Amazon URL
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return `https://www.amazon.com/dp/${asin}`;
    }

    // Parse URL to validate it
    const parsedUrl = new URL(url);

    // Ensure it's an Amazon domain
    if (!parsedUrl.hostname.includes('amazon.com')) {
      console.warn('⚠️ [Amazon API] Non-Amazon URL detected, using default:', url);
      return `https://www.amazon.com/dp/${asin}`;
    }

    return url;
  } catch (error) {
    // If URL parsing fails, return default Amazon URL
    console.warn('⚠️ [Amazon API] Invalid URL detected, using default:', url);
    return `https://www.amazon.com/dp/${asin}`;
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: string): string {
  // Handle various price formats
  const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
  if (isNaN(numericPrice)) return price;

  return `$${numericPrice.toFixed(2)}`;
}

/**
 * Truncate description to specified length
 */
export function truncateDescription(description: string, maxLength: number = 120): string {
  if (description.length <= maxLength) return description;

  // Find last space before maxLength
  const truncated = description.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  return truncated.substring(0, lastSpace) + '...';
}
