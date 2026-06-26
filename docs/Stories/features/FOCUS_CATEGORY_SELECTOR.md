# Focus Category Selector Implementation

**Date**: 2025-11-08  
**Status**: ✅ Completed  
**Impact**: Insights Results Page, TabSystem, Writer Agent

## Overview

Implemented an interactive focus category selector that allows users to change the writing style/focus of insights articles. The selector appears as a dropdown button above the article content, enabling users to regenerate the same query with different editorial focuses (ANALYSIS, ARTS, BUSINESS, HEALTH & SPORT, SCIENCES & TECH).

## User Flow

1. User performs an insights search with a query
2. Article is generated with automatically detected focus category (or ANALYSIS as default)
3. Focus category appears as a clickable black button above the article
4. Clicking the button reveals a dropdown with 5 focus options
5. Selecting a different focus reloads the page and regenerates the article with the new focus
6. GPT is instructed to write with the selected focus in mind

## Changes Made

### 1. UI Components

**InsightsResults.tsx** - Added focus category selector as independent section:
```tsx
// Focus Category Selector - Independent Section
<div className="mb-6 relative" ref={dropdownRef}>
  <button onClick={() => setShowFocusDropdown(!showFocusDropdown)}>
    {result.focus_category || 'ANALYSIS'}
    <ChevronDown />
  </button>
  
  {/* Dropdown Menu with 5 options */}
  {showFocusDropdown && (
    <div className="dropdown-menu">
      {focusCategories.map((category) => (
        <button onClick={() => handleFocusChange(category.id)}>
          {category.label}
        </button>
      ))}
    </div>
  )}
</div>
```

**TabSystem.tsx** - Removed focus category selector (simplified):
- Removed all focus category UI logic
- Removed dropdown state management
- Removed focus change handlers
- Component now focuses solely on tab navigation and content display

### 2. Backend Integration

**InsightsResults.tsx**:
- Captures `focus` query parameter: `const focusCategory = searchParams.get('focus') || 'ANALYSIS'`
- Passes focus to service: `insightsService.performInsightAnalysis(query, handleProgress, focusCategory)`
- Reloads page with new focus when changed

**insightsService.ts**:
```typescript
async performInsightAnalysis(
  query: string,
  onProgress?: InsightProgressCallback,
  focusCategory?: string
): Promise<InsightResult>
```

**insightSwarmController.ts**:
- Updated `InsightRequest` interface with `focusCategory?: string`
- Passes focus to writer agent
- Includes focus in fallback responses

**insightWriterAgent.ts**:
- Updated `InsightWriterRequest` interface with `focusCategory?: string`
- Modified system prompt to include focus instruction:
  ```typescript
  const focusInstruction = focusCategory && focusCategory !== 'ANALYSIS' 
    ? `\n\nIMPORTANT: Write this article with a ${focusCategory} focus. The focus_category MUST be "${focusCategory}".`
    : '\n\nIMPORTANT: If unsure about the category, use "ANALYSIS" as the focus_category.';
  ```
- Enhanced validation and fallback functions to respect focus parameter

## Focus Categories

1. **ANALYSIS** (Default)
   - General analytical approach
   - Used when category is uncertain
   - Balanced, objective reporting

2. **ARTS**
   - Cultural and artistic perspective
   - Creative industry focus
   - Entertainment and media angle

3. **BUSINESS**
   - Market and economic perspective
   - Corporate and financial angle
   - Industry trends and competition

4. **HEALTH & SPORT**
   - Medical and wellness focus
   - Athletic and fitness perspective
   - Public health implications

5. **SCIENCES & TECH**
   - Scientific research focus
   - Technology innovation angle
   - Technical details and breakthroughs

## Technical Implementation

### URL Parameters
- Format: `/insights-results?q={query}&focus={category}`
- Example: `/insights-results?q=AI+healthcare&focus=SCIENCES+%26+TECH`
- Focus parameter is preserved and passed through entire pipeline

