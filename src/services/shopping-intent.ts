/**
 * Shopping Intent Detection Service
 * Detects if a user query indicates shopping/purchase intent
 */

export interface ShoppingIntentResult {
  isShoppingIntent: boolean;
  confidence: number; // 0-100
  detectionMethod: 'keywords' | 'patterns' | 'categories' | 'ai';
  matchedTerms?: string[];
}

// Shopping keywords that strongly indicate purchase intent
const SHOPPING_KEYWORDS = [
  'buy', 'purchase', 'price', 'cost', 'cheap', 'expensive', 'affordable',
  'deal', 'discount', 'sale', 'coupon', 'offer', 'shop', 'store',
  'order', 'shipping', 'delivery', 'amazon', 'ebay', 'walmart',
  'review', 'rating', 'comparison', 'compare', 'vs', 'versus',
  'best', 'top', 'recommended', 'worth', 'quality'
];

// Product categories
const PRODUCT_CATEGORIES = [
  // Electronics
  'phone', 'iphone', 'android', 'smartphone', 'laptop', 'computer', 'tablet',
  'ipad', 'macbook', 'pc', 'desktop', 'monitor', 'keyboard', 'mouse',
  'headphones', 'earbuds', 'airpods', 'speaker', 'camera', 'tv', 'television',
  'smartwatch', 'watch', 'fitbit', 'console', 'playstation', 'xbox', 'nintendo',
  
  // Clothing & Accessories
  'shoes', 'sneakers', 'boots', 'sandals', 'shirt', 'pants', 'jeans',
  'dress', 'jacket', 'coat', 'hoodie', 'sweater', 'bag', 'backpack',
  'wallet', 'sunglasses', 'hat', 'belt', 'socks',
  
  // Home & Kitchen
  'furniture', 'chair', 'desk', 'table', 'sofa', 'bed', 'mattress',
  'lamp', 'blender', 'coffee maker', 'toaster', 'vacuum', 'air purifier',
  
  // Beauty & Health
  'skincare', 'makeup', 'shampoo', 'perfume', 'cologne', 'vitamins',
  'supplements', 'protein', 'moisturizer', 'serum',
  
  // Sports & Outdoors
  'bike', 'bicycle', 'treadmill', 'yoga mat', 'dumbbells', 'tent',
  'sleeping bag', 'backpack', 'hiking boots',
  
  // Books & Media
  'book', 'novel', 'textbook', 'ebook', 'kindle', 'audiobook'
];

// Shopping patterns (regex-friendly)
const SHOPPING_PATTERNS = [
  /where (to|can i) buy/i,
  /how much (is|does|cost)/i,
  /best .+ for (under|less than)/i,
  /cheap(est)? .+ (online|near me)/i,
  /.+ (price|cost) (in|at)/i,
  /buy .+ online/i,
  /order .+ (online|delivery)/i,
  /\d+% off/i, // "50% off"
  /\$\d+/i, // "$99"
  /.+ review(s)? \d{4}/i, // "iphone review 2024"
];

/**
 * Detect shopping intent using keyword and pattern matching
 */
export function detectShoppingIntent(query: string): ShoppingIntentResult {
  const normalizedQuery = query.toLowerCase().trim();
  const matchedTerms: string[] = [];
  let confidence = 0;

  // Check for shopping keywords
  const keywordMatches = SHOPPING_KEYWORDS.filter(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(normalizedQuery);
  });
  
  if (keywordMatches.length > 0) {
    matchedTerms.push(...keywordMatches);
    confidence += Math.min(keywordMatches.length * 20, 60); // Max 60 from keywords
  }

  // Check for product categories
  const categoryMatches = PRODUCT_CATEGORIES.filter(category => {
    const regex = new RegExp(`\\b${category}\\b`, 'i');
    return regex.test(normalizedQuery);
  });
  
  if (categoryMatches.length > 0) {
    matchedTerms.push(...categoryMatches);
    confidence += Math.min(categoryMatches.length * 15, 40); // Max 40 from categories
  }

  // Check for shopping patterns
  const patternMatches = SHOPPING_PATTERNS.filter(pattern => 
    pattern.test(normalizedQuery)
  );
  
  if (patternMatches.length > 0) {
    matchedTerms.push('shopping_pattern');
    confidence += Math.min(patternMatches.length * 25, 50); // Max 50 from patterns
  }

  // Determine detection method
  let detectionMethod: ShoppingIntentResult['detectionMethod'] = 'keywords';
  if (patternMatches.length > 0) {
    detectionMethod = 'patterns';
  } else if (categoryMatches.length > 0 && keywordMatches.length === 0) {
    detectionMethod = 'categories';
  }

  // Cap confidence at 100
  confidence = Math.min(confidence, 100);

  // Threshold: 40+ confidence indicates shopping intent
  const isShoppingIntent = confidence >= 40;

  return {
    isShoppingIntent,
    confidence,
    detectionMethod,
    matchedTerms: matchedTerms.length > 0 ? matchedTerms : undefined
  };
}

/**
 * Enhanced detection with AI fallback (optional)
 * Can be implemented later with OpenAI nano model
 */
export async function detectShoppingIntentWithAI(
  query: string,
  useAI: boolean = false
): Promise<ShoppingIntentResult> {
  // First try keyword-based detection
  const keywordResult = detectShoppingIntent(query);

  // If confidence is borderline (30-50) and AI is enabled, use AI
  if (useAI && keywordResult.confidence >= 30 && keywordResult.confidence <= 50) {
    try {
      // TODO: Implement OpenAI nano model call
      // const aiResult = await callOpenAIForShoppingIntent(query);
      // return aiResult;
      
      // For now, return keyword result
      return keywordResult;
    } catch (error) {
      console.warn('AI shopping intent detection failed, using keyword-based result:', error);
      return keywordResult;
    }
  }

  return keywordResult;
}

/**
 * Test queries (for development/testing)
 */
export const TEST_QUERIES = {
  shouldTrigger: [
    'best wireless headphones 2026',
    'buy iphone 15 pro max',
    'cheap running shoes for men',
    'macbook pro m3 price',
    'sony camera review',
    'where to buy nintendo switch',
    'how much does airpods pro cost',
    'compare samsung s24 vs iphone 15'
  ],
  shouldNotTrigger: [
    'how to tie a tie',
    'weather in new york',
    'history of world war 2',
    'python tutorial for beginners',
    'news about climate change',
    'what is machine learning',
    'who is the president'
  ]
};
