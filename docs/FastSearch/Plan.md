# Fast Search v2 - Implementation Plan

## Overview
Replace the current multi-agent Search system with a streamlined single-LLM pipeline that delivers faster responses while maintaining quality and UX familiarity. Implementation will use the existing mode selector dropdown (Search, Stories, Cinematic, Avatar) by adding **"FastSearch"** as a new mode option.

## Phase 1: Infrastructure & Setup (Days 1-2)

### 1.1 Create Module Structure
```
src/services/fast-search/
├── controller.ts              # Main orchestrator
├── providers/
│   ├── webSearch.ts          # OpenAI web tool + Tavily fallback
│   ├── mediaSearch.ts        # SerpAPI for images/videos
│   └── llmProvider.ts        # openai-mini generation
├── prompts/
│   ├── systemPrompt.ts       # Core generation instructions
│   └── contextBuilder.ts     # Build search context object
├── formatters/
│   ├── responseFormatter.ts  # Format LLM output to UI structure
│   └── sourceFormatter.ts    # Process and cite sources
├── ui/
│   ├── FastSearchResults.tsx # New results page
│   └── components/
│       ├── ImageCarousel.tsx # Horizontal scrolling images
│       └── SourceCarousel.tsx # Horizontal scrolling sources
├── types.ts                   # TypeScript interfaces
└── index.ts                   # Public exports
```

### 1.2 Mode Selector Integration
**Add "FastSearch" to mode dropdown**
```typescript
// Update src/components/boxContainerInput/ModeSelector.tsx
const modes: Mode[] = [
  { id: 'stories', label: 'stories', icon: BookOpen },
  { id: 'cinematic', label: 'cinematic', icon: Clapperboard },
  { id: 'avatar', label: 'avatar', icon: UserCircle },
  { id: 'fastsearch', label: 'fastSearch', icon: Zap } // NEW MODE
];

// Note: 'search' remains default (current behavior)
```

**Update ModeType definition**
```typescript
// src/components/boxContainerInput/ModeSelector.tsx
export type ModeType = 'search' | 'stories' | 'cinematic' | 'avatar' | 'fastsearch';
```

**Add FastSearch translation keys**
```typescript
// All locale files (en.json, es.json, etc.)
{
  "fastSearch": "Fast Search",
  "placeholderFastSearch": "Ask anything - get faster results"
}
```

## Phase 2: Routing & Navigation (Days 2-3)

### 2.1 Add Route for FastSearch
```typescript
// Update routing configuration
// src/App.tsx or router config

<Route path="/fast-search" element={<FastSearchResults />} />
```

### 2.2 Update Query Box Mode Mapping
```typescript
// src/components/boxContainer/QueryBoxContainer.tsx
const getModeRoute = (mode: ModeType): string => {
  switch (mode) {
    case 'search':
      return '/search';
    case 'stories':
      return '/insights-results';
    case 'cinematic':
      return '/cinematic-results';
    case 'avatar':
      return '/avatar-search';
    case 'fastsearch':           // NEW
      return '/fast-search';      // NEW
    default:
      return '/search';
  }
};
```

### 2.3 Update Dynamic Subtitle
```typescript
// src/mainPages/Home.tsx
const getModeSubtitle = (mode: ModeType): string => {
  switch (mode) {
    case 'search':
      return 'Always grounded in trusted sources.';
    case 'stories':
      return 'Based on verified knowledge sources.';
    case 'cinematic':
      return 'Visual explanations grounded in facts.';
    case 'avatar':
      return 'Guided learning from trusted knowledge.';
    case 'fastsearch':                                    // NEW
      return 'Lightning-fast answers with citations.';    // NEW
    default:
      return 'Always grounded in trusted sources.';
  }
};
```

## Phase 3: Core Backend Implementation (Days 4-6)

### 3.1 Web Search Provider (`providers/webSearch.ts`)
```typescript
export async function searchWeb(query: string): Promise<WebResult[]> {
  // Primary: Try OpenAI web search tool
  try {
    return await openAIWebSearch(query);
  } catch (error) {
    console.log('OpenAI web search failed, falling back to Tavily');
    // Fallback: Use Tavily
    return await tavilySearch(query);
  }
}

interface WebResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
  source: string;
}

// Return top 10 results
// Timeout: 3 seconds
```

