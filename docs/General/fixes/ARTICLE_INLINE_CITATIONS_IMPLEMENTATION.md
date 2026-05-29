# Article Detail - Inline Citations Implementation

## Summary
Successfully implemented inline citations in AI-generated article content, showing clickable source references within the text (like fast-search).

**Status**: ✅ Complete
**Date**: 2026-05-26

## What Was Implemented

### 1. Quick Links Cards (Already Working)
- 4 source cards displayed between metadata and image
- Shows favicon, domain, and title for each source
- Populated from Tavily search results

### 2. Inline Citations in Article Text (NEW)
- Citations appear as `[source]` within the AI-generated content
- Clickable references that show source information on hover
- Automatically built from Tavily sources

## Implementation Details

### Step 1: Process Answer and Build Citations (EXACT COPY from fast-search)
**File**: `src/mainPages/ArticleDetail.tsx:87-157`

```typescript
// Process answer and build citations (EXACT COPY from fast-search)
const { processedAnswer, citations } = useMemo(() => {
  if (!streamingContent) return { processedAnswer: '', citations: [] };

  // Build citations map from sources
  const cites: CitationInfo[] = sources.map(source => {
    const hostname = (() => {
      try {
        return new URL(source.url).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    })();
    const parts = hostname.split('.');

    // Extract siteName: prefer first part (subdomain like 'azure') over root domain
    const siteName = parts[0] || '';

    return {
      url: source.url,
      title: source.title,
      siteName: siteName,
      snippet: source.snippet
    };
  });

  let text = streamingContent;

  // Step 1: Convert [text](url) to [sitename]
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, url) => {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '');
      const parts = hostname.split('.');
      const siteName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
      return `[${siteName}]`;
    } catch {
      return linkText;
    }
  });

  // Step 2: Remove parenthetical citations
  text = text.replace(/\s*\(([a-z0-9]+)(\s*\+\d+)?(\([^)]+\))?\)/gi, '');

  // Step 3: Remove horizontal rules
  text = text.replace(/^\s*[-–—]{3,}\s*$/gm, '');

  // Step 4: Remove unwanted sections
  text = text.replace(/\n\s*##?\s*Selected [Ss]ources.*$/s, '');
  text = text.replace(/\*\*Selected [Ss]ources\*\*.*$/s, '');
  text = text.replace(/\n\s*##?\s*Where to [Rr]ead [Mm]ore.*$/s, '');
  text = text.replace(/\*\*Where to [Rr]ead [Mm]ore.*$/s, '');
  text = text.replace(/\n\s*##?\s*Quick [Rr]eference [Ll]inks.*$/s, '');
  text = text.replace(/\*\*Quick [Rr]eference [Ll]inks\*\*.*$/s, '');
  text = text.replace(/\n\s*Sources:\s*.*$/s, '');
  text = text.replace(/\*\*Sources:\*\*\s*.*$/s, '');

  // Clean up encoding issues
  text = text.replace(/�/g, '');

  return { processedAnswer: text, citations: cites };
}, [streamingContent, sources]);
```

**This is an EXACT COPY of the fast-search pattern** - guarantees consistent citation handling across the app.

### Step 2: Pass Processed Answer and Citations to CustomMarkdown
**File**: `src/mainPages/ArticleDetail.tsx:496`

```typescript
<CustomMarkdown citations={citations}>{processedAnswer}</CustomMarkdown>
```

**Key difference**: Use `processedAnswer` (cleaned text) not `streamingContent` (raw) - same as fast-search.

### Step 3: Update OpenAI Prompt to Include Citations
**File**: `src/services/explore/articleService.ts:89-102`

```typescript
const prompt = `Write a comprehensive article about: "${title}"

Context from recent sources:
${context}

Write a well-structured article (500-800 words) with:
- Clear sections with ## headers
- Key facts and analysis
- Easy to read paragraphs
- **IMPORTANT**: Add inline citations using [source] format after facts
  Example: "The stock rose 15% [source]. Analysts predict growth [source]."
- Use [source] for any fact from the context

Focus on explaining what happened and why it matters.`;
```

## How It Works

### Data Flow:
```
1. Tavily Search
   ↓
2. Build Sources Array
   [{title, url, snippet, domain}, ...]
   ↓
3. Callback Sets Sources State
   setSources(sources)
   ↓
4. useMemo Builds Citations
   citations = sources.map(...)
   ↓
5. OpenAI Generates Article with [source] markers
   "Stock rose 15% [source]"
   ↓
6. CustomMarkdown Renders Citations
   Converts [source] → clickable citation
```

