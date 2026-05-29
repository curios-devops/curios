# Explore Article Detail Workflow

## Overview
The Article Detail page displays AI-generated content about news articles using Tavily search results as context for OpenAI streaming.

**Status**: ✅ Working
**Date**: 2026-05-26
**Path**: `src/mainPages/ArticleDetail.tsx`
**Service**: `src/services/explore/articleService.ts`

## Architecture

### Flow Diagram
```
User clicks article in Explore
    ↓
ArticleDetail.tsx loads
    ↓
Display: Title, Metadata (icon, source, date, authors)
    ↓
Call: generateArticleContentStreaming()
    ↓
    Step 1: Fetch Tavily results (title as query)
    ↓
    Step 2: Build sources for Quick Links
    ↓
    Step 3: Call OpenAI with Tavily context
    ↓
    Step 4: Stream response to UI
    ↓
Display: Quick Links cards + AI article content
```

## Component Structure

### ArticleDetail.tsx

**Location**: `src/mainPages/ArticleDetail.tsx`

**Key Features**:
1. **Metadata Display**: Shows icon, source, date, authors (if available)
2. **Quick Links**: 4-card grid showing Tavily sources
3. **AI Content**: Streaming markdown article from OpenAI
4. **Explore Further**: Related articles grid

**State Management** (Simplified to prevent leaks):
```typescript
const [article] = useState<ArticleData | null>(location.state?.article || null);
const [streamingContent, setStreamingContent] = useState<string>('');
const [sources, setSources] = useState<ArticleSource[]>([]);
const [isGenerating, setIsGenerating] = useState(true);
const [error, setError] = useState<string | null>(null);
const [relatedArticles] = useState<ArticleData[]>(location.state?.relatedArticles || []);
```

**Critical Anti-Memory-Leak Pattern**:
```typescript
useEffect(() => {
  let isMounted = true; // Cleanup flag
  let content = ''; // Local accumulator (not state!)

  const loadContent = async () => {
    const returnedSources = await generateArticleContentStreaming(
      article.title,
      article.snippet,
      article.link,
      (chunk: string) => {
        if (!isMounted) return; // Stop if unmounted

        content += chunk; // Accumulate locally

        // Update UI every ~150 chars (throttled to reduce re-renders)
        if (content.length % 150 < chunk.length) {
          setStreamingContent(content);
        }
      },
      (sources: ArticleSource[]) => {
        // Callback: Sources found BEFORE streaming (fast-search pattern)
        if (!isMounted) return;
        setSources(sources); // Immediate UI update
      }
    );

    if (!isMounted) return;

    // Final update with complete content
    setStreamingContent(content);
  };

  loadContent();

  return () => {
    isMounted = false; // Cleanup
  };
}, [article?.title]);
```

**Why This Works**:
- ✅ **Callback pattern** - Sources set immediately via callback (copied from fast-search)
- ✅ Local `content` accumulator prevents state updates in tight loop
- ✅ Throttled UI updates (every 150 chars) reduce re-renders
- ✅ `isMounted` flag prevents setState after unmount
- ✅ Single dependency `[article?.title]` prevents unnecessary re-runs
- ✅ Cleanup function prevents memory leaks

**Comparison with fast-search**:
```typescript
// Fast-search pattern (controller.ts:246-252)
if (onSourcesFound && webResults.length > 0) {
  onSourcesFound(webResults.map(...)); // Immediate callback
}

// Our pattern (articleService.ts:57-60)
if (onSourcesFound && sources.length > 0) {
  onSourcesFound(sources); // Same pattern!
}
```

### articleService.ts

**Location**: `src/services/explore/articleService.ts`

**Function**: `generateArticleContentStreaming()`

**Process**:

#### Step 1: Fetch Tavily Context
```typescript
const { results } = await searchWithTavily(title);

const sources: ArticleSource[] = results.map(result => ({
  title: result.title,
  url: result.url,
  snippet: result.content,
  domain: extractDomain(result.url)
}));
```

#### Step 2: Build Context for OpenAI
```typescript
const context = results
  .slice(0, 5) // Use top 5 results
  .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
  .join('\n\n');
```