### 3.2 Media Search Provider (`providers/mediaSearch.ts`)
```typescript
export async function searchImages(query: string): Promise<ImageResult[]> {
  try {
    const results = await serpAPIImageSearch(query);
    return deduplicateAndSort(results).slice(0, 15);
  } catch (error) {
    console.error('Image search failed:', error);
    return []; // Fail gracefully
  }
}

export async function searchVideos(query: string): Promise<VideoResult[]> {
  try {
    const results = await serpAPIVideoSearch(query);
    return results.slice(0, 8);
  } catch (error) {
    console.error('Video search failed:', error);
    return []; // Fail gracefully
  }
}

// Timeout: 2 seconds
// Sort by: resolution, relevance, diversity
```

### 3.3 Context Builder (`prompts/contextBuilder.ts`)
```typescript
export interface SearchContext {
  query: string;
  web_results: WebResult[];  // max 10
  images: ImageResult[];     // max 15
  videos: VideoResult[];     // max 8
  date: string;
  locale: string;
}

export function buildSearchContext(
  query: string,
  webResults: WebResult[],
  images: ImageResult[],
  videos: VideoResult[],
  locale: string = 'en'
): SearchContext {
  return {
    query,
    web_results: webResults.slice(0, 10),
    images,
    videos,
    date: new Date().toISOString(),
    locale
  };
}
```

### 3.4 LLM Provider (`providers/llmProvider.ts`)
```typescript
export async function generateResponse(
  context: SearchContext,
  streaming: boolean = true
): Promise<LLMResponse> {
  const prompt = buildPrompt(context);

  const response = await callOpenAIMini({
    model: 'openai-mini',
    prompt,
    streaming,
    temperature: 0.3,
    max_tokens: 2000
  });

  return parseStructuredResponse(response);
}

interface LLMResponse {
  overview: string;           // Main answer paragraph
  key_details: KeyDetail[];   // Structured facts
  source_citations: number[]; // [1], [2], [3]...
  follow_ups: string[];       // 3-5 questions
}
```

### 3.5 System Prompt (`prompts/systemPrompt.ts`)
```typescript
export const FAST_SEARCH_SYSTEM_PROMPT = `
You are a search assistant that provides accurate, grounded answers.

INSTRUCTIONS:
1. Answer the user's question directly and concisely
2. Cite sources inline using [1], [2], [3] format
3. Use ONLY information from the provided web results
4. Structure your answer as:
   - AI Overview (2-3 paragraphs)
   - Key Details (3-5 bullet points)
   - Source citations (match to provided results)
5. Generate 3-5 relevant follow-up questions
6. Mention uncertainty if information is incomplete
7. DO NOT hallucinate or use information not in sources

RESPONSE FORMAT:
{
  "overview": "Direct answer with citations [1][2]...",
  "key_details": [
    "Fact 1 [3]",
    "Fact 2 [4]"
  ],
  "source_citations": [1, 2, 3, 4],
  "follow_ups": [
    "What about X?",
    "How does Y work?"
  ]
}
`;
```

## Phase 4: Response Formatting (Days 7-8)

### 4.1 Response Formatter (`formatters/responseFormatter.ts`)
```typescript
export function formatForUI(
  llmResponse: LLMResponse,
  context: SearchContext
): UIResponse {
  return {
    question: context.query,
    tabs: [
      { id: 'answer', label: 'Answer', active: true },
      { id: 'images', label: 'Images', count: context.images.length },
      { id: 'videos', label: 'Videos', count: context.videos.length },
      { id: 'sources', label: 'Sources', count: context.web_results.length }
    ],
    media: {
      images: formatImageCarousel(context.images),
      videos: formatVideoGrid(context.videos)
    },
    overview: llmResponse.overview,
    key_details: llmResponse.key_details,
    sources: formatSourceCarousel(
      context.web_results,
      llmResponse.source_citations
    ),
    follow_ups: llmResponse.follow_ups
  };
}
```

