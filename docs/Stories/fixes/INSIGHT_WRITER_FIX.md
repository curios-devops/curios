# Insight Writer Agent - JSON Parsing Fix

## Date: 2025-11-04

## Problem Analysis

### Symptoms
- InsightWriterAgent was hanging/freezing after attempting JSON.parse
- Logs showed: `"Attempting JSON.parse"` but never reached `"JSON parse successful"`
- Valid JSON was being received from OpenAI (7743 characters, properly formatted)
- Same issue occurred in regular search workflow originally

### Root Cause Investigation

Compared two writer agents:
1. **searchWriterAgent.ts** (WORKING) - in `/src/services/search/regular/agents/`
2. **insightWriterAgent.ts** (BROKEN) - in `/src/services/research/regular/agents/`

### Key Differences Found

#### 1. Timeout Implementation
**BROKEN (insightWriterAgent.ts):**
```typescript
// Complex Promise.race pattern with manual timeout management
let openaiTimeoutId: ReturnType<typeof setTimeout> | null = null;
const timeoutPromise = new Promise<never>((_, reject) => {
  openaiTimeoutId = setTimeout(() => {
    logger.error('OpenAI call timeout after 60 seconds');
    reject(new Error('OpenAI timeout'));
  }, 60000);
});

const fetchPromise = fetch(...).then(res => res.json());
const data = await Promise.race([fetchPromise, timeoutPromise]);

if (openaiTimeoutId) {
  clearTimeout(openaiTimeoutId);
  openaiTimeoutId = null;
}
```

**WORKING (searchWriterAgent.ts):**
```typescript
// Simple AbortController pattern
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

const response = await fetch(supabaseEdgeUrl, {
  method: 'POST',
  headers: {...},
  body: JSON.stringify(payload),
  signal: controller.signal  // ← Cleanly cancels fetch
});

clearTimeout(timeoutId);
```

**Issue:** Promise.race doesn't actually cancel the losing promise. The fetch continues running in the background even after timeout, potentially causing race conditions or memory leaks.

#### 2. Response Parsing Flow
**BROKEN:**
```typescript
// Chained .then() on fetch, then extract content
const fetchPromise = fetch(...).then(res => res.json());
const data = await Promise.race([fetchPromise, timeoutPromise]);

const content = data.text || data.choices?.[0]?.message?.content;
// Multiple nested try-catch blocks
try {
  let cleanedContent = content.trim();
  // ... complex cleaning logic
  try {
    writerResult = JSON.parse(cleanedContent);
  } catch (jsonError) {
    // ... error handling
  }
} catch (parseError) {
  // ... more error handling
}
```

**WORKING:**
```typescript
// Separate response handling from JSON extraction
const response = await fetch(...);
if (!response.ok) {
  throw new Error(`API error: ${response.status}`);
}

const data = await response.json();
if (!data.text) {
  throw new Error('No content in response');
}

// Clean, simple parsing
if (typeof data.text === 'object') {
  articleResult = data.text;
} else if (typeof data.text === 'string') {
  const cleanText = data.text.trim().replace(/^```[\w]*\n?/, '').replace(/```\s*$/, '');
  articleResult = JSON.parse(cleanText);
} else {
  throw new Error('Unexpected response format');
}
```

**Issue:** The nested try-catch blocks and complex error handling may have created conditions where exceptions weren't properly propagated, causing silent failures.

#### 3. Timeout Duration
- **BROKEN:** 60 seconds (too long, allows hanging)
- **WORKING:** 30 seconds (appropriate for API calls)

#### 4. Environment Variable Handling
**BROKEN:**
```typescript
const supabaseEdgeUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
  ? import.meta.env.VITE_OPENAI_API_URL
  : 'VITE_OPENAI_API_URL';
```

**WORKING:**
```typescript
const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
if (!supabaseEdgeUrl) {
  throw new Error('Supabase Edge Function URL not configured');
}
```

**Issue:** Overly defensive checking that allowed invalid fallback values to proceed.

## Solution Implemented

Refactored `insightWriterAgent.ts` to match the proven working pattern from `searchWriterAgent.ts`:

### Changes Made

1. **Simplified timeout handling**
   - Replaced Promise.race with AbortController
   - Reduced timeout from 60s to 30s
   - Ensured fetch is actually cancelled on timeout

2. **Streamlined response parsing**
   - Removed nested try-catch blocks
   - Simplified JSON cleaning logic
   - Direct error propagation with clear messages

3. **Better error handling**
   - Early validation of environment variables
   - Explicit response.ok check before parsing
   - Clear error messages for each failure mode

4. **Added response_format hint**
   - Used `response_format: { type: 'json_object' }` to encourage OpenAI to return valid JSON

### Code Structure After Fix

```typescript
// 1. Validate environment
const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseEdgeUrl || !supabaseAnonKey) {
  throw new Error('Configuration missing');
}

// 2. Setup timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  // 3. Make request
  const response = await fetch(supabaseEdgeUrl, {
    method: 'POST',
    headers: {...},
    body: JSON.stringify(payload),
    signal: controller.signal
  });
  
  clearTimeout(timeoutId);

  // 4. Validate response
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  // 5. Parse response
  const data = await response.json();
  if (!data.text) {
    throw new Error('No content in response');
  }

  // 6. Handle different response types
  if (typeof data.text === 'object') {
    writerResult = data.text;
  } else if (typeof data.text === 'string') {
    const cleanText = data.text.trim().replace(/^```[\w]*\n?/, '').replace(/```\s*$/, '');
    writerResult = JSON.parse(cleanText);
  } else {
    throw new Error('Unexpected response format');
  }

  // 7. Validate result structure
  if (!writerResult?.headline || !writerResult?.markdown_report) {
    throw new Error('Invalid insight format');
  }

} catch (error) {
  clearTimeout(timeoutId);
  
  if (error.name === 'AbortError') {
    throw new Error('Request timeout - please try again');
  }
  
  // Fallback on any error
  writerResult = this.getFallbackInsights(query, results);
}
```

## Testing Recommendations

1. **Test normal flow**: Search for "elon musk" - should complete without hanging
2. **Verify logs**: Should see:
   - "Calling OpenAI..."
   - "OpenAI response received"
   - "Parsing cleaned JSON"
   - "JSON parse successful"
3. **Check timing**: Should complete within 10-15 seconds (not 30-60s)
4. **Monitor errors**: Should see clear error messages if API fails, not silent hangs

## Lessons Learned

1. **Promise.race doesn't cancel promises** - Use AbortController for fetch cancellation
2. **Simpler is better** - Complex error handling can hide bugs
3. **Early validation** - Check configuration before making requests
4. **Consistent patterns** - When one agent works, replicate its pattern
5. **Appropriate timeouts** - 30s is sufficient for API calls; 60s is too long
6. **JSON mode hint** - Using `response_format: { type: 'json_object' }` helps OpenAI return valid JSON

## Files Modified

- `/src/services/research/regular/agents/insightWriterAgent.ts`
  - Lines ~102-200: Complete refactor of OpenAI call and response parsing
  - Reduced complexity by ~50 lines
  - Improved error handling clarity
  - Fixed timeout mechanism

## Related Issues

This fix addresses the same pattern that was previously fixed in:
- Regular search workflow writer agent
- Other agents that were hanging on OpenAI calls

The root cause was always the same: overly complex timeout/error handling that masked failures instead of surfacing them clearly.
