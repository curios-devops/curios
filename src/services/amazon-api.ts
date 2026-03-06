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
 * Optimize query for Amazon product search
 * Extracts product names and removes unnecessary words
 */
function optimizeAmazonQuery(query: string): string {
  // Remove common question words and phrases
  let optimized = query
    .replace(/^(what|how|where|when|why|which|who|is|are|the|a|an)\s+/gi, '')
    .replace(/\s+(is|are|the|a|an|at|for|in|on|under|over|best|top|cheapest|most affordable)\s+/gi, ' ')
    .replace(/\s+(ever|made|available|laptop|phone|product|device|company|has|have)\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract brand + product patterns (e.g., "MacBook Neo", "Galaxy S24", "iPhone 15")
  const brandProductPatterns = [
    // Apple products
    /\b(MacBook|iPhone|iPad|AirPods|Apple Watch|iMac|Mac|HomePod)\s+[A-Z][a-z]*(\s+[A-Z0-9][a-z0-9]*)?/gi,
    // Samsung products
    /\b(Galaxy|Samsung)\s+[A-Z][a-z0-9]*(\s+[A-Z0-9][a-z0-9]*)?/gi,
    // Other brands
    /\b(Google|Sony|Microsoft|Dell|HP|Lenovo|Asus|Acer)\s+[A-Z][a-z0-9]*(\s+[A-Z0-9][a-z0-9]*)?/gi,
  ];

  for (const pattern of brandProductPatterns) {
    const match = query.match(pattern);
    if (match && match[0]) {
      console.log(`🛍️ [Amazon API] Extracted product: "${match[0]}" from "${query}"`);
      return match[0].trim();
    }
  }

  // If no specific pattern found, clean up the query
  // Remove sentences longer than 6 words (likely descriptive text, not product names)
  const words = optimized.split(' ');
  if (words.length > 6) {
    // Try to find product-like phrases (brand name + model)
    const productWords = words.filter(word =>
      /^[A-Z]/.test(word) || // Capitalized words (brand names)
      /\d/.test(word) || // Words with numbers (model numbers)
      ['pro', 'max', 'ultra', 'plus', 'mini', 'air', 'neo'].includes(word.toLowerCase())
    );

    if (productWords.length >= 2) {
      optimized = productWords.slice(0, 4).join(' '); // Take first 4 relevant words
      console.log(`🛍️ [Amazon API] Simplified to: "${optimized}" from "${query}"`);
    } else {
      // Fallback: take first 4 words
      optimized = words.slice(0, 4).join(' ');
      console.log(`🛍️ [Amazon API] Using first 4 words: "${optimized}" from "${query}"`);
    }
  }

  return optimized;
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
    console.log(`\n🛒🛒🛒 [AMAZON API CALLED] 🛒🛒🛒`);
    console.log(`📥 ORIGINAL QUERY FROM USER: "${query}"`);

    // Optimize query for better Amazon product results
    const optimizedQuery = optimizeAmazonQuery(query);

    console.log(`📤 OPTIMIZED QUERY FOR AMAZON: "${optimizedQuery}"`);
    console.log(`🛒🛒🛒 [AMAZON API] 🛒🛒🛒\n`);

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

    // Log what we're sending to Amazon
    console.log(`🛍️ [Amazon API] ⚡ SENDING TO AMAZON: "${optimizedQuery}"`);
    console.log(`🛍️ [Amazon API] 📦 Request payload:`, { query: optimizedQuery, maxResults });

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({ query: optimizedQuery, maxResults }),
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