### GPT Instructions
When user selects a specific focus (not ANALYSIS), GPT receives:
```
IMPORTANT: Write this article with a BUSINESS focus. 
The focus_category MUST be "BUSINESS".
```

This ensures:
- Content angle matches selected focus
- Terminology appropriate to category
- Structure emphasizes relevant aspects
- Tone aligns with category expectations

### State Management
- Dropdown state: `showFocusDropdown` (boolean)
- Click-outside handler: Auto-closes dropdown
- Dropdown ref: `dropdownRef` for detecting outside clicks
- Current focus: Retrieved from URL parameter

### Visual Design
- **Button**: Black background, white text, uppercase, tracking-wider
- **Hover**: Darker gray background
- **Dropdown**: White/dark mode aware, border, shadow
- **Active Item**: Gray background highlight
- **Position**: Absolute positioning below button

## Architecture Benefits

### Separation of Concerns
✅ **Before**: Focus logic mixed inside TabSystem (tab navigation component)  
✅ **After**: Focus logic in InsightsResults (page-level orchestration)

### Component Simplification
- **TabSystem.tsx**: 40+ lines removed
- Focused purely on tabs and content display
- No focus category state or handlers
- Cleaner, more maintainable code

### Data Flow Clarity
```
User Action (Select Focus)
  ↓
InsightsResults (Handle URL change)
  ↓
insightsService (Pass focus parameter)
  ↓
insightSwarmController (Route to writer)
  ↓
insightWriterAgent (Apply focus instruction)
  ↓
GPT (Generate with focus)
  ↓
Result (Display with focus badge)
```

## User Experience

### Interaction
1. **Visual Indicator**: Black badge clearly shows current focus
2. **Discoverable**: Button appearance suggests interactivity
3. **Responsive**: Dropdown opens instantly on click
4. **Feedback**: Selected item highlighted in dropdown
5. **Efficient**: Page reload regenerates content immediately

### Accessibility
- Semantic button elements
- Keyboard navigable
- Focus states visible
- Dark mode support
- ARIA-friendly structure

## Testing Checklist

- [ ] Dropdown opens on button click
- [ ] Dropdown closes on outside click
- [ ] Dropdown closes on category selection
- [ ] Page reloads with correct focus parameter
- [ ] GPT generates content with selected focus
- [ ] Focus badge displays correct category
- [ ] Dark mode styling works correctly
- [ ] Mobile responsive behavior
- [ ] URL parameters preserved correctly
- [ ] Default ANALYSIS focus when not specified

## Files Modified

1. `/src/services/research/regular/pages/InsightsResults.tsx`
   - Added focus category selector UI
   - Added dropdown state management
   - Added focus change handler
   - Added click-outside handler

2. `/src/components/TabSystem.tsx`
   - Removed focus category selector
   - Removed dropdown logic
   - Simplified component structure
   - Removed unused imports (ChevronDown, useEffect, useRef)

3. `/src/services/research/regular/agents/insightsService.ts`
   - Added focusCategory parameter
   - Passes focus to swarm controller

4. `/src/services/research/regular/agents/insightSwarmController.ts`
   - Updated InsightRequest interface
   - Passes focus to writer agent
   - Includes focus in fallback responses

5. `/src/services/research/regular/agents/insightWriterAgent.ts`
   - Updated InsightWriterRequest interface
   - Added focus instruction to system prompt
   - Enhanced validation functions
   - Updated fallback functions

## Related Documentation

- See `/docs/features/NY_TIMES_STYLE_IMPLEMENTATION.md` for writer agent style guide
- See `/NY_STYLE_GUIDE.md` for complete style specifications
- See `/docs/architecture/PAYLOAD_SIZE_OPTIMIZATION.md` for performance optimizations

## Future Enhancements

1. **Focus Presets**: Save user's preferred focus category
2. **Focus Hints**: Show brief description for each category on hover
3. **Smart Defaults**: Better auto-detection of focus from query
4. **Focus Mixing**: Combine multiple perspectives in one article
5. **Custom Focus**: Allow users to define custom editorial angles
