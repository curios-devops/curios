# FastSearch Citation Links Fix

**Date**: 2026-05-15
**Status**: Complete ✓

## Problem

Source citation badges (like `[wikipedia]`, `[nytimes]`) were appearing in the answer but were not clickable links. They showed as plain text badges without URLs.

## Root Cause

The citation processing in FastSearchResults was trying to extract citations from markdown links `[text](url)` in the streaming answer, but the LLM was simply outputting bare citation tags like `[wikipedia]` without URLs.

The LLM receives sources with this format in its prompt:
```
[wikipedia] Article Title
URL: https://en.wikipedia.org/...
Content: Article snippet...
```

And returns citations inline as `[wikipedia]`, but the component wasn't mapping these back to the actual source URLs.

## Solution

**File**: [FastSearchResults.tsx](../../../src/services/fast-search/pages/FastSearchResults.tsx#L51-116)

Changed the citation processing to build the citations array directly from `foundSources` instead of trying to extract them from markdown links.

### Before
```typescript
const { processedAnswer, citations } = useMemo(() => {
  const cites: CitationInfo[] = [];
  const citationMap = new Map<string, number>();

  // Try to extract citations from markdown links [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    // Build citations from URLs found in text
    citationMap.set(cleanUrl, cites.length);
    cites.push({ url: cleanUrl, title: linkText, siteName, snippet: '' });
    return `[${siteName}]`;
  });

  return { processedAnswer: text, citations: cites };
}, [streamingAnswer]);
```

**Problem**: The LLM doesn't output `[text](url)` - it outputs `[sitename]`, so no citations were captured.

### After
```typescript
const { processedAnswer, citations } = useMemo(() => {
  // Build citations directly from foundSources
  const cites: CitationInfo[] = foundSources.map(source => {
    const hostname = new URL(source.url).hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    const siteName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];

    return {
      url: source.url,
      title: source.title,
      siteName: siteName,
      snippet: source.snippet
    };
  });

  // Process text (clean up, remove unwanted sections)
  let text = streamingAnswer;
  // ... text processing ...

  return { processedAnswer: text, citations: cites };
}, [streamingAnswer, foundSources]);
```

**Solution**: Build the complete citations array from `foundSources` which contains all the source URLs, titles, and snippets.

## How It Works

1. **Sources Found**: When web search completes, `foundSources` is populated with all search results
2. **Citations Built**: The useMemo creates a citation for each source with:
   - `url`: Full source URL
   - `title`: Source title
   - `siteName`: Extracted domain name (e.g., "wikipedia", "nytimes")
   - `snippet`: Source snippet for tooltips

3. **LLM Output**: The streaming answer contains `[wikipedia]`, `[nytimes]`, etc.

4. **Rendering**: CustomMarkdown component receives:
   - `processedAnswer`: The cleaned text with `[sitename]` tags
   - `citations`: Array of all sources with URLs

5. **Matching**: CustomMarkdown matches `[sitename]` in the text to the citations array by `siteName` and creates clickable badges

## Citation Format

The citations now include all necessary information:
```typescript
{
  url: "https://en.wikipedia.org/wiki/Elon_Musk",
  title: "Elon Musk - Wikipedia",
  siteName: "wikipedia",
  snippet: "Elon Reeve Musk is a business magnate..."
}
```

When the LLM writes `[wikipedia]` in the answer, CustomMarkdown can now:
1. Find the citation with `siteName === "wikipedia"`
2. Create a clickable badge that links to the URL
3. Show a tooltip with the snippet on hover

## Result

✅ Citation badges are now clickable links
✅ Hover shows source snippet in tooltip
✅ All sources from search results are available as citations
✅ Works for all citation formats: `[sitename]`, `[sitename +N]`

---

**Status**: Citation links working correctly ✓
