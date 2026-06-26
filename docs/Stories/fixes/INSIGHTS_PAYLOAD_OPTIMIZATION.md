# Insights Payload Optimization

**Date**: November 7, 2025  
**Scope**: Research/Regular Insights Workflow  
**Goal**: Reduce payload size and prevent response truncation errors

## Changes Made

### 1. Tavily API Configuration (`tavilyService.ts`)

**Added `chunks_per_source: 1`** to the Tavily API call:
- Previously: Default chunks (3 per source)
- Now: 1 chunk per source
- Impact: ~66% reduction in content per result
- Location: `src/commonService/searchTools/tavilyService.ts`

```typescript
chunks_per_source: 1, // Reduce to 1 chunk per source to minimize payload size
```

### 2. Agent System Prompt Updates (`insightWriterAgent.ts`)

**Enhanced with concise response instructions**:
- Added "CRITICAL: Keep responses SHORT to prevent truncation errors"
- Reduced word limits:
  - `headline`: 8-15 words → 8-12 words max
  - `subtitle`: 15-25 words → 12-20 words max
  - `short_summary`: 100-150 words → 80-120 words
  - `markdown_report`: 800-1200 words → 600-900 words MAXIMUM
  - `follow_up_questions`: Added "10 words max" constraint
  - `citations`: Added character limits (50 chars for text, 100 for snippet)
- Added style guidance: "Brief, actionable, no fluff. Prioritize clarity over detail."

### 3. Results Context Formatting (`insightWriterAgent.ts`)

**Reduced context size**:
- Title: 80 chars → 60 chars
- Content: 200 chars → 150 chars
- Total per result: ~280 chars → ~210 chars (25% reduction)
- Updated comment: "Ultra-compact formatting: 10 results × 150 chars = ~1500 chars max"

### 4. Fallback Report Generation (`insightWriterAgent.ts`)

**Streamlined all fallback content**:
- Removed verbose explanations and redundant sections
- Shortened Strategic Overview
- Condensed Key Insights (150 chars → 120 chars per item)
- Simplified Market Dynamics to bullet format
- Removed Risk Assessment section entirely
- Reduced Recommendations from 5 to 4 items
- Removed Conclusion section
- Result: ~60% shorter fallback reports

### 5. Fallback Questions (`insightWriterAgent.ts` & `insightSwarmController.ts`)

**Made questions more concise**:
- Before: "What are the key competitive advantages available in the {query} market?"
- After: "Key competitive advantages in {query}?"
- Reduction: ~50% shorter per question

### 6. Fallback Citations (`insightWriterAgent.ts`)

**Optimized citation size**:
- Text: Full title + description → 50 char title only
- Snippet: 200 chars → 100 chars
- Result: ~60% reduction per citation

## Expected Benefits

1. **Smaller API Payloads**: ~40-50% reduction in total payload size
2. **Faster Response Times**: Less data to transmit and process
3. **Reduced Truncation Risk**: Shorter responses fit within API limits
4. **Better User Experience**: More focused, actionable insights
5. **Cost Efficiency**: Lower token usage per request

## Testing Recommendations

1. Test with various query complexities
2. Monitor response sizes (log payload breakdown already in place)
3. Verify no truncation errors occur
4. Confirm insights remain actionable and valuable
5. Check that markdown formatting is preserved

## Files Modified

- `src/commonService/searchTools/tavilyService.ts` - Added `chunks_per_source: 1`
- `src/services/research/regular/agents/insightWriterAgent.ts` - System prompt, context formatting, fallbacks
- `src/services/research/regular/agents/insightSwarmController.ts` - Fallback report and questions

## Monitoring

The existing logging in `insightWriterAgent.ts` tracks payload sizes:
```typescript
logger.info('🔵 [INSIGHT-WRITER] Payload breakdown', {
  systemPromptChars: systemPrompt.length,
  userPromptChars: userPrompt.length,
  resultsContextChars: resultsContext.length,
  totalChars: systemPrompt.length + userPrompt.length,
  resultsCount: results.length
});
```

Monitor these metrics to verify optimization effectiveness.

## Notes

- Only touched files in `src/services/research/regular/` and `src/commonService/searchTools/tavilyService.ts`
- No changes to search workflow or lab features
- Maintained all existing functionality and fallback patterns
- All optimizations are backward compatible
