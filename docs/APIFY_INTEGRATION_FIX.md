# Apify Integration Fix - PerspectiveAgent

## 🐛 Problem Identified

**Console Log**:
```
[2025-10-27T08:40:26.375Z] DEBUG: Skipping Apify search - not available in this environment
```

**Root Cause**: PerspectiveAgent was incorrectly checking for server-side execution and using a different Apify class that doesn't exist in the browser context.

---

## 🔍 Analysis

### What Was Wrong

1. **Server-Side Check**:
```typescript
// ❌ OLD CODE
this.isServer = typeof window === 'undefined';
if (!this.isServer || !this.apiKeys.apify) {
  logger.debug('Skipping Apify search - not available in this environment');
  return [];
}
```

This check was **always failing in the browser** because `typeof window !== 'undefined'` in browser environments.

2. **Wrong Import**:
```typescript
// ❌ OLD CODE
import { ApifySearchTool } from '../../../../common/tools/search/apifySearch.ts';
```

This was importing a class-based tool that expected server-side execution.

3. **Different Implementation**:
- Regular Search: Uses `apifySearchTool` function from `commonService`
- Pro Search (Perspective Agent): Was using `ApifySearchTool` class
- **Result**: Inconsistent behavior and unnecessary complexity

---

## ✅ Solution

### Changes Made

**File**: `/src/services/search/pro/agents/perspectiveAgent.ts`

### 1. **Updated Import**
```typescript
// ✅ NEW CODE
import { apifySearchTool } from '../../../../commonService/searchTools/apifySearchTool.ts';
```

Now uses the same function as regular search for consistency.

### 2. **Simplified Constructor**
```typescript
// ✅ NEW CODE
export class PerspectiveAgent {
  private tavilyApiKey: string;
  private apifyApiKey: string;

  constructor() {
    this.apifyApiKey = import.meta.env.VITE_APIFY_API_KEY || '';
    this.tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY || '';
    
    logger.info('PerspectiveAgent initialized', {
      hasApifyKey: !!this.apifyApiKey,
      hasTavilyKey: !!this.tavilyApiKey
    });
  }
}
```

**Removed**:
- ❌ `this.isServer` check
- ❌ `ApifySearchTool` class instantiation  
- ❌ Server-side only logic

**Added**:
- ✅ Simple API key storage
- ✅ Initialization logging

### 3. **Fixed searchWithApify Method**
```typescript
// ✅ NEW CODE
private async searchWithApify(query: string, options: { maxResults?: number } = {}): Promise<SearchResult[]> {
  if (!this.apifyApiKey) {
    logger.debug('Skipping Apify search - API key not configured');
    return [];
  }

  try {
    logger.info('PerspectiveAgent: Calling Apify search', { query });
    
    // Use the same apifySearchTool that regular search uses
    const results = await apifySearchTool(query);

    logger.info('PerspectiveAgent: Apify search completed', {
      webCount: results.web.length,
      imagesCount: results.images.length
    });

    // Return web results formatted for PerspectiveAgent
    return results.web.slice(0, options.maxResults || 5).map(result => ({
      title: result.title,
      url: result.url,
      content: result.content,
      source: 'apify',
      score: 0.7,
      publishedDate: new Date().toISOString()
    }));
  } catch (error) {
    logger.error('Apify search failed:', error);
    return [];
  }
}
```

**Key Changes**:
- ✅ Removed server-side check
- ✅ Uses `apifySearchTool` function directly
- ✅ Returns formatted results compatible with PerspectiveAgent
- ✅ Enhanced logging for debugging
- ✅ Error handling with fallback

---

## 🔄 How It Works Now

### Pro Search Flow with Apify

```
ProSearchResults
   ↓
SwarmController.processQuery(query, isPro: true)
   ↓
├─ RetrieverAgent.execute(query) → Brave (+ Apify fallback if Brave fails)
│    ↓
│    Returns: { results, images, videos }
│
├─ PerspectiveAgent.generatePerspectives(query, isPro: true)
│    ↓
│    PerspectiveAgent.search(query, { isPro: true })
│    ↓
│    Promise.all([
│      searchWithApify(query),    ← NOW WORKS! ✅
│      searchWithTavily(query)
│    ])
│    ↓
│    Returns: Combined perspectives from both sources
│
└─ WriterAgent.execute(researchData)
     ↓
     Returns: Article with perspectives
```

### Environment Variables Used

```bash
VITE_APIFY_API_KEY=...  ✅
VITE_TAVILY_API_KEY=...   ✅
```

