# Citation Site Name Display Fix

## Issue
Citations were showing generic "source" badge instead of actual site names (youtube, forbes, etc.)

## Root Cause
The OpenAI prompt instructed it to use `[source]` for all citations, but our citation matching expected actual site names like `[youtube]`, `[forbes]`.

## Solution
Update the prompt to:
1. Extract site names from Tavily results
2. List them in the prompt
3. Instruct OpenAI to use **actual site names** in citations

## Implementation

**File**: `src/services/explore/articleService.ts:78-105`

### Before (Generic):
```typescript
const prompt = `...
- **IMPORTANT**: Add inline citations using [source] format
  Example: "The stock rose 15% [source]."
...`;
```

### After (Specific Site Names):
```typescript
// Extract site names from sources
const siteNames = results.slice(0, 5).map(r => {
  const hostname = new URL(r.url).hostname.replace(/^www\./, '');
  const parts = hostname.split('.');
  return parts[0] || 'source'; // youtube, forbes, techcrunch, etc.
});

const prompt = `...
Available sources for citations: ${siteNames.join(', ')}

- **IMPORTANT**: Add inline citations using [sitename] format
  Example: "The stock rose 15% [${siteNames[0]}]. Analysts predict [${siteNames[1]}]."
- Use the actual site names from the available sources list above
...`;
```

## How It Works Now

### Input (Tavily Results):
```
1. youtube.com/watch?v=...
2. forbes.com/article/...
3. techcrunch.com/2026/...
```

### Extracted Site Names:
```
siteNames = ["youtube", "forbes", "techcrunch"]
```

### Prompt Tells OpenAI:
```
Available sources for citations: youtube, forbes, techcrunch

Example: "The stock rose 15% [youtube]. Analysts predict [forbes]."
```

### OpenAI Generates:
```
Bridging real human movement with digital technology has become
a reality [youtube]. The technology uses advanced sensors [forbes]
to capture motion data. Industry experts predict growth [techcrunch].
```

### CustomMarkdown Renders:
```
Bridging real human movement with digital technology has become
a reality [youtube]. The technology uses advanced sensors [forbes]
to capture motion data. Industry experts predict growth [techcrunch].

[youtube] → Clickable badge, shows YouTube video title on hover
[forbes] → Clickable badge, shows Forbes article title on hover
[techcrunch] → Clickable badge, shows TechCrunch article on hover
```

## Benefits

✅ **Specific Citations**: Each fact linked to correct source
✅ **Better UX**: Users see where each fact comes from
✅ **Credibility**: Clear attribution to named sources
✅ **Accurate Matching**: Citations match actual sources

## Testing

### Before Fix:
```
Text: "Stock rose 15% [source]."
Display: [source] (generic, not matched to any source)
```

### After Fix:
```
Text: "Stock rose 15% [forbes]."
Display: [forbes] (matched to Forbes.com article)
Hover: Shows Forbes article title and snippet
```

## Related Files
- [articleService.ts](../../src/services/explore/articleService.ts:78-105) - Prompt generation
- [CustomMarkdown.tsx](../../src/components/CustomMarkdown.tsx) - Citation rendering
- [MultipleCitations.tsx](../../src/components/citations/MultipleCitations.tsx) - Citation badge component
