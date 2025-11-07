# NY Times Style Guide Implementation

**Date**: 2025-01-XX  
**Status**: ✅ Completed  
**Impact**: Insights Writer Agent

## Overview

Refactored the InsightWriterAgent to follow NY Times journalistic style instead of strategic analyst style, providing more professional, factual, and engaging content while maintaining concise responses for free tier limitations.

## Changes Made

### 1. Updated Interface: `InsightWriterResult`

**Added:**
- `focus_category: string` - UPPERCASE category label (e.g., TECHNOLOGY, BUSINESS, HEALTH)

**Purpose:** Category badges displayed above headlines, matching NYT article style

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

The `TabSystem.tsx` component already displays the `focus_category` as a black badge with white text above the headline:

```tsx
<span className="bg-black text-white px-3 py-1 text-sm font-medium uppercase tracking-wider">
  {result.focus_category || 'ANALYSIS'}
</span>
```

**Example Display:**
```
━━━━━━━━━━━━━━━━━
 TECHNOLOGY 
━━━━━━━━━━━━━━━━━
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

## Testing Recommendations

1. Test with various query types to verify correct focus_category detection
2. Verify word counts stay within 500-800 range
3. Check that bold headers (`**Header**`) render correctly instead of markdown `##`
4. Confirm news-style lede appears in generated content
5. Validate no marketing language or emojis appear in output

## Technical Details

**Files Modified:**
- `/src/services/research/regular/agents/insightWriterAgent.ts`

**No Breaking Changes:**
- Existing JSON structure maintained
- All components handle new `focus_category` field gracefully
- Fallback to 'ANALYSIS' if category not provided

**TypeScript:**
- ✅ No compilation errors
- ✅ All types properly updated
- ✅ Interface changes backward-compatible

## Examples

### Query: "AI in healthcare"
**focus_category**: `HEALTH`  
**Headline**: "Artificial Intelligence Transforms Medical Diagnosis and Treatment"  
**Subtitle**: "New Technologies Promise Earlier Detection and More Personalized Care"

### Query: "electric vehicle market trends"
**focus_category**: `BUSINESS`  
**Headline**: "Electric Vehicle Sales Surge as Automakers Race to Meet Demand"  
**Subtitle**: "Industry Shift Accelerates Despite Supply Chain Challenges"

## Related Documentation

- See `/NY_STYLE_GUIDE.md` for complete style guide specifications
- See `/docs/architecture/PAYLOAD_SIZE_OPTIMIZATION.md` for payload reduction strategies
