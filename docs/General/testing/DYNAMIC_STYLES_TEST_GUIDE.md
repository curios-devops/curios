# Dynamic Editorial Styles - Testing Guide

## Quick Test Queries

### 1. Business (Wall Street Journal Style)
**Test Queries**:
- "Tesla stock market performance"
- "Federal Reserve interest rate decision"
- "Apple quarterly earnings report"
- "Microsoft acquisition strategy"

**Expected Output**:
- `style_source: "Wall Street Journal"`
- `focus_category: "BUSINESS"`
- Data-driven language with market metrics
- Executive perspectives and financial analysis
- Structure: Market Overview → Financial Impact → Strategic Moves → Competitive Landscape → Outlook

**Console Log Check**:
```javascript
editorialSource: 'Wall Street Journal'
detectedCategory: 'BUSINESS'
```

---

### 2. Technology (Wired Style)
**Test Queries**:
- "ChatGPT-4 new features"
- "quantum computing breakthrough"
- "SpaceX Starship launch"
- "artificial intelligence innovations"

**Expected Output**:
- `style_source: "Wired"`
- `focus_category: "SCIENCES & TECH"`
- Futuristic, accessible language
- Vivid analogies and human impact focus
- Structure: The Innovation → How It Works → Why It Matters → The Bigger Picture → What's Next

**Console Log Check**:
```javascript
editorialSource: 'Wired'
detectedCategory: 'SCIENCES & TECH'
```

---

### 3. Arts & Culture (Vogue Style)
**Test Queries**:
- "Metropolitan Museum new exhibition"
- "Broadway musical reviews"
- "Cannes Film Festival highlights"
- "fashion week trends"

**Expected Output**:
- `style_source: "Vogue"`
- `focus_category: "ARTS"`
- Elegant, sensory language
- Emotional resonance and cultural significance
- Structure: The Moment → The Context → The Vision → The Impact → The Legacy

**Console Log Check**:
```javascript
editorialSource: 'Vogue'
detectedCategory: 'ARTS'
```

---

### 4. Health & Wellness (Health Magazine Style)
**Test Queries**:
- "Mediterranean diet health benefits"
- "marathon training tips"
- "sleep quality improvement"
- "mental health wellness strategies"

**Expected Output**:
- `style_source: "Health Magazine"`
- `focus_category: "HEALTH & SPORT"`
- Energetic, practical, empowering language
- Evidence-based with actionable advice
- Structure: The Discovery → The Science → Real-World Impact → Expert Advice → Your Next Move

**Console Log Check**:
```javascript
editorialSource: 'Health Magazine'
detectedCategory: 'HEALTH & SPORT'
```

---

### 5. Analysis (New York Times Style - Default)
**Test Queries**:
- "climate change policy updates"
- "education reform proposals"
- "immigration policy changes"
- "political developments"

**Expected Output**:
- `style_source: "New York Times"`
- `focus_category: "ANALYSIS"`
- Objective, factual, authoritative
- Balanced perspectives
- Structure: Background → Key Findings → Expert Perspectives → Industry Impact → Next Steps

**Console Log Check**:
```javascript
editorialSource: 'New York Times'
detectedCategory: 'ANALYSIS'
```

---

## Debugging Steps

### 1. Check Console Logs
Open browser DevTools console before running a query:

```javascript
// Expected log sequence:
InsightWriterAgent: Starting insight generation { query, focusCategory }
🔵 [INSIGHT-WRITER] Payload breakdown {
  detectedCategory: 'BUSINESS',
  editorialSource: 'Wall Street Journal'
}
```

### 2. Verify Response Structure
Check the Insights result includes:

```json
{
  "focus_category": "BUSINESS",
  "style_source": "Wall Street Journal",
  "headline": "...",
  "subtitle": "...",
  "short_summary": "...",
  "markdown_report": "...",
  "follow_up_questions": [...],
  "citations": [...],
  "confidence_level": 85
}
```

### 3. Validate Writing Style
Read the `markdown_report` and check for:
- **Business**: Market metrics, executive quotes, financial language
- **Tech**: Future-focused, accessible explanations, innovation emphasis
- **Arts**: Sensory details, emotional language, cultural context
- **Health**: Practical tips, evidence citations, empowering tone
- **Analysis**: Balanced reporting, multiple perspectives, factual

### 4. Test Fallback Behavior
Test edge cases:
- Empty query: Should default to ANALYSIS
- Ambiguous query "trends": Should default to ANALYSIS
- Multi-category query "health tech innovation": Should pick one (likely SCIENCES & TECH due to "tech" keyword)

---

## Keyword Detection Reference

| Category | Trigger Keywords |
|----------|-----------------|
| SCIENCES & TECH | tech, ai, software, digital, computer, cyber, science, research, study, discovery, innovation |
| HEALTH & SPORT | health, medical, drug, disease, patient, doctor, sport, fitness, athletic, wellness |
| BUSINESS | business, market, economy, company, corporate, finance, industry, trade |
| ARTS | art, music, film, culture, entertainment, theater, gallery, museum, creative |
| ANALYSIS | (default fallback) |

---

## Known Limitations

1. **Simple Keyword Matching**: 
   - Current detection uses regex patterns
   - May misclassify ambiguous queries
   - Future: Consider GPT-based topic detection

2. **Single Category Assignment**:
   - Query can only map to one category
   - "health tech" will pick first match (SCIENCES & TECH)
   - Future: Support multi-category or hybrid styles

3. **English Only**:
   - Keywords work for English queries
   - Future: Multi-language keyword sets

---

## Success Criteria

✅ **Correct Category Detection**: Query maps to appropriate focus category  
✅ **Style Source Present**: Response includes `style_source` field  
✅ **Appropriate Voice**: Article reads in the style of the specified publication  
✅ **Structure Follows Pattern**: Headers match the editorial style's structure  
✅ **Tone Consistency**: Language and tone align with publication guidelines  
✅ **Console Logs Working**: Debug information appears in browser console  

---

## Troubleshooting

### Issue: All queries return NYT style
**Cause**: Keywords not matching or `focusCategory` not propagating  
**Fix**: Check console logs for `detectedCategory`, verify keyword regex patterns

### Issue: `style_source` is undefined
**Cause**: Old code version or validation issue  
**Fix**: Ensure `validateWriterResult` sets `style_source` from `getEditorialStyle()`

### Issue: Generic fallback content
**Cause**: OpenAI API error or empty results  
**Fix**: Check `generateStyledReport()` is using category-specific language

### Issue: Category detection wrong
**Cause**: Competing keywords or order of regex checks  
**Fix**: Make keywords more specific or adjust match order in `determineFocusCategory()`

---

## Integration Testing

1. **End-to-End Flow**:
   ```
   User enters query → 
   InsightsResults.tsx passes focusCategory → 
   insightSwarmController relays to writer → 
   insightWriterAgent detects category → 
   getEditorialStyle returns guidelines → 
   Dynamic prompt built → 
   OpenAI generates styled content → 
   Response includes style_source
   ```

2. **Verify Each Step**:
   - Console logs at each stage
   - Check data structure at each handoff
   - Validate final output matches expectations

3. **Cross-Service Validation**:
   - Image generation should use style-appropriate prompts
   - Share feature should work with styled content
   - Focus categories should display correctly in UI

---

## Next Steps After Testing

1. **Gather User Feedback**: Which styles resonate best?
2. **Refine Keywords**: Add missing trigger words
3. **GPT Detection**: Implement AI-based topic classification
4. **Style Mixing**: Consider hybrid approaches for multi-topic queries
5. **Custom Styles**: Allow user-defined editorial preferences
