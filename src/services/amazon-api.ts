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
 * Search for products on Amazon via SerpAPI (Netlify Function)
 * Replaces mock implementation with real product data
 */
export async function searchAmazonProducts(
  query: string,
  maxResults: number = 4
): Promise<AmazonSearchResult> {
  try {
    console.log(`🔍 [Amazon API] Searching for: "${query}"`);

    // Call Netlify function to search via SerpAPI
    const response = await fetch('/.netlify/functions/search-amazon-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, maxResults })
    });

    if (!response.ok) {
      console.error('🛍️ [Amazon API] Request failed:', response.status, response.statusText);
      throw new Error(`Amazon search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log(`🛍️ [Amazon API] Success! Found ${data.products?.length || 0} products`);

    return {
      success: data.success || false,
      products: data.products || [],
      query: data.query || query,
      error: data.error
    };
  } catch (error) {
    console.error('🛍️ [Amazon API] Search failed:', error);
    
    // Return empty result on error (graceful degradation)
    return {
      success: false,
      products: [],
      query,
      error: error instanceof Error ? error.message : 'Unknown error'
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
