# FastSearch Animation & UI Refinements

**Date**: 2026-05-15
**Status**: Complete ✓

## Changes Implemented

### 1. ✅ Fixed Source Count in AI Overview Header

**File**: [FastSearchResults.tsx](../../../src/services/fast-search/pages/FastSearchResults.tsx#L215-250)

The source count with stacked favicons was implemented but not showing because it relied on `results.sources` which was only set after streaming completed. Fixed by using `foundSources` state that is populated as soon as sources are found.

**Before**:
```tsx
{results?.sources && results.sources.length > 0 && (
  // Source icons - only shows after streaming completes
)}
```

**After**:
```tsx
{foundSources.length > 0 && (
  <div className="flex items-center gap-2">
    {/* Stacked favicons - show first 3 overlapping */}
    <div className="flex items-center">
      {foundSources.slice(0, 3).map((source, index) => (
        <div className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border-2">
          <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} />
        </div>
      ))}
    </div>
    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
      +{foundSources.length}
    </span>
  </div>
)}
```

Now the source count appears immediately when streaming starts, not after it completes.

### 2. ✅ Removed "---" Horizontal Rules

**File**: [FastSearchResults.tsx](../../../src/services/fast-search/pages/FastSearchResults.tsx#L65-66)

Added filter to remove markdown horizontal rules that were appearing in the LLM response.

```tsx
// Step 3: Remove horizontal rules (---)
text = text.replace(/^---+$/gm, '');
```

### 3. ✅ Updated Animation to Show Real Source Names

**Files**:
- [controller.ts](../../../src/services/fast-search/controller.ts#L182) - Updated callback signature
- [FastSearchResults.tsx](../../../src/services/fast-search/pages/FastSearchResults.tsx#L675-755) - New animation component

**Changed From**: Generic typewriter animation with made-up status messages
```
[•] Finding reliable sources_
[•] Analyzing information_
[•] Verifying facts_
```

**Changed To**: Real source names cycling like regular search
```
Looking for trusted sources... · found wikipedia
Looking for trusted sources... · found nytimes
Looking for trusted sources... · found bbc
```

**Implementation**:

Updated controller callback to pass full sources array:
```typescript
export async function executeFastSearchStreaming(
  request: FastSearchRequest,
  onChunk: (chunk: string) => void,
  onSourcesFound?: (sources: Array<{ title: string; url: string; snippet: string }>) => void
): Promise<Omit<FastSearchResponse, 'answer'>> {
  // ...
  if (onSourcesFound && webResults.length > 0) {
    onSourcesFound(webResults.map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet
    })));
  }
}
```

New AnimatedSourcesCounter component:
```tsx
function AnimatedSourcesCounter({ sources }: { sources: Array<{ title: string; url: string; snippet: string }> }) {
  const [currentSourceName, setCurrentSourceName] = useState('');

  // Extract source names from URLs (e.g., "wikipedia", "nytimes")
  const sourceNames = useMemo(() => {
    return sources.map(source => {
      const hostname = new URL(source.url).hostname.replace(/^www\./, '');
      const parts = hostname.split('.');
      // Handle ccTLDs like .co.uk
      if (parts.length >= 3 && parts[parts.length - 1].length === 2) {
        return parts[parts.length - 3];
      }
      return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    });
  }, [sources]);

  useEffect(() => {
    const cycleSource = async () => {
      while (isMounted && sourceNames.length > 0) {
        setCurrentSourceName(sourceNames[currentIndex]);
        await sleep(1000); // Show source name
        setCurrentSourceName(''); // Erase
        await sleep(300); // Brief pause
        currentIndex = (currentIndex + 1) % sourceNames.length;
      }
    };
    cycleSource();
  }, [sourceNames]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-3 h-3 rounded-full animate-ping absolute" style={{ opacity: 0.4 }} />
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
      </div>
      <span className="text-base">
        Looking for trusted sources...
        {currentSourceName && (
          <span className="ml-2 text-gray-500">· found {currentSourceName}</span>
        )}
      </span>
    </div>
  );
}
```

**Animation Behavior**:
- Cycles through real source names extracted from URLs
- Shows each source for 1 second
- Brief 300ms pause between sources
- Loops continuously until streaming starts or images mount
- Automatically stops when component unmounts

### 4. ✅ State Management Updates

**File**: [FastSearchResults.tsx](../../../src/services/fast-search/pages/FastSearchResults.tsx#L28)

Changed from storing just a count to storing the full sources array:

```typescript
// Before
const [sourcesFoundCount, setSourcesFoundCount] = useState<number | null>(null);

// After
const [foundSources, setFoundSources] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
```

This enables:
1. Showing source count in AI Overview header immediately
2. Displaying real source names in the loading animation
3. Better state management flow

## Visual Flow Comparison

### Before
```
1. [•] Searching trusted sources...
2. [•] Finding reliable sources_ (generic text)
3. [Sparkles] AI Overview (no source count)
   Answer streaming...
4. (after complete) [Sparkles] AI Overview +10
```

### After
```
1. [•] Searching trusted sources...
2. [•] Looking for trusted sources... · found wikipedia
   [•] Looking for trusted sources... · found nytimes
   [•] Looking for trusted sources... · found bbc
   (cycles through real sources)
3. [Sparkles] AI Overview                        +10
   (source count shows immediately when streaming starts)
   Answer streaming...
```

## Benefits

1. **Consistency**: Matches regular search animation style
2. **Transparency**: Users see actual sources being found
3. **Immediate Feedback**: Source count appears as soon as streaming starts
4. **Cleaner Content**: Removed unwanted "---" separators
5. **Better UX**: More engaging and informative loading state

## Technical Details

- **Source Name Extraction**: Handles ccTLDs (.co.uk) and standard TLDs correctly
- **Animation Timing**: 1 second display + 300ms transition = smooth cycling
- **Cleanup**: Proper cleanup of intervals/timeouts to prevent memory leaks
- **Type Safety**: Full TypeScript typing for all callbacks and state
- **Performance**: useMemo for source name extraction to avoid recomputation

---

**Status**: All refinements complete and tested ✓
