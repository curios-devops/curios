/**
 * Netlify Function: Search Amazon Products via SerpAPI
 * Endpoint: /.netlify/functions/search-amazon-products
 */

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { query, maxResults = 4 } = JSON.parse(event.body || '{}');

    if (!query || typeof query !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Query parameter is required' })
      };
    }

    // Get SerpAPI key from environment
    const serpApiKey = process.env.SERPAPI_API_KEY;
    if (!serpApiKey) {
      console.error('SERPAPI_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'SerpAPI not configured' })
      };
    }

    // Build SerpAPI request URL
    const serpApiUrl = new URL('https://serpapi.com/search');
    serpApiUrl.searchParams.set('engine', 'amazon');
    serpApiUrl.searchParams.set('amazon_domain', 'amazon.com');
    serpApiUrl.searchParams.set('amazon_search', query);
    serpApiUrl.searchParams.set('api_key', serpApiKey);

    console.log('🛍️ [SerpAPI] Searching Amazon:', query);

    // Make request to SerpAPI
    const response = await fetch(serpApiUrl.toString());
    
    if (!response.ok) {
      console.error('SerpAPI request failed:', response.status, response.statusText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch products from Amazon' })
      };
    }

    const data = await response.json();

    // Extract products from SerpAPI response
    const products = [];
    const results = data.organic_results || [];
    
    // Get Amazon affiliate tag from environment (optional)
    const affiliateTag = process.env.AMAZON_STORE_ID || '';

    for (let i = 0; i < Math.min(results.length, maxResults); i++) {
      const result = results[i];
      
      // Skip if no ASIN
      if (!result.asin) continue;

      // Build affiliate URL
      const productUrl = affiliateTag
        ? `https://www.amazon.com/dp/${result.asin}?tag=${affiliateTag}`
        : result.link || `https://www.amazon.com/dp/${result.asin}`;

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
        // Extract number from strings like "1,234 ratings"
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

    console.log('🛍️ [SerpAPI] Found products:', products.length);

    // Return products
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        products: products,
        query: query
      })
    };

  } catch (error) {
    console.error('Error searching Amazon products:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        products: [],
        query: ''
      })
    };
  }
};
