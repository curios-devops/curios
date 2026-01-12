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
 * Search for products on Amazon
 * Currently using a mock implementation until API credentials are set up
 */
export async function searchAmazonProducts(
  query: string,
  maxResults: number = 4
): Promise<AmazonSearchResult> {
  try {
    console.log(`🔍 Searching Amazon for: "${query}"`);

    // TODO: Replace with actual Amazon Product Advertising API call
    // For now, return mock data for development
    const mockProducts = generateMockProducts(query, maxResults);

    return {
      success: true,
      products: mockProducts,
      query
    };
  } catch (error) {
    console.error('Amazon product search failed:', error);
    return {
      success: false,
      products: [],
      query,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate mock products for testing (until real API is integrated)
 */
function generateMockProducts(query: string, count: number): AmazonProduct[] {
  const products: AmazonProduct[] = [];
  
  // Extract product type from query for more realistic mock data
  const productType = extractProductType(query);
  
  for (let i = 0; i < count; i++) {
    products.push({
      asin: `B0${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      title: `${productType} - ${getRandomBrand()} Model ${String.fromCharCode(65 + i)}`,
      price: `$${(Math.random() * 500 + 50).toFixed(2)}`,
      imageUrl: `https://via.placeholder.com/200x200/4A90E2/FFFFFF?text=${productType}+${i + 1}`,
      description: `High-quality ${productType.toLowerCase()} with premium features. ${getRandomFeatures()}. Perfect for everyday use and professional applications.`,
      productUrl: `https://amazon.com/dp/B0${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      rating: Math.random() * 1.5 + 3.5, // 3.5 to 5.0
      reviewCount: Math.floor(Math.random() * 5000) + 100
    });
  }
  
  return products;
}

/**
 * Extract product type from query for mock data
 */
function extractProductType(query: string): string {
  const q = query.toLowerCase();
  
  if (q.includes('headphone') || q.includes('earbuds')) return 'Wireless Headphones';
  if (q.includes('phone') || q.includes('iphone') || q.includes('smartphone')) return 'Smartphone';
  if (q.includes('laptop') || q.includes('macbook')) return 'Laptop Computer';
  if (q.includes('watch') || q.includes('smartwatch')) return 'Smart Watch';
  if (q.includes('shoes') || q.includes('sneakers')) return 'Athletic Shoes';
  if (q.includes('camera')) return 'Digital Camera';
  if (q.includes('tablet') || q.includes('ipad')) return 'Tablet';
  if (q.includes('monitor') || q.includes('display')) return 'Monitor';
  if (q.includes('keyboard')) return 'Mechanical Keyboard';
  if (q.includes('mouse')) return 'Wireless Mouse';
  
  return 'Product';
}

/**
 * Get random brand name for mock data
 */
function getRandomBrand(): string {
  const brands = [
    'TechPro', 'Premium', 'Elite', 'Ultra', 'MaxTech',
    'ProSeries', 'Innovation', 'SmartChoice', 'TopGear', 'NextGen'
  ];
  return brands[Math.floor(Math.random() * brands.length)];
}

/**
 * Get random features for mock data
 */
function getRandomFeatures(): string {
  const features = [
    'Advanced noise cancellation technology',
    'Long-lasting battery life up to 24 hours',
    'Premium build quality with durable materials',
    'Ergonomic design for maximum comfort',
    'Latest generation processor for top performance',
    'Water-resistant and sweat-proof',
    'Wireless connectivity with Bluetooth 5.0',
    'Fast charging support',
    'Compatible with all major devices',
    'Award-winning design'
  ];
  
  const selectedFeatures: string[] = [];
  const featureCount = 2;
  
  for (let i = 0; i < featureCount; i++) {
    const feature = features[Math.floor(Math.random() * features.length)];
    if (!selectedFeatures.includes(feature)) {
      selectedFeatures.push(feature);
    }
  }
  
  return selectedFeatures.join('. ');
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

/**
 * Real Amazon API integration (to be implemented)
 * Requires: Amazon Product Advertising API credentials
 */
export async function searchAmazonProductsReal(
  _query: string,
  _maxResults: number = 4
): Promise<AmazonSearchResult> {
  // TODO: Implement actual Amazon Product Advertising API integration
  // 
  // Steps:
  // 1. Sign up for Amazon Associates Program
  // 2. Get PA-API credentials (Access Key, Secret Key, Associate Tag)
  // 3. Install amazon-paapi library or use AWS SDK
  // 4. Make authenticated request to SearchItems operation
  // 5. Parse and transform response to AmazonProduct format
  // 
  // Example API call structure:
  // const paapi = new AmazonPAAPI({
  //   accessKey: process.env.AMAZON_ACCESS_KEY,
  //   secretKey: process.env.AMAZON_SECRET_KEY,
  //   partnerTag: process.env.AMAZON_ASSOCIATE_TAG,
  //   region: 'us-east-1'
  // });
  // 
  // const response = await paapi.searchItems({
  //   keywords: query,
  //   searchIndex: 'All',
  //   itemCount: maxResults,
  //   resources: ['Images.Primary.Large', 'ItemInfo.Title', 'Offers.Listings.Price']
  // });

  throw new Error('Real Amazon API not implemented yet. Use searchAmazonProducts() for mock data.');
}
