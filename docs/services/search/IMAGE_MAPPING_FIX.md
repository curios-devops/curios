# Image Mapping Fix - Edge Function Image Structure

## Problem

The test page `/serp-test` was returning images correctly, but the production pipeline wasn't showing any images. Investigation revealed that the Edge Function was not mapping SERP API inline_images to the correct `ImageResult` interface structure.

## Root Cause

### Expected Structure (ImageResult interface)
```typescript
interface ImageResult {
  title?: string;
  url: string;        // Main image URL
  image?: string;     // Optional thumbnail
  alt: string;        // REQUIRED - Alt text for accessibility
  source_url?: string; // Source page URL
}
```

### What Edge Function Was Returning (WRONG)
```typescript
{
  url: img.original || img.thumbnail || '',
  title: img.title || '',
  source: img.source || img.link || '',  // ❌ Wrong field name (should be source_url)
  // ❌ MISSING: alt (required field!)
}
```

### What Brave Search Tool Returns (CORRECT)
```typescript
{
  url: item.properties?.url || item.thumbnail?.src || '',
  alt: item.title || 'Search result image',  // ✅ Has alt
  source_url: item.url || ''  // ✅ Correct field name
}
```

## Fix Applied

Updated `supabase/functions/reverse-image-search/index.ts`:

```typescript
// Map inline_images to ImageResult format (must match src/commonApp/types/index.ts)
const imageResults = (data.inline_images || []).map(img => ({
  url: img.original || img.thumbnail || '',  // Main image URL
  alt: img.title || 'Reverse image search result',  // ✅ Required field for ImageResult
  source_url: img.source || img.link || '',  // ✅ Correct field name
  title: img.title || '',  // Optional title
})).filter(img => img.url !== '')  // Remove images without URLs
```

## Changes Made

1. **Added `alt` field** - Required by ImageResult interface, using title or default text
2. **Fixed `source` → `source_url`** - Match the interface field name
3. **Added `.filter()`** - Remove images without valid URLs
4. **Redeployed Edge Function** - Applied changes to production

## Testing Steps

1. ✅ Deploy Edge Function: `supabase functions deploy reverse-image-search`
2. ⏳ Test with `/serp-test` page - Verify images structure in console
3. ⏳ Test production pipeline - Upload Elon Musk image, verify images appear
4. ⏳ Compare console logs - Should show correct image structure with `alt` field

## Debug Console Logs

After fix, you should see in console:

```
🔍 [RETRIEVER] Reverse image search completed {
  webCount: 10,
  imagesCount: 50,
  firstImage: {
    url: "https://example.com/image.jpg",
    alt: "Elon Musk",  // ← Should be present now!
    title: "Elon Musk",
    source_url: "https://source-page.com"
  }
}
```

## Files Modified

- `supabase/functions/reverse-image-search/index.ts` - Fixed image mapping
- `src/services/search/regular/agents/searchRetrieverAgent.ts` - Enhanced debug logging

## Related Issues

- Test page working but production failing → Indicates data transformation issue
- Images "appearing later" → UI might be getting images from cache or different source
- Need to verify images are from SERP API, not residual Brave results