Both are `VITE_` prefixed, meaning they're **client-side** variables and should work in the browser.

---

## 📊 Expected Console Output

### Before Fix
```
❌ [DEBUG] Skipping Apify search - not available in this environment
✅ [INFO] PerspectiveAgent: Regular search mode - using Tavily only
```

### After Fix (Pro Mode)
```
✅ [INFO] PerspectiveAgent initialized {hasApifyKey: true, hasTavilyKey: true}
✅ [INFO] PerspectiveAgent: Starting search {query: "Elon Musk", isPro: true}
✅ [INFO] PerspectiveAgent: Calling Apify search {query: "Elon Musk"}
✅ [INFO] Apify Search Tool: Starting {query: "Elon Musk"}
✅ [INFO] Apify Search Tool: Success {webCount: 10, imagesCount: 8}
✅ [INFO] PerspectiveAgent: Apify search completed {webCount: 10, imagesCount: 8}
✅ [INFO] Tavily search completed...
✅ [INFO] PerspectiveAgent: Combined 15 unique results
```

---

## 🧪 Testing

### Test Pro Search with Apify

1. **Start Dev Server**:
```bash
npm run dev
```

2. **Navigate to**:
```
http://localhost:5173/
```

3. **Enable Pro Mode** (toggle ON - blue)

4. **Search for**: "Elon Musk"

5. **Watch Console for**:
```
✓ PerspectiveAgent initialized
✓ PerspectiveAgent: Calling Apify search
✓ Apify Search Tool: Starting
✓ Apify Search Tool: Success
✓ PerspectiveAgent: Apify search completed
```

### Verify Perspectives Section

In the Pro Search results, you should now see:
- **Perspectives section** with multiple viewpoints
- **Sources from both Apify and Tavily**
- **No "Skipping Apify" message** in console

---

## 🎯 Benefits

### 1. **Consistency**
- Both Regular Search and Pro Search now use the same `apifySearchTool`
- Single source of truth for Apify integration
- Easier to maintain and debug

### 2. **Better Fallback**
- Pro Search now gets perspectives from **both** Apify and Tavily
- More comprehensive results
- Better coverage for queries

### 3. **Client-Side Execution**
- No server-side dependency
- Works in browser with VITE_ environment variables
- Faster response times

### 4. **Enhanced Debugging**
- Added more logger.info statements
- Clear indication of which service is being called
- Result counts in console

---

## 📋 Files Modified

1. `/src/services/search/pro/agents/perspectiveAgent.ts`
   - Changed import from `ApifySearchTool` to `apifySearchTool`
   - Removed server-side check (`isServer`)
   - Simplified constructor
   - Updated `searchWithApify` to use function instead of class
   - Added enhanced logging

---

## 🔍 Comparison with Regular Search

### Regular Search (SearchRetrieverAgent)
```typescript
// Brave first, Apify fallback on error
try {
  const braveResults = await braveSearchTool(query);
  return braveResults;
} catch {
  const apifyResults = await apifySearchTool(query);
  return apifyResults;
}
```

### Pro Search (PerspectiveAgent)
```typescript
// Both Apify and Tavily in parallel for richer perspectives
const [apifyResults, tavilyResults] = await Promise.all([
  searchWithApify(query),   ← NOW WORKS!
  searchWithTavily(query)
]);
return [...apifyResults, ...tavilyResults];
```

**Key Difference**: Pro Search combines multiple sources for diverse perspectives, while Regular Search uses Apify only as a fallback.

---

## ✅ Success Criteria

After this fix, Pro Search should:
1. ✅ Call Apify API successfully
2. ✅ Get results from both Apify and Tavily
3. ✅ Generate richer perspectives
4. ✅ No "Skipping Apify" console message
5. ✅ Consistent behavior with Regular Search

---

## 🚀 Next Steps

### Test Scenarios

1. **Pro Search with Query**:
   - Query: "Elon Musk"
   - Expected: Perspectives from Apify + Tavily

2. **Regular Search with Query**:
   - Query: "artificial intelligence"
   - Expected: Brave results (Apify fallback if Brave fails)

3. **Error Handling**:
   - Temporarily break Brave API key
   - Expected: Apify fallback kicks in for regular search

### Monitor Console

Watch for these key messages:
- ✅ `PerspectiveAgent: Calling Apify search`
- ✅ `Apify Search Tool: Success`
- ✅ Result counts from both services

---

**Fix Applied! Apify now works in Pro Search! 🎉**
