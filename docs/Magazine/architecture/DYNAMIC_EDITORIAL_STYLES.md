# Dynamic Editorial Styles Implementation

## Overview
Refactored the Insight Writer Agent to dynamically adapt writing style based on query topic, following the guidelines in `AGENT_WRITER_STYLE.md`.

## Changes Made

### 1. Added `style_source` Field
**File**: `insightWriterAgent.ts`
- Added `style_source: string` to `InsightWriterResult` interface
- Tracks which editorial publication style was used (NYT, WSJ, Wired, Vogue, Health)

### 2. Created Editorial Style Mapping
**Method**: `getEditorialStyle(focusCategory: string)`

Maps focus categories to editorial styles:

| Focus Category | Publication | Tone | Key Characteristics |
|---------------|-------------|------|---------------------|
| **BUSINESS** | Wall Street Journal | Data-driven, executive-focused | Lead with market impact, use metrics, quote executives |
| **SCIENCES & TECH** | Wired | Futuristic, accessible | Make tech exciting, use vivid analogies, human impact |
| **ARTS** | Vogue | Elegant, sensory | Rich details, emotional texture, celebrate creativity |
| **HEALTH & SPORT** | Health Magazine | Energetic, practical | Actionable advice, evidence-based, empowering |
| **ANALYSIS** (default) | New York Times | Objective, authoritative | Clear journalism, strong lede, balanced perspectives |

### 3. Dynamic System Prompt Generation
The agent now builds system prompts dynamically based on detected category:

```typescript
const systemPrompt = `You are an experienced journalist writing for ${editorialStyle.source}. 
Your mission is to produce ${editorialStyle.tone.toLowerCase()} reporting...

WRITING STYLE (${editorialStyle.source}):
${editorialStyle.style}

TONE: ${editorialStyle.tone}

STRUCTURE (use **Bold** for headers):
${editorialStyle.structure}`;
```

### 4. Enhanced Topic Detection
**Method**: `determineFocusCategory(query: string)`

Improved keyword matching:
- **SCIENCES & TECH**: tech, ai, software, digital, computer, cyber, science, research, study, discovery, innovation
- **HEALTH & SPORT**: health, medical, drug, disease, patient, doctor, sport, fitness, athletic, wellness
- **BUSINESS**: business, market, economy, company, corporate, finance, industry, trade
- **ARTS**: art, music, film, culture, entertainment, theater, gallery, museum, creative
- **ANALYSIS**: Default fallback for all other topics

### 5. Style-Specific Report Generation
**Method**: `generateStyledReport(query, results, focusCategory)`

Generates fallback reports with style-appropriate language:

**Business (WSJ)**:
- "Market dynamics in X are shifting..."
- Focuses on competitive advantage, strategic positioning
- Key indicators: market share, revenue growth, partnerships

**Tech (Wired)**:
- "A breakthrough in X signals a new chapter..."
- Emphasizes innovation, future possibilities
- Key indicators: adoption rates, capability improvements

**Arts (Vogue)**:
- "In the world of X, a new creative vision is taking shape..."
- Rich sensory language, cultural significance
- Key indicators: critical acclaim, audience engagement

**Health (Health Magazine)**:
- "New insights into X are empowering people..."
- Practical guidance, evidence-based
- Key indicators: evidence strength, expert consensus

**Analysis (NYT)**:
- "Recent developments in X are capturing attention..."
- Balanced, factual, authoritative
- Key indicators: adoption rates, stakeholder responses

## Flow Diagram

```
User Query
    ↓
determineFocusCategory(query)  ← Keyword matching
    ↓
getEditorialStyle(category)     ← Map to publication
    ↓
Dynamic System Prompt          ← Build style-specific instructions
    ↓
OpenAI Generation              ← GPT follows editorial guidelines
    ↓
Response includes:
  - focus_category: "BUSINESS"
  - style_source: "Wall Street Journal"
  - Content in WSJ voice
```

## Example Outputs

### Business Query: "Tesla stock performance"
- **Focus Category**: BUSINESS
- **Style Source**: Wall Street Journal
- **Tone**: Data-driven, executive-focused
- **Structure**: Market Overview → Financial Impact → Strategic Moves → Competitive Landscape → Outlook

### Tech Query: "ChatGPT new features"
- **Focus Category**: SCIENCES & TECH
- **Style Source**: Wired
- **Tone**: Futuristic, accessible, wonder-filled
- **Structure**: The Innovation → How It Works → Why It Matters → The Bigger Picture → What's Next

### Arts Query: "Metropolitan Museum exhibition"
- **Focus Category**: ARTS
- **Style Source**: Vogue
- **Tone**: Elegant, sensory, emotionally resonant
- **Structure**: The Moment → The Context → The Vision → The Impact → The Legacy

### Health Query: "Mediterranean diet benefits"
- **Focus Category**: HEALTH & SPORT
- **Style Source**: Health Magazine
- **Tone**: Energetic, practical, empowering
- **Structure**: The Discovery → The Science → Real-World Impact → Expert Advice → Your Next Move

## Benefits

1. **Topic-Appropriate Voice**: Business news sounds like WSJ, tech news like Wired
2. **Enhanced Engagement**: Writing style matches reader expectations for topic
3. **Professional Quality**: Each category uses industry-standard publication voice
4. **Automatic Detection**: No manual configuration needed, keywords trigger styles
5. **Fallback Safety**: Always includes style_source for debugging, defaults to NYT

## Testing Recommendations

Test queries for each category:
- **Business**: "Apple earnings report", "Federal Reserve interest rates"
- **Tech**: "AI breakthroughs", "quantum computing advances"
- **Arts**: "Broadway shows", "film festival highlights"
- **Health**: "sleep quality tips", "marathon training"
- **Analysis**: "climate policy", "education reform"

Check console logs for:
```javascript
logger.info('🔵 [INSIGHT-WRITER] Payload breakdown', {
  detectedCategory,
  editorialSource: editorialStyle.source
});
```

## Future Improvements

1. **GPT-Based Topic Detection**: Use GPT to analyze query intent instead of keyword matching
2. **User Style Preferences**: Allow users to choose preferred editorial voice
3. **Multi-Language Support**: Adapt styles for different languages/cultures
4. **Style Mixing**: Combine elements from multiple styles for hybrid topics
5. **Custom Styles**: Let users define their own editorial guidelines

## Related Files

- `/src/services/research/regular/agents/insightWriterAgent.ts` - Main agent implementation
- `/src/components/AGENT_WRITER_STYLE.md` - Editorial style guidelines
- `/src/services/research/regular/agents/insightSwarmController.ts` - Orchestration layer
- `/docs/architecture/INSIGHTS_UI_AND_SEARCH_IMPROVEMENTS.md` - Previous UI work
