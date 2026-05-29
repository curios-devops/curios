# Numbered Citations Implementation

## Summary
Replaced site-name citations ([youtube], [forbes]) with numbered citations (¹, ², ³, ⁴) while keeping the same tooltip card structure from fast-search.

**Status**: ✅ Complete
**Date**: 2026-05-26

## What Changed

### Before:
```
Stock rose 15% [youtube]. Analysts predict [forbes].
```

### After:
```
Stock rose 15% ¹. Analysts predict ².
```

## Implementation

### 1. Created NumberedCitation Component
**File**: `src/components/citations/NumberedCitation.tsx`

- **Exact copy** of MultipleCitations tooltip structure
- Shows **number** instead of site name in badge
- Small circular badge with number (superscript style)
- Same hover tooltip with:
  - Favicon + site name
  - Article title (clickable)
  - Snippet
  - Navigation arrows (for multiple sources)

### 2. Updated CustomMarkdown
**File**: `src/components/CustomMarkdown.tsx:135-157`

**Changes**:
- Import `NumberedCitation` instead of `MultipleCitations`
- Add `citationNumber` counter
- Increment counter for each citation
- Pass sequential number to component

```typescript
let citationNumber = 0; // Track citations

return parts.map((part, index) => {
  if (/^\[[^\]]+\]$/.test(part)) {
    const parsedCitation = parseCitation(citationText, citations);
    if (parsedCitation) {
      citationNumber++; // Sequential: 1, 2, 3, 4...
      return (
        <NumberedCitation
          citations={parsedCitation.citations}
          citationNumber={citationNumber}
        />
      );
    }
  }
});
```

### 3. Updated Prompt (Exact Copy from Fast-Search)
**File**: `src/services/explore/articleService.ts:89-101`

**Copied fast-search prompt format exactly**:

```typescript
const prompt = `Based on these search results, provide a comprehensive answer to: "${title}"

Search Results:
${context}

Requirements:
- Use inline citations with the website name like [youtube], [forbes], [techcrunch]
- If multiple sources from the same site, use [sitename +N] format like [youtube +2] for 3 youtube sources
- Provide a clear, well-structured response in markdown format with ## headers
- Make response comprehensive and informative (500-800 words)
- DO NOT include follow-up questions in the response text

Today's date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
```

**This is 100% identical to fast-search LLM prompt** (src/services/fast-search/providers/llmProvider.ts:171-184)

## How It Works

### Flow:
```
1. OpenAI generates: "Stock rose [youtube]. Growth predicted [forbes]."
   ↓
2. CustomMarkdown parses citations
   ↓
3. citationNumber counter: 1, 2, 3, 4...
   ↓
4. NumberedCitation renders: ¹, ², ³, ⁴
   ↓
5. User sees numbered badges instead of site names
```

### Example Output:

**OpenAI Response:**
```markdown
## Market Analysis

Marvell Technology stock jumped 15% [youtube] after
announcing strong quarterly earnings. The company
reported revenue growth of 20% year-over-year [forbes].

## Industry Impact

Analysts predict continued growth [techcrunch] in the
semiconductor sector through 2026 [bloomberg].
```

**Rendered on Page:**
```
Market Analysis

Marvell Technology stock jumped 15% ¹ after
announcing strong quarterly earnings. The company
reported revenue growth of 20% year-over-year ².

Industry Impact

Analysts predict continued growth ³ in the
semiconductor sector through 2026 ⁴.
```

**Hover on ¹:**
```
┌─────────────────────────────┐
│ 🎥 youtube                  │
│ "Marvell Tech Earnings..."  │
│ Watch the full analysis...  │
└─────────────────────────────┘
```

## Citation Badge Design

### Visual Style:
- **Small circular badge**: 20px × 20px
- **Background**: Accent color (var(--accent-primary))
- **Text**: White, bold, 10px font
- **Position**: Superscript (align-super)
- **Hover**: Slight opacity change (90%)

### Tooltip (Same as Fast-Search):
- **Width**: 384px (w-96)
- **Arrow**: Bottom pointer
- **Navigation**: Previous/Next buttons (for multiple sources)
- **Content**: Favicon, site name, title, snippet
- **Footer**: Source count (for multiple)

## Files Modified

| File | Purpose | Lines |
|------|---------|-------|
| `NumberedCitation.tsx` | New component - numbered badge with tooltip | NEW (169 lines) |
| `CustomMarkdown.tsx` | Use NumberedCitation + sequential numbering | 4, 140, 148-156 |
| `articleService.ts` | Exact copy of fast-search prompt format | 89-101 |

## Comparison with Fast-Search

### Fast-Search Citation:
```tsx
<MultipleCitations
  citations={parsedCitation.citations}
  primarySiteName="youtube"  // Shows site name
/>
```
**Renders**: `[youtube]` badge

### Article Detail Citation:
```tsx
<NumberedCitation
  citations={parsedCitation.citations}
  citationNumber={1}  // Shows number
/>
```
**Renders**: `¹` badge

### Tooltip Structure:
**100% Identical** - Both use same:
- Layout and styling
- Navigation controls
- Favicon + site name display
- Title and snippet format
- Multiple source handling

## Benefits

✅ **Cleaner Text Flow**: Numbers don't interrupt reading like [sitename] does
✅ **Academic Style**: Familiar citation format (like Wikipedia)
✅ **Sequential**: Easy to reference (1, 2, 3, 4...)
✅ **Same UX**: Tooltip cards work identically to fast-search
✅ **Multiple Sources**: Still supports [sitename +N] format

## Testing

### Test Cases:

1. **Single Citation**:
   - Text: `Stock rose [youtube]`
   - Display: `Stock rose ¹`
   - Hover ¹: Shows YouTube card

2. **Multiple Citations**:
   - Text: `Stock rose [youtube]. Analysts say [forbes].`
   - Display: `Stock rose ¹. Analysts say ².`
   - Hover ¹: YouTube card
   - Hover ²: Forbes card

3. **Multiple Sources (Same Site)**:
   - Text: `Data shows [youtube +2]`
   - Display: `Data shows ¹`
   - Hover ¹: Navigation 1/3, shows 3 YouTube sources

4. **Mixed Citations**:
   - Text: `Stock rose [youtube]. Growth [forbes]. More [youtube].`
   - Display: `Stock rose ¹. Growth ². More ³.`
   - Note: Each [youtube] gets unique number

## Troubleshooting

### Issue: Citations show as [youtube] not numbers
**Fix**: Check CustomMarkdown is importing NumberedCitation (not MultipleCitations)

### Issue: All citations show same number
**Fix**: Verify citationNumber counter is inside the map function

### Issue: Tooltip doesn't appear
**Fix**: Check z-index (should be z-50) and hover handlers

## Related Documentation

- [Fast-Search Citations](../../Search/architecture/FAST_SEARCH_REFACTOR_COMPLETE.md) - Source of tooltip pattern
- [MultipleCitations Component](../../src/components/citations/MultipleCitations.tsx) - Original component
- [Citation Parser](../../src/components/citations/citationParser.ts) - Citation matching logic
