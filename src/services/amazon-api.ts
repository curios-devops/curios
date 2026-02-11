/**
 * Amazon Product Searcexport async function searchAmazonProducts(
  query: string,
  maxResults: number = 4
): Promise<AmazonSearchResult> {
  try {
    console.log(`🛍️ [Amazon API] Searching for: "${query}"`);

    // Call Supabase Edge Function to search via SerpAPI
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const functionUrl = `${supabaseUrl}/functions/v1/search-amazon-products`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({ query, maxResults })
    });tegrates with Amazon Product Advertising API to fetch products
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
 * Search for products on Amazon via SerpAPI (Netlify Function)
 * Replaces mock implementation with real product data
 */
export async function searchAmazonProducts(
  query: string,
  maxResults: number = 4
): Promise<AmazonSearchResult> {
  try {
    console.log(`�️ [Amazon API] Searching for: "${query}"`);

    // Call Netlify function to search via SerpAPI
    const response = await fetch('/.netlify/functions/search-amazon-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, maxResults })
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

    return {
      success: true,
      products: data.products || [],
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
