# Shopping Feature

## Overview
Enhance search results by automatically detecting shopping intent and displaying relevant product cards from Amazon, seamlessly integrated into the existing search flow without disrupting the user experience.

## Core Concept
When a user submits a query (regular or pro search), run a parallel shopping intent detection. If a strong buying signal is detected, fetch products from Amazon API and replace the image section with product cards.

---

## Architecture

### 1. Intent Detection (Parallel, Non-Blocking)
**Goal:** Determine if user query indicates shopping/purchase intent

**Options:**
- **Option A - Word-based detection:**
  - Fast, low-cost
  - Keywords: "buy", "purchase", "price", "cheap", "best", "review", "vs", "comparison"
  - Product categories: "phone", "laptop", "shoes", "watch", etc.
  - Patterns: "where to buy", "how much is", "best [product] for"
  
- **Option B - Nano OpenAI model:**
  - More accurate, slight latency
  - Use `gpt-4o-mini` or similar lightweight model
  - Prompt: "Does this query indicate shopping intent? Answer YES or NO: [query]"
  - Fall back to word-based if API fails

**Recommended:** Hybrid approach - word-based filter first, then nano model for edge cases

### 2. Amazon Product Search
**Trigger:** Strong shopping intent detected (confidence > threshold)

**API Integration:**
- Use Amazon Product Advertising API (PA-API 5.0)
- Alternative: Amazon Associates Product API
- Fallback: Web scraping (if APIs unavailable)

**Request:**
- Search query: User's original query (sanitized)
- Limit: 4 products (top results)
- Required fields:
  - Product image URL (high-res)
  - Product title
  - Current price
  - Brief description (first 2-3 lines)
  - Product URL (affiliate link if applicable)
  - Rating (optional, for sorting)

### 3. Product Card Design
**Layout per card:**
```
┌─────────────────────────────┐
│   [Product Image]           │
│   150x150 or 200x200        │
├─────────────────────────────┤
│ Product Title               │
│ (truncated if too long)     │
├─────────────────────────────┤
│ $99.99                      │
├─────────────────────────────┤
│ Brief description that      │
│ spans 2-3 lines max...      │
└─────────────────────────────┘
│           Buy               │
└─────────────────────────────┘
```

**Responsive:**
- Desktop: 4 cards in a row (or 2x2 grid)
- Mobile: 2 cards per row, scrollable

**Click behavior:**
- Opens Amazon product page in new tab
- Track click-through for analytics

### 4. UI Integration
**Current flow:**
1. User submits query
2. Search starts (regular/pro)
3. Results display: Answer section + Images section + Videos section + Sources

**New flow:**
1. User submits query
2. **Parallel processes:**
   - Main search (regular/pro) → existing flow
   - **Shopping intent detection** → if YES → Amazon API call
3. Results display:
   - Answer section (unchanged)
   - **Shopping section** (replaces Images section if products found)
   - Videos section (unchanged)
   - Sources (unchanged)

**Fallback:**
- If shopping intent = NO → display Images as usual
- If Amazon API fails → display Images as usual
- If no products found → display Images as usual

---

## Implementation Plan

### Phase 1: Intent Detection 
- [ ] Create `src/services/shopping-intent.ts`
- [ ] Implement word-based detection function
- [ ] Define keyword/pattern lists
- [ ] Add confidence scoring (0-100%)
- [ ] Optional: Integrate nano OpenAI model
- [ ] Add unit tests for various query types

### Phase 2: Amazon API Integration 
- [ ] Set up Amazon Product Advertising API credentials
- [ ] Create `src/services/amazon-api.ts`
- [ ] Implement search function (max 4 products)
- [ ] Handle API errors and rate limits
- [ ] Add caching layer (optional, for popular queries)
- [ ] Test with various product queries

### Phase 3: Product Card Component 
- [ ] Create `src/components/shopping/ProductCard.tsx`
- [ ] Design responsive card layout (Tailwind CSS)
- [ ] Handle image loading states
- [ ] Truncate titles and descriptions properly
- [ ] Add price formatting (currency, decimals)
- [ ] Implement click tracking

### Phase 4: Shopping Section Component
- [ ] Create `src/components/shopping/ShoppingSection.tsx`
- [ ] Grid layout for 4 product cards
- [ ] Responsive design (4→2→1 columns)
- [ ] Loading skeleton while fetching
- [ ] Empty state if no products
- [ ] Section header: "Products related to your search"

### Phase 5: Integration with Search Flow 
- [ ] Update `src/mainPages/Results.tsx`
- [ ] Add shopping intent detection to search handler
- [ ] Conditionally render ShoppingSection or ImageSection
- [ ] Ensure parallel execution (Promise.all)
- [ ] Handle race conditions (shopping completes after main search)
- [ ] Add error boundaries



## Technical Considerations

### Performance
- Shopping detection must be **non-blocking**
- Max timeout: 2-3 seconds for Amazon API
- If shopping results arrive late, inject them dynamically (no page refresh)
- Cache popular product queries (Redis or in-memory)

### Error Handling
- Amazon API failures → gracefully fall back to images
- Rate limiting → queue requests or show cached results
- Invalid products (no image/price) → skip card, show fewer products

### Privacy & Legal
- Disclose Amazon affiliate relationship (if applicable)
- Add "Sponsored" or "Ad" label if required
- Comply with Amazon API terms of service
- Don't store user queries with shopping intent labels (GDPR)

## Example Queries

**Should trigger shopping:**
- "best wireless headphones 2026"
- "buy iphone 15 pro max"
- "cheap running shoes for men"
- "macbook pro m3 price"
- "sony camera review"

**Should NOT trigger shopping:**
- "how to tie a tie"
- "weather in new york"
- "history of world war 2"
- "python tutorial for beginners"
- "news about climate change"

---

## Future Enhancements (not now)
- Support multiple retailers (eBay, Walmart, Best Buy)
- Price comparison across stores
- User preference: enable/disable shopping cards
- Save products to wishlist (requires auth)
- Product availability alerts
- Local store pickup options

---

## Success Metrics (not now)
- **Accuracy:** Shopping intent detection precision > 85%
- **Performance:** Shopping section loads within 2 seconds
- **Engagement:** CTR on product cards > 3%
- **User satisfaction:** Positive feedback on shopping feature > 70%