#### Step 3: Call OpenAI Edge Function
```typescript
const response = await fetch(supabaseEdgeUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`
  },
  body: JSON.stringify({
    prompt: JSON.stringify({
      input: [{ role: 'user', content: prompt }],
      model: 'gpt-4o-mini',
      max_output_tokens: 2000
    }),
    stream: true
  })
});
```

**Prompt Template**:
```
Write a comprehensive article about: "{title}"

Context from recent sources:
{tavily_context}

Write a well-structured article (500-800 words) with:
- Clear sections with ## headers
- Key facts and analysis
- Easy to read paragraphs
- No citations needed (already have sources)

Focus on explaining what happened and why it matters.
```

#### Step 4: Notify Sources via Callback (BEFORE streaming)
**Key Pattern from fast-search**:
```typescript
// Notify UI that sources are ready BEFORE streaming starts
if (onSourcesFound && sources.length > 0) {
  logger.info('[ARTICLE SERVICE] Calling onSourcesFound callback');
  onSourcesFound(sources);
}
```

**Why This Works**:
- ✅ Sources appear immediately (before streaming)
- ✅ No waiting for streaming to complete
- ✅ No complex state management
- ✅ Matches fast-search pattern (proven to work)
- ✅ Separates concerns: sources vs streaming content

#### Step 5: Stream Response
```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim() || !line.startsWith('data: ')) continue;

    const data = line.slice(6);
    if (data === '[DONE]') continue;

    try {
      const json = JSON.parse(data);
      const content = json.content || json.delta || json.text || '';
      if (content) {
        onChunk(content);
      }
    } catch (e) {
      // Skip parse errors
    }
  }
}
```

**Returns**: Array of `ArticleSource[]` for Quick Links (also sent via callback)

## UI Layout

```
┌─────────────────────────────────────────┐
│ ← Back to Discover          [Share]     │
├─────────────────────────────────────────┤
│                                          │
│ Article Title (Large)                    │
│                                          │
│ [icon] SOURCE • DATE • Authors          │
│                                          │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │
│ │Src1│ │Src2│ │Src3│ │Src4│ Quick Links│
│ └────┘ └────┘ └────┘ └────┘            │
│                                          │
│ [Main Article Image]                     │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ AI-Generated Article Content       │  │
│ │ - Streaming markdown               │  │
│ │ - Multiple sections                │  │
│ │ - Headers, paragraphs, lists       │  │
│ └────────────────────────────────────┘  │
│                                          │
│ Explore Further                          │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │
│ │Art1│ │Art2│ │Art3│ │Art4│            │
│ └────┘ └────┘ └────┘ └────┘            │
└─────────────────────────────────────────┘
```

## Data Flow

### Input (from Explore page)
```typescript
interface ArticleData {
  title: string;
  snippet: string;
  link: string;
  source: string;
  date: string;
  thumbnail?: string;
  icon?: string;      // Favicon from News API
  authors?: string[]; // Authors from News API
}
```

**Passed via**: `navigate()` state
```typescript
navigate(`/explore/${encodeURIComponent(article.title)}`, {
  state: { article, relatedArticles }
});
```

### Output (Tavily Sources)
```typescript
interface ArticleSource {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}
```

## Environment Variables Required

```env
VITE_TAVILY_API_KEY=tvly-xxx     # For search context
VITE_OPENAI_API_URL=https://xxx  # Supabase edge function
VITE_SUPABASE_ANON_KEY=xxx       # For auth
```

## Testing

### URL Pattern
```
http://localhost:5173/explore/{encoded-article-title}
```

### Example
```
http://localhost:5173/explore/Why%20Marvell%20Technology%20Stock%20Just%20Popped
```

### Expected Behavior
1. ✅ Page loads immediately with title and metadata
2. ✅ Quick Links cards appear (4 Tavily results)
3. ✅ Spinner shows while generating content
4. ✅ AI content streams in smoothly
5. ✅ Complete article appears with markdown formatting
6. ✅ Related articles show at bottom

### Console Output
```
=== ARTICLE GENERATION START ===
Title: Why Marvell Technology Stock Just Popped
[ARTICLE SERVICE] Step 1: Fetching Tavily context
[ARTICLE SERVICE] Step 2: Tavily complete (10 results)
[ARTICLE SERVICE] Step 3: Calling OpenAI with context
[ARTICLE SERVICE] Step 4: Streaming complete
=== GENERATION COMPLETE ===
```

## Known Issues - RESOLVED ✅

### ❌ Previous Issues (Fixed):
1. **Memory leaks from state updates in loop** → Fixed with local accumulator
2. **Too many re-renders** → Fixed with throttled updates (150 char batches)
3. **setState after unmount** → Fixed with `isMounted` cleanup flag
4. **Complex state management** → Simplified to single useEffect

### ✅ Current Status:
- No memory leaks
- Smooth streaming
- Clean component unmounting
- Proper error handling

## Troubleshooting

### Issue: Streaming breaks or stops
**Check**:
1. Edge function is deployed and accessible
2. OpenAI API key is valid
3. Network tab shows streaming response (not timeout)

**Fix**:
- Check `VITE_OPENAI_API_URL` is correct
- Verify edge function logs in Supabase dashboard

### Issue: Quick Links don't appear
**Check**:
1. Tavily API returns results (check console for "SOURCES RECEIVED")
2. `setSources(sources)` is called after streaming completes
3. Console shows `Sources count: X` where X > 0
4. Network tab shows successful Tavily API call

**Debug**:
```javascript
// In console, check:
console.log('=== SOURCES RECEIVED ===', sources);
console.log('Sources count:', sources.length);
```

**Common Causes**:
- Tavily API key invalid or rate limited
- Network blocking Tavily API call
- `generateArticleContentStreaming()` throwing error before returning sources
- Sources array returned but component re-rendering clears state

**Fix**:
1. Verify `VITE_TAVILY_API_KEY` is valid
2. Check network tab for Tavily response (200 status)
3. Check console for any errors in articleService
4. Verify `setSources(sources)` is called (add console.log before it)
5. Check React DevTools to see if `sources` state is populated

### Issue: Memory leak warnings
**Check**:
1. `isMounted` cleanup function exists
2. No state updates in tight loop
3. useEffect return function is called

**Fix**:
- Ensure cleanup pattern is intact:
```typescript
return () => {
  isMounted = false;
};
```

### Issue: Content doesn't stream (appears all at once)
**Check**:
1. Throttling logic is working (150 char batches)
2. Edge function returns `stream: true`

**Fix**:
- Adjust throttling threshold if needed
- Check edge function configuration

## Future Enhancements

### Potential Improvements:
1. ⏳ Add typewriter cursor animation during streaming
2. ⏳ Show progress indicator (% complete)
3. ⏳ Add "Read Original" button linking to source
4. ⏳ Cache generated articles to avoid re-generation
5. ⏳ Add sharing with pre-rendered image
6. ⏳ Show estimated read time
7. ⏳ Add bookmarking feature

### API Optimizations:
1. ⏳ Use GPT-4o for better quality (currently 4o-mini)
2. ⏳ Experiment with different prompt templates
3. ⏳ Add image generation for articles without thumbnails
4. ⏳ Include related videos from Tavily

## Code References

**Main files**:
- [ArticleDetail.tsx](../../src/mainPages/ArticleDetail.tsx) - Main component
- [articleService.ts](../../src/services/explore/articleService.ts) - Service layer
- [tavilyService.ts](../../src/commonService/searchTools/tavilyService.ts) - Tavily integration

**Related**:
- [CustomMarkdown.tsx](../../src/components/CustomMarkdown.tsx) - Markdown renderer
- [Explore.tsx](../../src/mainPages/Explore.tsx) - Parent page

## Deployment Notes

**Frontend** (Netlify):
- No special deployment needed
- Uses environment variables from Netlify dashboard

**Backend** (Supabase Edge Function):
- Deploy manually: See [DEPLOYMENT_INSTRUCTIONS.md](../deployment/DEPLOYMENT_INSTRUCTIONS.md)
- Function name: `openai-stream` or similar
- Must support streaming responses

## Related Documentation

- [Explore Page Architecture](./Explore.md)
- [Tavily Integration Guide](../../guides/TAVILY_GUIDE.md)
- [OpenAI Edge Function Setup](../../deployment/DEPLOY_EDGE_FUNCTION_MANUAL.md)