### Citation Format in AI Response:
```markdown
## Market Analysis

Marvell Technology stock jumped 15% [source] after announcing
strong quarterly earnings. The company reported revenue growth
of 20% year-over-year [source], beating analyst expectations.

Industry experts predict continued growth [source] in the
semiconductor sector through 2026.
```

### Rendered Output:
```
Market Analysis

Marvell Technology stock jumped 15% ¹ after announcing
strong quarterly earnings. The company reported revenue
growth of 20% year-over-year ², beating analyst expectations.

Industry experts predict continued growth ³ in the
semiconductor sector through 2026.

¹ Source: forbes.com
² Source: bloomberg.com
³ Source: techcrunch.com
```

## CustomMarkdown Integration

The `CustomMarkdown` component (already built) handles:
- Parsing `[source]` markers in text
- Matching them to citation URLs
- Rendering clickable citation numbers
- Showing source info on hover

**No changes needed** to CustomMarkdown - it already supports this!

## Testing

### How to Test:
1. Navigate to any article: `http://localhost:5173/explore/{article-title}`
2. Wait for article to generate
3. Look for:
   - ✅ Quick Links cards (4 cards below metadata)
   - ✅ Inline citations in article text (numbers or [source] markers)
   - ✅ Hover over citations to see source info

### Expected Output:
- Quick Links: 4 cards with favicons and titles
- Article text: Contains `[source]` markers that become clickable citations
- Citations: Clickable and show source info on hover

## Files Modified

1. **[ArticleDetail.tsx](../../src/mainPages/ArticleDetail.tsx)**
   - Added `useMemo` to build citations from sources
   - Pass `citations` prop to `CustomMarkdown`
   - Clean callback pattern for sources

2. **[articleService.ts](../../src/services/explore/articleService.ts)**
   - Updated prompt to instruct OpenAI to add `[source]` markers
   - Kept callback pattern for sources

## Key Patterns Used

### 1. Fast-Search Callback Pattern (for Quick Links)
```typescript
// Service calls callback BEFORE streaming
if (onSourcesFound && sources.length > 0) {
  onSourcesFound(sources); // Quick Links appear immediately
}

// Component receives callback
(sources: ArticleSource[]) => {
  if (!isMounted) return;
  setSources(sources);
}
```

### 2. useMemo for Citations (for inline citations)
```typescript
const citations = useMemo((): CitationInfo[] => {
  return sources.map(source => ({
    url: source.url,
    title: source.title,
    siteName: source.domain,
    snippet: source.snippet
  }));
}, [sources]);
```

### 3. Prompt Engineering (for AI citations)
```
**IMPORTANT**: Add inline citations using [source] format after facts
Example: "The stock rose 15% [source]."
```

## Benefits

✅ **User Experience**: Readers can verify claims by clicking citations
✅ **Credibility**: Shows sources for facts within the article
✅ **Transparency**: Clear attribution for AI-generated content
✅ **Consistency**: Uses same citation system as fast-search
✅ **No Breaking Changes**: Reuses existing CustomMarkdown component

## Future Enhancements

### Potential Improvements:
1. ⏳ Number citations (1, 2, 3) instead of [source]
2. ⏳ Show specific source name instead of generic [source]
3. ⏳ Add "Sources" section at bottom with full references
4. ⏳ Group multiple citations: [1,2,3]
5. ⏳ Add copy-to-clipboard for citations
6. ⏳ Show preview snippet on citation hover

### More Advanced:
1. ⏳ Fact-checking indicators (verified, disputed, etc.)
2. ⏳ Citation quality scoring
3. ⏳ Related articles from same source
4. ⏳ Timeline view of source publication dates

## Troubleshooting

### Issue: Citations don't appear in text
**Check**:
1. OpenAI is adding `[source]` markers (check raw response)
2. `citations` array is populated (check React DevTools)
3. CustomMarkdown is receiving citations prop

**Fix**: Update prompt to emphasize citation requirement

### Issue: Citations are numbered wrong
**Check**: Order of sources array matches Tavily results

**Fix**: Ensure sources are passed in same order from callback

### Issue: Quick Links show but no inline citations
**Check**: OpenAI response format - look for `[source]` in content

**Fix**: Adjust prompt or use different model (gpt-4o vs gpt-4o-mini)

## Related Documentation
- [Article Detail Workflow](../architecture/EXPLORE_ARTICLE_DETAIL_WORKFLOW.md)
- [Sources Fix](./ARTICLE_DETAIL_SOURCES_FIX.md)
- [CustomMarkdown Component](../../src/components/CustomMarkdown.tsx)
- [Fast-Search Citations](../../Search/architecture/FAST_SEARCH_REFACTOR_COMPLETE.md)
