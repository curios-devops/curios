PRODUCT SEARCH + AFFILIATE CARD WORKFLOW

Stack: React (frontend) + Node (backend) + TypeScript
API Provider: SerpApi Amazon Search API
Env Variables: SERPAPI_API_KEY, VITE_SERP_API_URL

1) HIGH-LEVEL DATAFLOW (TEXT DIAGRAM)
[User Query + Buy Intent Detected]
                       ↓
         [Backend Endpoint Receives Query]
                       ↓
           SerpApi Amazon Search API Call
                       ↓
         [Normalize SerpApi JSON Response]
                       ↓
         [Build Affiliate URLs with ASIN]
                       ↓
       [Return Product Data to Frontend UI]
                       ↓
[Frontend Replaces Dummy Card with Real Data]
                       ↓
[User Click → Amazon (with Affiliate Tag)]

2) BACKEND IMPLEMENTATION (NODE + TYPESCRIPT)
2.1 API ROUTE SETUP

Create a backend route like:
POST /api/searchProducts

Accepts: { query: string }

Responds: structured product list

2.2 MAKE THE SERPAPI CALL

Request to SerpApi Amazon Search API

Build the GET request to SerpApi using your env variables:

const url = `${process.env.VITE_SERP_API_URL}?engine=amazon`
  + `&k=${encodeURIComponent(query)}`
  + `&amazon_domain=amazon.com`
  + `&language=en_US`
  + `&api_key=${process.env.SERPAPI_API_KEY}`;


engine=amazon tells SerpApi to run an Amazon search.

k is the user search term.

You can pass other parameters for filters or sorting if needed.

Send request via a fetch/axios wrapper in Node.

2.3 NORMALIZE RESPONSE

From SerpApi JSON, pick fields to construct a common product model:

ProductCardModel {
  asin: string
  title: string
  imageUrl: string
  price: string
  rating: number | null
  reviewCount: number | null
  affiliateUrl: string
}


Mapping principles:

Use organic_results and featured_products arrays if present.

For each result, extract:

asin

title

thumbnail → imageUrl

price or extracted_price

rating

reviews → reviewCount

Build your affiliate URL:

https://www.amazon.com/dp/<ASIN>?tag=AMAZON_STORE_ID


Replace <ASIN> with actual ASIN.
This lets you generate affiliate links programmatically now, even without PA API.

2.4 RETURN TO FRONTEND

Return an array of normalized product records:

res.json({ products: ProductCardModel[] })


If errors occur (network, empty results), you may return an empty array or a status message.

3) FRONTEND IMPLEMENTATION (REACT + TYPESCRIPT)

Goal: Replace your dummy product card with real data from /api/searchProducts.

3.1 CREATE FETCH FUNCTION

In React, trigger a fetch to the backend when the intent system flags a query as “buy”.

Example:

fetch('/api/searchProducts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
})
.then(res => res.json())
.then(data => setProducts(data.products))

3.2 POPULATE EXISTING DUMMY CARD

Instead of rendering a placeholder, loop over the products array and map fields into your card props:

<ProductCard
  image={product.imageUrl}
  title={product.title}
  price={product.price}
  rating={product.rating}
  reviewCount={product.reviewCount}
  link={product.affiliateUrl}
/>


The card’s “navigate to amazon” button / click handler should navigate to product.affiliateUrl.

Keep handling for missing fields (e.g., no rating) gracefully in the UI.