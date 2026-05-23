# Fast Search Multiple Citations Fix

**Date**: 2025-05-17
**Status**: ✅ Resolved

## Problem

Multiple citation badges (e.g., "azure +1") were appearing in Fast Search results but were not clickable. Users could see the badge but couldn't interact with it to view the different sources.

## Root Cause

The issue was in the siteName extraction logic in `FastSearchResults.tsx`. When building citations from search results:

**Before (Broken)**:
```typescript
const parts = hostname.split('.');
const siteName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
```

For URL `azure.microsoft.com`:
- `parts` = `['azure', 'microsoft', 'com']`
- `parts[parts.length - 2]` = `'microsoft'` ❌
- LLM outputs `[azure +1]` but citations only contain `'microsoft'`
- parseCitation fails to find match → renders as non-clickable fallback badge

**After (Fixed)**:
```typescript
const parts = hostname.split('.');
// Extract siteName: prefer first part (subdomain like 'azure') over root domain
const siteName = parts[0] || '';
```

For URL `azure.microsoft.com`:
- `parts[0]` = `'azure'` ✅
- LLM outputs `[azure +1]` and finds match in citations
- Renders as clickable MultipleCitations component

## Changes Made

### 1. Fixed siteName Extraction
**File**: `src/services/fast-search/pages/FastSearchResults.tsx`

Changed from taking second-to-last part to taking first part of hostname:
- `azure.microsoft.com` → `azure` (not `microsoft`)
- `wikipedia.org` → `wikipedia`
- `docs.python.org` → `docs` (not `python`)

### 2. Improved Fallback Handling
**File**: `src/components/CustomMarkdown.tsx`

For citations that can't be matched (e.g., LLM hallucinates a siteName):
- Strip the `+N` suffix from unmatched citations
- `[azure +1]` → renders as `azure` (plain badge, no confusing +1)

### 3. Filtered Duplicate Citations
**File**: `src/components/CustomMarkdown.tsx`

Added check to prevent rendering "multiple" citations when all URLs are the same:
```typescript
const uniqueUrls = new Set(parsedCitation.citations.map(c => c.url));
if (uniqueUrls.size === 1) {
  // Render as single citation instead
}
```

This prevents the citation parser from creating fake "multiple" citations by duplicating the same URL.

## Testing

To verify the fix works:

1. Search for "quantum computing" in Fast Search
2. Look for multiple citation badges (e.g., "azure +1", "wikipedia +2")
3. Click on the badge
4. Should see tooltip with navigation arrows to browse all sources
5. Each source should be clickable and open in new tab

## Files Modified

1. `src/services/fast-search/pages/FastSearchResults.tsx` - Fixed siteName extraction
2. `src/components/CustomMarkdown.tsx` - Improved fallback and duplicate handling
3. `src/components/citations/MultipleCitations.tsx` - Cleaned up debug logs

## Impact

- ✅ Multiple citations now work correctly in Fast Search
- ✅ Matches behavior of regular search
- ✅ Better handling of subdomain URLs (azure.microsoft.com, docs.python.org, etc.)
- ✅ Clean console output (removed debug spam)

## Related Issues

- Fast Search citations not clickable
- Multiple citation badges showing but not interactive
- Subdomain URL handling inconsistency between Fast Search and Regular Search
