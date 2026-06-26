# NY Times Style Guide Implementation

**Date**: 2025-11-08  
**Status**: ✅ Completed  
**Impact**: Insights Writer Agent, Focus Category Selector

## Overview

Refactored the InsightWriterAgent to follow NY Times journalistic style instead of strategic analyst style, providing more professional, factual, and engaging content while maintaining concise responses for free tier limitations.

## Changes Made

### 1. Updated Interface: `InsightWriterResult`

**Added:**
- `focus_category: string` - UPPERCASE category label (e.g., BUSINESS, HEALTH & WELLNESS, ANALYSIS, ARTS & ENTERTAIMENT, SCIENCES & TECH, HEALTH & SPORT)

**Purpose:** 
- Category badges displayed above headlines, matching NYT article style
- Interactive dropdown allows users to change focus and regenerate article
- GPT writes with selected focus perspective in mind

### 2. Refactored System Prompt

**Before:**
```
Expert strategic analyst. Generate CONCISE insights...
Style: Brief, actionable, no fluff
```

**After:**
```
You are an experienced journalist writing for The New York Times...
TONE: NYT journalism - clear, authoritative, accessible
```

**Key Changes:**
- Persona: Strategic analyst → NYT journalist
- Tone: Business/strategic → Objective, factual reporting
- Structure: Strategic sections → Journalistic flow (lede → context → findings → impact)
- Headers: Markdown `##` → Bold `**Headers**`
- Word count: 600-900 words → 500-800 words (shorter for free tier)

### 3. New Writing Structure

**Required Sections:**
1. **Background** - Set the scene, explain why this matters
2. **Key Findings** - Present facts and evidence
3. **Expert Perspectives** - Include quotes and analysis
4. **Industry Impact** - Broader implications
5. **Next Steps** - What to watch for

**Style Guidelines:**
- Strong news-style lede that hooks readers
- Plain but sophisticated language
- NO emojis, hashtags, or marketing language
- Objective, factual reporting - no personal opinions
- Flow: lead → context → findings → impact

### 4. Enhanced Helper Functions

**Added:**
- `determineFocusCategory(query)` - Automatically categorizes queries into:
  - TECHNOLOGY (tech, ai, software, digital, etc.)
  - HEALTH (medical, drug, disease, patient, etc.)
  - BUSINESS (market, economy, company, etc.)
  - CLIMATE (environment, energy, green, etc.)
  - SCIENCE (research, study, discovery)
  - POLITICS (government, policy, election)
  - EDUCATION (school, university, learning)
  - GENERAL (fallback)

**Updated:**
- `generateNYTimesReport()` - Generates NYT-style article structure
- `validateWriterResult()` - Ensures focus_category is present
- `getFallbackInsights()` - Provides NYT-style fallback content

### 5. Updated Prompts

**User Prompt:**
```
Before: "Generate strategic insights with actionable intelligence."
After: "Write a compelling NYT-style article that explains what's happening, 
       why it matters, and what comes next. Use facts and quotes from sources."
```

### 6. Follow-Up Questions

**Before:**
- "What are the emerging opportunities in the X space?"
- "How can organizations best position themselves?"

**After:**
- "What are the most significant changes happening in X?"
- "How are experts responding to these developments?"
- "What should people watch for in the coming months?"

## UI Integration

### Focus Category Selector (Interactive)

The focus category appears as an **interactive dropdown button** in `InsightsResults.tsx` (independent section above TabSystem):

```tsx
{/* Focus Category Selector - Independent Section */}
<div className="mb-6 relative" ref={dropdownRef}>
  <button
    onClick={() => setShowFocusDropdown(!showFocusDropdown)}
    className="bg-black text-white px-3 py-1 text-sm font-medium uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center gap-2"
  >
    {result.focus_category || 'ANALYSIS'}
    <ChevronDown className="w-4 h-4" />
  </button>
  
  {/* Dropdown Menu */}
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

### Available Focus Categories

Users can select from 5 focus perspectives:
1. **ANALYSIS** (default) - General analytical approach
2. **ARTS** - Cultural and artistic perspective
3. **BUSINESS** - Market and economic angle
4. **HEALTH & SPORT** - Medical and wellness focus
5. **SCIENCES & TECH** - Scientific and technology focus

### User Flow

1. Article displays with automatically detected focus (or ANALYSIS default)
2. User clicks the focus button to see dropdown
3. User selects a different focus (e.g., "BUSINESS")
4. Page reloads with `?focus=BUSINESS` parameter
5. GPT regenerates article with selected focus perspective
6. New focus badge displays the selected category

### Focus Parameter Integration

- **URL Format**: `/insights-results?q={query}&focus={category}`
- **Backend Flow**: InsightsResults → insightsService → insightSwarmController → insightWriterAgent
- **GPT Instruction**: When user selects specific focus, GPT receives:
  ```
  IMPORTANT: Write this article with a BUSINESS focus. 
  The focus_category MUST be "BUSINESS".
  ```

**Example Display:**
```
┌─────────────────┐
│   BUSINESS    ▼ │  ← Clickable dropdown button
└─────────────────┘
                    ┌──────────────────┐
                    │ ANALYSIS         │
                    │ ARTS             │
                    │ BUSINESS      ✓  │
                    │ HEALTH & SPORT   │
                    │ SCIENCES & TECH  │
                    └──────────────────┘

