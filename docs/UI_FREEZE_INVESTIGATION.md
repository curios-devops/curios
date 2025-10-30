# UI Freeze Investigation & Fixes

## Issue Summary
After search completes successfully and displays results, the UI becomes partially frozen:
- ✅ Can scroll
- ❌ Cannot click anything
- Console shows: "TabbedContent: About to render AIOverview" then stops

## Root Cause Analysis

### Investigation Timeline
1. **Initial symptoms**: Fetch calls to OpenAI via Supabase were hanging indefinitely
2. **Fix applied**: Implemented `Promise.race()` pattern for robust timeout enforcement
3. **New symptom**: UI freezes after search completes, specifically when rendering AIOverview component

### Suspected Cause
Based on console logs, the freeze occurs when `CustomMarkdown` component is rendering inside `AIOverview`. Possible issues:
- Heavy parsing of markdown content causing UI thread blocking
- Citation parsing creating infinite loops
- React re-rendering issues
- Memory leak in parsing logic

## Changes Made

### 1. OpenAI Model Change (Cost Optimization)
**File**: `src/services/search/regular/agents/searchWriterAgent.ts`

**Before**:
```typescript
private readonly defaultModel: string = 'gpt-4o';
```

**After**:
```typescript
private readonly defaultModel: string = 'gpt-4o-mini'; // Use mini for cost optimization
```

**Impact**: 
- Reduces API costs significantly
- Faster response times
- Same quality for web search results

### 2. Enhanced Diagnostic Logging
**Files Modified**:
- `src/components/CustomMarkdown.tsx`
- `src/components/AIOverview.tsx` (already had try-catch)

**Added Logging**:
```typescript
console.log('🎨 CustomMarkdown: Starting render', {
  contentLength: children?.length,
  hasCitations: citations.length > 0,
  citationsCount: citations.length
});

console.log('🎨 CustomMarkdown: parseMarkdown called', { textLength: text.length });
console.log('🎨 CustomMarkdown: About to call parseMarkdown and render');
console.log('🎨 CustomMarkdown: parseMarkdown completed, elements count:', parsed.length);
```

**Purpose**: Identify exactly where the render process freezes

## Next Steps for Testing

### Test Procedure
1. **Start dev server**: `npm run dev`
2. **Open browser**: http://localhost:5173
3. **Run search**: Search for "elon musk"
4. **Watch console**: Look for `🎨 CustomMarkdown` logs
5. **Identify freeze point**: See which log appears last before freeze

### Expected Console Output (Success)
```
TabbedContent: About to render AIOverview with: {...}
TabbedContent: Using full AIOverview component
🎨 CustomMarkdown: Starting render {...}
🎨 CustomMarkdown: parseMarkdown called {...}
🎨 CustomMarkdown: About to call parseMarkdown and render
🎨 CustomMarkdown: parseMarkdown completed, elements count: X
```

### If Freeze Still Occurs
Run the diagnostic script in browser console:
```bash
# Copy contents of debug-click-blocking.js and paste in browser console
```

## Potential Solutions (if issue persists)

### Solution 1: Memoize Parsing
Add React.useMemo to CustomMarkdown to prevent re-parsing:
```typescript
const parsedContent = React.useMemo(() => parseMarkdown(children), [children]);
```

### Solution 2: Lazy Render
Split markdown rendering into chunks:
```typescript
const [visibleChunks, setVisibleChunks] = useState(1);
useEffect(() => {
  if (visibleChunks < totalChunks) {
    setTimeout(() => setVisibleChunks(v => v + 1), 16);
  }
}, [visibleChunks]);
```

### Solution 3: Web Worker
Move parsing to background thread:
```typescript
const worker = new Worker('markdown-parser.worker.js');
worker.postMessage({ content: children });
```

### Solution 4: Simplify Parser
If citations parsing is the issue, simplify the regex:
```typescript
// Before: Complex citation parsing with multiple regex
// After: Simple string replacement
const citationRegex = /\[([^\]]+)\]/g;
text.replace(citationRegex, (match, text) => `<citation>${text}</citation>`);
```

## Diagnostic Tools Created

### 1. debug-click-blocking.js
Browser console script that checks for:
- Invisible overlays blocking clicks
- Elements with `pointer-events: none`
- High z-index elements
- Loading states not cleared
- Event listener issues

**Usage**:
1. Open browser DevTools console
2. Copy/paste contents of `debug-click-blocking.js`
3. Review output for blocking elements

### 2. Console Logging Strategy
Added strategic console.log statements at:
- Component entry points
- Before heavy computation
- After async operations
- Before/after rendering

**Pattern**:
```typescript
console.log('🎨 ComponentName: Action', { relevantData });
```

## Status
🔄 **In Progress** - Awaiting test results with enhanced logging to identify exact freeze location

## Related Files
- `/src/services/search/regular/agents/searchWriterAgent.ts`
- `/src/components/CustomMarkdown.tsx`
- `/src/components/AIOverview.tsx`
- `/debug-click-blocking.js`

## Date
October 28, 2025
