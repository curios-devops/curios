# Article Detail Citations Implementation

## Overview

The Article Detail page displays AI-generated content with inline citations, matching the fast-search implementation exactly. Citations appear as clickable badges within the text that open dropdown tooltips with source information.

## Architecture

### Components

1. **ArticleDetail.tsx** - Main page component
   - Fetches article metadata from API
   - Calls `generateArticleContentStreaming()` for content + sources
   - Processes streaming content and builds citation map
   - Renders CustomMarkdown with citations

2. **articleService.ts** - Content generation service
   - Performs Tavily search using article title
   - Calls onSourcesFound() callback immediately (for Quick Links)
   - Builds OpenAI prompt with citation instructions
   - Streams GPT-4o-mini response

3. **CustomMarkdown.tsx** - Markdown renderer with citation support
   - Uses `parseCitation()` to match citation text with sources
   - Renders `MultipleCitations` component for each citation
   - Handles fallback for unmatched citations

4. **MultipleCitations.tsx** - Citation badge + tooltip component
   - Shows site name badge (e.g., "wikipedia", "youtube +3")
   - Opens tooltip on hover/click
   - Displays source card with favicon, title, snippet
   - Includes navigation for multiple sources

5. **citationParser.ts** - Citation matching logic
   - Parses "[sitename]" or "[sitename +N]" format
   - Matches against citation array by site name or domain
   - Returns parsed citation with type (single/multiple)

## Data Flow

```
1. User navigates to article URL
   ↓
2. ArticleDetail fetches metadata from API
   ↓
3. generateArticleContentStreaming() called with title
   ↓
4. Tavily search completes → onSourcesFound() callback
   ↓
5. Quick Links cards appear immediately (4 cards)
   ↓
6. OpenAI streaming starts with citation instructions
   ↓
7. Content chunks processed → streamingContent state
   ↓
8. useMemo processes text and builds citation map
   ↓
9. CustomMarkdown renders with citations array
   ↓
10. MultipleCitations renders clickable badges
```

## Citation Format

### Single Citation
```
[wikipedia]
```
Displays: Blue badge "wikipedia"
On hover/click: Tooltip with Wikipedia source card

### Multiple Citations
```
[youtube +2]
```
Displays: Blue badge "youtube +2"
On hover/click: Tooltip with navigation (1/3, 2/3, 3/3)

## OpenAI Prompt Instructions

The prompt includes:
- Available site names from Tavily results
- Citation format examples: `[wikipedia]`, `[youtube +2]`
- Clear instructions to use actual site names (not "source")
- Requirement for 500-800 word comprehensive response

Example prompt excerpt:
```
Requirements:
- Use inline citations with the website name like [wikipedia], [forbes]
- If multiple sources from the same site, use [sitename +N] format like [youtube +2] for 3 youtube sources
- Provide a clear, well-structured response in markdown format with ## headers
- Make response comprehensive and informative (500-800 words)
- DO NOT include follow-up questions in the response text
```

## Citation Processing (ArticleDetail.tsx)

### Step 1: Build Citations Array
```typescript
const cites: CitationInfo[] = sources.map(source => {
  const hostname = new URL(source.url).hostname.replace(/^www\./, '');
  const parts = hostname.split('.');
  const siteName = parts[0] || '';

  return {
    url: source.url,
    title: source.title,
    siteName: siteName,
    snippet: source.snippet
  };
});
```

### Step 2: Clean Text
- Convert markdown links `[text](url)` to `[sitename]`
- Remove parenthetical citations `(sitename)`, `(sitename +N)`
- Remove horizontal rules `---`
- Remove "Selected sources", "Where to read more" sections
- Clean encoding issues

### Step 3: Render with CustomMarkdown
```typescript
<CustomMarkdown
  content={processedAnswer}
  citations={citations}
/>
```

## Citation Matching Logic (citationParser.ts)

### Matching Algorithm
1. Parse citation text (strip brackets)
2. Extract site name and +N count
3. Take first whitespace-separated token as site key
4. Find matching citations by:
   - Direct siteName match (lowercase)
   - Root domain match (extract from URL)
   - Partial match fallback
5. Return citation array based on count:
   - If `+2` specified: return 3 sources (N+1)
   - If no count: return all matches
   - If not enough matches: duplicate first source

### Example Matching
```typescript
// Citation text: "wikipedia +2"
// Matches: 3 Wikipedia sources
// Returns: { type: 'multiple', siteName: 'wikipedia', citations: [...3 items] }

// Citation text: "forbes"
// Matches: 1 Forbes source
// Returns: { type: 'single', siteName: 'forbes', citations: [...1 item] }
```

## MultipleCitations Component (MultipleCitations.tsx)

### Features
- **Deduplication**: Removes duplicate URLs before display
- **State Management**:
  - `showTooltip`: Controls tooltip visibility
  - `currentIndex`: Tracks current source in navigation
- **Mobile Support**: Click handling with stopPropagation
- **Favicon**: Loaded from Google's favicon service
- **Responsive**: Tooltip positioned above badge with pointer arrow