How AI Is Reshaping...
Subtitle goes here
━━━━━━━━━━━━━━━━━
```

## Benefits

1. **Professional Journalism Style**: Content reads like actual NYT articles
2. **Better Readability**: Clear, objective reporting vs. business jargon
3. **Improved Structure**: News-style lede engages readers immediately
4. **Category Context**: Focus categories help readers understand topic domain
5. **Optimized Length**: 500-800 words fits free tier limits better than 600-900
6. **Consistent Tone**: Objective, factual, accessible language throughout
7. **User Control**: Interactive focus selector lets users regenerate with different perspectives
8. **Flexible Angles**: Same query can be viewed through business, tech, health, arts, or analytical lens

## Testing Recommendations

1. Test with various query types to verify correct focus_category detection
2. Verify word counts stay within 500-800 range
3. Check that bold headers (`**Header**`) render correctly instead of markdown `##`
4. Confirm news-style lede appears in generated content
5. Validate no marketing language or emojis appear in output
6. **Test focus selector dropdown opens and closes correctly**
7. **Test changing focus regenerates article with new perspective**
8. **Verify URL parameter (`?focus=BUSINESS`) is preserved and passed through**
9. **Test all 5 focus categories produce appropriate content**
10. **Verify auto-detection defaults to ANALYSIS when uncertain**

## Technical Details

**Files Modified:**
- `/src/services/research/regular/agents/insightWriterAgent.ts` - Added focus parameter and instructions
- `/src/services/research/regular/agents/insightSwarmController.ts` - Updated InsightRequest interface
- `/src/services/research/regular/agents/insightsService.ts` - Added focusCategory parameter
- `/src/services/research/regular/pages/InsightsResults.tsx` - Added focus category selector UI
- `/src/components/TabSystem.tsx` - Simplified by removing focus logic (moved to parent)

**No Breaking Changes:**
- Existing JSON structure maintained
- All components handle new `focus_category` field gracefully
- Fallback to 'ANALYSIS' if category not provided
- Focus parameter is optional throughout the pipeline

**TypeScript:**
- ✅ No compilation errors
- ✅ All types properly updated
- ✅ Interface changes backward-compatible

**Architecture Improvements:**
- Focus selector is independent section (not nested in TabSystem)
- Clean separation: InsightsResults handles orchestration, TabSystem handles content display
- Simplified TabSystem by 40+ lines of code

## Examples

### Query: "AI in healthcare"
**focus_category**: `HEALTH` (auto-detected)  
**Headline**: "Artificial Intelligence Transforms Medical Diagnosis and Treatment"  
**Subtitle**: "New Technologies Promise Earlier Detection and More Personalized Care"

**User switches to SCIENCES & TECH focus:**
- URL becomes: `/insights-results?q=AI+in+healthcare&focus=SCIENCES+%26+TECH`
- Article regenerates with technical/scientific angle
- More emphasis on algorithms, research breakthroughs, technical capabilities

### Query: "electric vehicle market trends"
**focus_category**: `BUSINESS` (auto-detected)  
**Headline**: "Electric Vehicle Sales Surge as Automakers Race to Meet Demand"  
**Subtitle**: "Industry Shift Accelerates Despite Supply Chain Challenges"

**User switches to ANALYSIS focus:**
- URL becomes: `/insights-results?q=electric+vehicle+market+trends&focus=ANALYSIS`
- Article regenerates with balanced analytical perspective
- Considers multiple angles: market, technology, policy, consumer behavior

### Query: "new streaming series popularity"
**focus_category**: `ARTS` (auto-detected)
**Headline**: "New Streaming Series Captures Cultural Zeitgeist"
**Subtitle**: "Critics and Audiences Alike Embrace Bold Storytelling Approach"

**User switches to BUSINESS focus:**
- URL becomes: `/insights-results?q=new+streaming+series+popularity&focus=BUSINESS`
- Article regenerates with industry/market angle
- More emphasis on viewership numbers, competitive landscape, revenue impact

## Related Documentation

- See `/NY_STYLE_GUIDE.md` for complete style guide specifications
- See `/docs/architecture/PAYLOAD_SIZE_OPTIMIZATION.md` for payload reduction strategies
- See `/docs/features/FOCUS_CATEGORY_SELECTOR.md` for detailed implementation of interactive focus selector

## Implementation Timeline

**Phase 1 (Completed)**: NY Times journalistic style
- Refactored writer agent prompts
- Added focus_category field
- Implemented auto-detection logic
- Updated validation and fallback functions

**Phase 2 (Completed)**: Interactive focus selector
- Added dropdown UI in InsightsResults.tsx
- Simplified TabSystem.tsx architecture
- Integrated focus parameter through entire pipeline
- Added GPT instructions for focus-aware writing

**Phase 3 (Future)**: Enhanced focus features
- Focus presets and user preferences
- Focus descriptions on hover
- Improved auto-detection algorithms
- Multi-perspective analysis options
