# Shopping Purchase Freeze Fix

**Date:** 2026-03-06
**Issue:** App freezes when users try to buy products via Amazon referral links
**Status:** ✅ Fixed

## Problem Analysis

### Symptoms
- User searches for shopping queries (e.g., "best wireless headphones")
- Shopping products are displayed correctly
- When user clicks on a product card to buy, the app freezes

### Root Causes Identified

1. **Corrupted `amazon-api.ts` file**
   - File had duplicate/malformed function definitions (lines 1-47)
   - Caused unpredictable behavior during product URL fetching

2. **Missing URL validation**
   - No validation of `productUrl` before calling `window.open()`
   - If SerpAPI returned malformed URLs, `window.open()` could hang

3. **No timeout on API calls**
   - Fetch to Supabase edge function had no timeout
   - Could hang indefinitely on slow network

4. **No error handling in click handler**
   - `ProductCard.handleClick()` had no try-catch
   - Errors could propagate and freeze the UI

## Files Modified

### 1. `src/services/amazon-api.ts`
**Changes:**
- ✅ Fixed corrupted file structure
- ✅ Added 10-second timeout to fetch call: `signal: AbortSignal.timeout(10000)`
- ✅ Added `validateAmazonUrl()` function to sanitize product URLs
- ✅ Validates all URLs before returning products
- ✅ Falls back to default Amazon URL if URL is invalid: `https://www.amazon.com/dp/{asin}`

**Key additions:**
```typescript
// Timeout protection
signal: AbortSignal.timeout(10000)

// URL validation
function validateAmazonUrl(url: string, asin: string): string {
  try {
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return `https://www.amazon.com/dp/${asin}`;
    }
    const parsedUrl = new URL(url);
    if (!parsedUrl.hostname.includes('amazon.com')) {
      return `https://www.amazon.com/dp/${asin}`;
    }
    return url;
  } catch (error) {
    return `https://www.amazon.com/dp/${asin}`;
  }
}
```

### 2. `src/components/shopping/ProductCard.tsx`
**Changes:**
- ✅ Added try-catch to `handleClick()`
- ✅ Added URL validation before `window.open()`
- ✅ Logs errors instead of throwing them

**Key additions:**
```typescript
const handleClick = () => {
  try {
    // Validate URL before opening
    if (!product.productUrl || product.productUrl.trim().length === 0) {
      console.error('❌ [ProductCard] Invalid product URL:', product);
      return;
    }
    window.open(product.productUrl, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('❌ [ProductCard] Error opening product:', error);
  }
};
```

## Testing Instructions

### 1. Test Shopping Query
```bash
# Search for a shopping query
Query: "best wireless headphones 2026"

# Expected behavior:
✅ Products load successfully
✅ 4 product cards displayed
✅ Click on any product card
✅ New tab opens to Amazon product page
✅ No freeze or hang
```

### 2. Test Edge Cases
```bash
# Test with malformed API response
# Manually test by temporarily breaking SERPAPI_API_KEY

Expected:
✅ Empty products returned gracefully
✅ Falls back to showing images
✅ No freeze

# Test with slow network
# Throttle network in DevTools to "Slow 3G"

Expected:
✅ Request times out after 10 seconds
✅ Error logged to console
✅ Falls back to images
✅ No freeze
```

### 3. Monitor Console Logs
```javascript
// Look for these logs in browser console:

// Success case:
🛍️ [Amazon API] Searching for: "best headphones"
✅ [Amazon API] Success! Found 4 products

// URL validation warnings (if any):
⚠️ [Amazon API] Invalid URL detected, using default: <bad-url>

// Error case (should not freeze):
❌ [Amazon API] HTTP error: 500
❌ [Amazon API] Unexpected error: <error-message>
```

## Flow After Fix

```
User searches → Shopping intent detected
                ↓
       Fetch products (with 10s timeout)
                ↓
       Validate all product URLs
                ↓
       Display product cards
                ↓
       User clicks card
                ↓
       Validate URL again (safety check)
                ↓
       Open Amazon in new tab
                ↓
       ✅ Success - no freeze
```

## Safety Features Added

1. **Timeout protection**: 10-second timeout on all API calls
2. **URL validation**: Double validation (API level + Component level)
3. **Fallback URLs**: Always use default Amazon URL if validation fails
4. **Error boundaries**: Try-catch in click handlers
5. **Graceful degradation**: Falls back to images if shopping fails

## Related Files

- [src/services/amazon-api.ts](../../../src/services/amazon-api.ts)
- [src/components/shopping/ProductCard.tsx](../../../src/components/shopping/ProductCard.tsx)
- [supabase/functions/search-amazon-products/index.ts](../../../supabase/functions/search-amazon-products/index.ts)
- [src/services/search/regular/regularSearchService.ts](../../../src/services/search/regular/regularSearchService.ts)

## Future Improvements

1. Add loading indicator while opening Amazon page
2. Add analytics tracking for product clicks
3. Add user feedback if URL is invalid
4. Consider adding rate limiting on product clicks
5. Add retry mechanism for failed API calls

## Notes

- The original issue was a corrupted file with duplicate function definitions
- The fix ensures all URLs are validated before being used
- All errors are caught and logged, preventing UI freezes
- The system gracefully falls back to image search if shopping fails