### 4.2 Source Formatter (`formatters/sourceFormatter.ts`)
```typescript
export function formatSourceCarousel(
  webResults: WebResult[],
  citations: number[]
): SourceCard[] {
  // Map citation numbers to actual sources
  // Extract domain, favicon, title
  // Sort by citation frequency
  // Return top 10

  return citations.map((citationNum, index) => {
    const source = webResults[citationNum - 1]; // 1-indexed
    return {
      id: index,
      number: citationNum,
      title: source.title,
      domain: extractDomain(source.url),
      url: source.url,
      favicon: `https://www.google.com/s2/favicons?domain=${source.url}`
    };
  }).slice(0, 10);
}
```

## Phase 5: Frontend UI Components (Days 9-11)

### 5.1 FastSearchResults Page (`ui/FastSearchResults.tsx`)
```typescript
export default function FastSearchResults() {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('q');

  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: true,
    error: null,
    data: null
  });

  useEffect(() => {
    performFastSearch(query).then(setSearchState);
  }, [query]);

  return (
    <div className="search-results">
      <TopBar query={query} />
      <TabSystem tabs={searchState.data?.tabs} />

      {/* Image Carousel */}
      <ImageCarousel images={searchState.data?.media.images} />

      {/* AI Overview */}
      <AIOverview content={searchState.data?.overview} />

      {/* Key Details */}
      <KeyDetailsList details={searchState.data?.key_details} />

      {/* Source Carousel */}
      <SourceCarousel sources={searchState.data?.sources} />

      {/* Follow-ups */}
      <FollowUpQuestions questions={searchState.data?.follow_ups} />
    </div>
  );
}
```

### 5.2 Image Carousel (`ui/components/ImageCarousel.tsx`)
```typescript
export function ImageCarousel({ images }: { images: ImageResult[] }) {
  return (
    <div className="horizontal-scroll-container">
      <div className="carousel">
        {images.map((image, index) => (
          <div key={index} className="carousel-item">
            <img
              src={image.url}
              alt={image.title}
              loading="lazy"
              onClick={() => window.open(image.source_url)}
              onError={handleImageError}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Features:
// - Horizontal scrolling
// - Smooth snapping
// - Lazy loading
// - Click opens source
// - Supports landscape/portrait/square
// - Mobile responsive
```

### 5.3 Source Carousel (`ui/components/SourceCarousel.tsx`)
```typescript
export function SourceCarousel({ sources }: { sources: SourceCard[] }) {
  return (
    <div className="horizontal-scroll-container">
      <div className="source-carousel">
        {sources.map((source) => (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            className="source-card"
            onClick={() => trackSourceClick(source)}
          >
            <div className="citation-number">[{source.number}]</div>
            <img src={source.favicon} alt="" />
            <div className="source-info">
              <div className="domain">{source.domain}</div>
              <div className="title">{source.title}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// Features:
// - Horizontal scrolling cards
// - Max 10 sources
// - Citation numbers visible
// - Click tracking
// - Mobile responsive
```

## Phase 6: Controller & Orchestration (Days 12-13)

### 6.1 Main Controller (`controller.ts`)
```typescript
export async function performFastSearch(
  query: string,
  locale: string = 'en'
): Promise<SearchState> {
  try {
    // Step 1: Execute all searches in parallel
    const [webResults, images, videos] = await Promise.all([
      webSearchProvider.searchWeb(query),
      mediaSearchProvider.searchImages(query),
      mediaSearchProvider.searchVideos(query)
    ]);

    // Step 2: Build context
    const context = contextBuilder.buildSearchContext(
      query,
      webResults,
      images,
      videos,
      locale
    );

    // Step 3: Generate response (single LLM call)
    const llmResponse = await llmProvider.generateResponse(context);

    // Step 4: Format for UI
    const uiResponse = responseFormatter.formatForUI(llmResponse, context);

    // Step 5: Return
    return {
      isLoading: false,
      error: null,
      data: uiResponse
    };

  } catch (error) {
    return {
      isLoading: false,
      error: error.message,
      data: null
    };
  }
}

// Target: < 4 seconds total
```

### 6.2 Streaming Support
```typescript
export async function performFastSearchStreaming(
  query: string,
  onChunk: (chunk: string) => void,
  locale: string = 'en'
): Promise<SearchState> {
  // Same flow but with streaming
  // Call onChunk() as LLM tokens arrive
  // Update UI in real-time

  const context = await prepareContext(query, locale);

  await llmProvider.generateResponseStreaming(context, (token) => {
    onChunk(token);
  });

  return finalizeResponse(context);
}
```

## Phase 7: Analytics & Metrics (Days 14-15)

### 7.1 Track Events
```typescript
// Analytics events to capture
analytics.track('fast_search_initiated', {
  query,
  mode: 'fastsearch',
  timestamp: Date.now()
});

analytics.track('fast_search_completed', {
  query,
  duration_ms,
  source_count,
  has_images: boolean,
  has_videos: boolean
});

analytics.track('source_clicked', {
  source_url,
  position,
  citation_number,
  query
});

analytics.track('follow_up_clicked', {
  original_query,
  follow_up_question
});

analytics.track('image_clicked', {
  image_url,
  position,
  query
});
```

### 7.2 Performance Metrics
```typescript
// Measure and log:
- Total response time (P50, P90, P99)
- Web search latency
- Media search latency
- LLM generation time
- Time to first token (streaming)
- Click-through rates
- Zero-result rate
- Error rate
```

## Phase 8: Testing (Days 16-17)

### 8.1 Unit Tests
```typescript
// Test each component
✅ webSearch provider
✅ mediaSearch provider
✅ contextBuilder
✅ llmProvider
✅ responseFormatter
✅ sourceFormatter
✅ Error handling
✅ Fallback logic
```

### 8.2 Integration Tests
```typescript
// End-to-end flows
✅ Happy path: query → results
✅ Streaming mode
✅ OpenAI tool failure → Tavily fallback
✅ SerpAPI failure → empty media
✅ Partial results handling
✅ Performance benchmarks
```

### 8.3 Manual QA
```typescript
✅ Test on desktop, mobile, tablet
✅ Various query types
✅ UI matches design
✅ Citations accurate
✅ Follow-ups relevant
✅ Carousels scroll smoothly
✅ Images lazy load
✅ Sources clickable
```

## Phase 9: User Testing & Rollout (Days 18-22)

### 9.1 Internal Testing (Days 18-19)
- Team uses FastSearch mode for 2 days
- Collect feedback
- Fix critical bugs
- Iterate on prompt quality

### 9.2 Beta Launch (Days 20-21)
- Make FastSearch visible to all users (via mode selector)
- Keep "Search" as default
- Monitor usage and metrics
- Collect user feedback

### 9.3 Performance Monitoring (Day 22)
- Verify speed targets met (P50 < 4s, P90 < 7s)
- Monitor error rates
- Check CTR vs old Search
- Adjust if needed

## Phase 10: Iteration & Future Migration (Days 23-28)

### 10.1 Optimization (Days 23-25)
```typescript
Improvements:
- Add result caching (5-10 min TTL)
- Optimize prompt for better citations
- Improve follow-up question quality
- Fine-tune image relevance sorting
- Add loading states polish
```

### 10.2 Future: Make FastSearch Default (Optional)
```
When FastSearch proves superior:
1. Switch default mode from 'search' to 'fastsearch'
2. Rename 'search' to 'legacysearch' or remove
3. Eventually deprecate old multi-agent Search
4. Clean up unused code

This is NOT part of initial implementation.
Keep both modes available initially.
```

## Key Success Metrics

### Performance
✅ P50 latency < 4 seconds
✅ P90 latency < 7 seconds
✅ Time to first token < 1 second (streaming)

### Quality
✅ 95%+ queries return results
✅ Source citations accurate
✅ Follow-ups contextually relevant
✅ No hallucinations

### UX
✅ Familiar UI (matches current Search)
✅ Mobile responsive
✅ Smooth carousels
✅ Fast perceived load time

### Adoption
✅ Users discover FastSearch mode
✅ Positive feedback
✅ CTR maintained or improved

## Implementation Notes

### No Feature Flags or Env Variables
- FastSearch is always available as a mode option
- User explicitly selects it from dropdown
- No backend feature flags needed
- No .env configuration required

### Mode Selector is the Switch
```typescript
// User flow:
1. User clicks "+" button or mode chip
2. Sees: Search (default), Stories, Cinematic, Avatar, FastSearch
3. Selects FastSearch
4. Query goes to /fast-search route
5. FastSearch system handles the request
```

### Keep Both Systems Running
- Old Search (default): `/search`
- New FastSearch (opt-in): `/fast-search`
- Users can choose which to use
- Compare metrics side-by-side
- Eventually migrate based on data

## Risk Mitigation

### High Risk Areas
1. **LLM quality** → Extensive prompt engineering + testing
2. **Citation accuracy** → Validation logic + human review
3. **Performance** → Load testing before launch
4. **User confusion** → Clear labeling, tooltips

### Contingency Plans
- Both modes always available
- Users can switch modes anytime
- Monitor metrics closely
- Quick iteration on issues

## Estimated Timeline: 4-5 weeks

**Week 1**: Infrastructure + Backend (Phases 1-3)
**Week 2**: Formatting + UI Components (Phases 4-5)
**Week 3**: Integration + Testing (Phases 6-8)
**Week 4-5**: User Testing + Iteration (Phases 9-10)

## Success Criteria for Launch

✅ Mode selector includes FastSearch option
✅ Route /fast-search working
✅ All unit tests passing
✅ Integration tests passing
✅ Manual QA complete
✅ Performance targets met
✅ Monitoring in place
✅ Documentation complete

## Next Steps After Plan Approval

1. Create FastSearch mode option in dropdown
2. Set up module structure
3. Implement web search provider
4. Build remaining components systematically
5. Test thoroughly
6. Launch to users
