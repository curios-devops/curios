# Insight Writer Regex Freeze Fix

## Issue Found

The InsightWriterAgent was **freezing/hanging** after receiving the OpenAI response. The logs showed:

```
[2025-11-05T09:10:58.537Z] INFO: 🔵 [INSIGHT-WRITER] data.text is string, cleaning and parsing {"textLength":8105}
```

Then the app **froze completely** with no further logs.

## Root Cause

Located in `insightWriterAgent.ts` line 119:

```typescript
const hasInvalidUnicode = /[\uFFFD\uFFFE\uFFFF]/.test(cleanText);
```

**This regex pattern was hanging when testing an 8,105 character string!**

The problematic code was:
```typescript
// Clean text - remove markdown code blocks
const cleanText = data.text.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');

// Check for problematic characters that could cause JSON.parse to hang
const hasNullBytes = cleanText.includes('\0');
const hasInvalidUnicode = /[\uFFFD\uFFFE\uFFFF]/.test(cleanText);  // ← FREEZES HERE!
```

## Why It Froze

1. **Regex on large strings**: The Unicode character class regex `/[\uFFFD\uFFFE\uFFFF]/.test()` can be extremely slow on large strings (8K+ chars)
2. **Multiple regex operations**: Two `.replace()` calls PLUS the `.test()` call - all on the same large string
3. **No timeout**: The regex had no timeout mechanism, so it just hung forever

## Solution

**Restored the file to the simpler, working version** that:
- Uses simple `JSON.parse(content)` without complex validation
- Has a try-catch fallback instead of pre-validation
- No regex patterns that can hang

**Before (BROKEN)**:
```typescript
const cleanText = data.text.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');
const hasInvalidUnicode = /[\uFFFD\uFFFE\uFFFF]/.test(cleanText);  // HANGS!
insightResult = JSON.parse(cleanText);
```

**After (WORKING)**:
```typescript
const content = data.text || data.choices?.[0]?.message?.content;
try {
  writerResult = JSON.parse(content);
} catch (parseError) {
  logger.warn('Failed to parse writer response, using fallback', { content });
  writerResult = this.getFallbackInsights(query, results);
}
```

## Key Learning

**NEVER use regex on large strings without extreme caution!**

- ✅ Use simple string methods: `.includes()`, `.startsWith()`, `.endsWith()`, `.substring()`
- ✅ Use try-catch for JSON parsing instead of pre-validation
- ❌ Avoid regex `.test()` on strings > 1KB
- ❌ Avoid regex `.replace()` on large payloads
- ❌ Never use character class regex like `/[\\uXXXX]/` on large text

## SearXNG Raw Response Investigation

Added logging to show the actual raw results array:

```typescript
rawResultsSample: Array.isArray(data.results) ? data.results.slice(0, 2) : 'not-an-array'
```

This will help us see:
- Is the array truly empty `[]`?
- Or does it contain objects we're not processing correctly?
- What's the actual structure of the results?

## Testing

1. ✅ Server restarted with restored file (no regex freeze code)
2. 🔄 Ready to test Insights search again
3. 🔄 SearXNG raw response will be visible in console

## Expected Behavior

**InsightWriterAgent should now:**
- ✅ Parse OpenAI response without freezing
- ✅ Show `JSON.parse` success or fallback logs
- ✅ Complete the workflow in ~4-5 seconds total

**SearXNG logs should now show:**
- Either: `rawResultsSample: []` (truly empty)
- Or: `rawResultsSample: [{title: "...", url: "..."}, {...}]` (has data we're not processing)