### Badge Display
```tsx
<button className="inline-flex items-center px-2 py-0.5 mx-0.5">
  {uniqueCitations.length === 1
    ? primarySiteName
    : `${primarySiteName} +${additionalCount}`
  }
</button>
```

### Tooltip Structure
```
┌─────────────────────────────┐
│  ← [1 / 3] →               │  ← Navigation (multiple only)
├─────────────────────────────┤
│  🔸 youtube                 │  ← Favicon + site name
│  Video Title Here           │  ← Title (clickable link)
│  Snippet text...            │  ← Snippet
├─────────────────────────────┤
│  3 sources                  │  ← Footer (multiple only)
└─────────────────────────────┘
       ▼                           ← Pointer arrow
```

## Quick Links Section

Displayed between metadata and image, showing first 4 Tavily sources:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {sources.slice(0, 4).map(source => (
    <a href={source.url} className="group p-4 border...">
      <h3>{source.title}</h3>
      <p>{source.snippet}</p>
      <span>{source.domain}</span>
    </a>
  ))}
</div>
```

## Testing

### Test URL
```
http://localhost:5173/explore/Why%20Marvell%20Technology%20Stock%20Just%20Popped
```

### Expected Behavior

1. **Page Load**
   - Metadata displays (icon, title, source, authors, date)
   - Quick Links section appears immediately after Tavily completes
   - 4 source cards displayed below metadata

2. **Streaming**
   - Text appears gradually with typewriter effect
   - Citations appear as blue badges inline
   - Single citations: "wikipedia", "forbes"
   - Multiple citations: "youtube +2", "azure +3"

3. **Citation Interaction**
   - Hover over badge: Tooltip appears above
   - Click badge: Tooltip toggles (mobile)
   - Tooltip shows: favicon, site name, title, snippet
   - Multiple citations: Navigation arrows, "1/3" counter
   - Click title: Opens source in new tab
   - Click outside: Tooltip closes

4. **Citation Matching**
   - OpenAI uses site names from prompt
   - Parser matches against sources array
   - Unmatched citations show as plain badges (fallback)

### Debug Console Logs

When testing, watch for these logs:

```
[ARTICLE SERVICE] Step 1: Fetching Tavily context
[ARTICLE SERVICE] Step 2: Tavily complete { resultCount: 10 }
[ARTICLE SERVICE] Calling onSourcesFound callback { count: 10 }
[ARTICLE SERVICE] Step 3: Calling OpenAI with context
[ARTICLE SERVICE] Step 4: Streaming complete
```

In ArticleDetail:
```
=== ARTICLE GENERATION START ===
Sources found (via callback): 10
Streaming complete
Final content length: [number]
Final sources count: 10
```

## Troubleshooting

### Citations Not Appearing
- Check that `sources` array is populated
- Verify OpenAI is generating `[sitename]` format
- Check console for citation parsing errors

### Citations Not Clickable
- Verify MultipleCitations component is rendering
- Check for CSS z-index conflicts
- Ensure onClick handlers have stopPropagation

### Wrong Site Names
- Check Tavily results domain extraction
- Verify OpenAI prompt includes correct site names
- Test citation parser with sample data

### Quick Links Not Showing
- Verify `onSourcesFound()` callback is firing
- Check sources state is being set
- Look for React strict mode double-mount issues

## Code Locations

- [ArticleDetail.tsx:87-157](src/mainPages/ArticleDetail.tsx#L87-L157) - Citation processing
- [ArticleDetail.tsx:324-387](src/mainPages/ArticleDetail.tsx#L324-L387) - Quick Links rendering
- [articleService.ts:33-165](src/services/explore/articleService.ts#L33-L165) - Content generation
- [CustomMarkdown.tsx:145-153](src/components/CustomMarkdown.tsx#L145-L153) - Citation rendering
- [MultipleCitations.tsx](src/components/citations/MultipleCitations.tsx) - Badge component
- [citationParser.ts:14-97](src/components/citations/citationParser.ts#L14-L97) - Matching logic

## Comparison with Fast-Search

This implementation is an **exact copy** of the fast-search citation system:

| Feature | Fast-Search | Article Detail |
|---------|-------------|----------------|
| Citation format | `[sitename]`, `[sitename +N]` | ✅ Same |
| Badge component | MultipleCitations | ✅ Same |
| Tooltip UI | Hover/click dropdown | ✅ Same |
| Navigation | Arrows for multiple | ✅ Same |
| Callback pattern | Sources before streaming | ✅ Same |
| Citation parser | parseCitation() | ✅ Same |

The only differences are:
- **Data source**: Fast-search uses OpenAI web_search tool, Article Detail uses Tavily
- **Prompt**: Slightly different instructions for article format vs. answer format
- **Quick Links**: Article Detail shows 4 cards, Fast-search shows inline list

## Next Steps (Optional)

1. **Carousel Implementation**: Show all sources (not just 4) in a carousel
2. **Citation Count Badge**: Show total citation count next to heading
3. **Citation Index**: Add small superscript numbers for academic style
4. **Keyboard Navigation**: Arrow keys to navigate tooltip sources
5. **Analytics**: Track citation clicks to see which sources users explore
