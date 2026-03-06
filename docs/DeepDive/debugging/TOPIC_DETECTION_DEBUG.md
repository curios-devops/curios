# Topic Detection Debugging - Implementation

## Problem Identified
"Apple earning report" was defaulting to ANALYSIS instead of BUSINESS because the keyword "earning" was not in the business keywords list.

## Changes Made

### 1. Enhanced Business Keywords (insightWriterAgent.ts)

**Previous Keywords**:
```
business|market|economy|company|corporate|finance|industry|trade
```

**New Expanded Keywords**:
```
business|market|economy|company|corporate|finance|industry|trade|
stock|earning|earnings|revenue|profit|sales|investor|investment|
quarter|fiscal|financial|merger|acquisition|ceo|executive
```

**Added Keywords**:
- `earning` / `earnings` - Covers earnings reports
- `stock` - Stock market references
- `revenue`, `profit`, `sales` - Financial metrics
- `investor`, `investment` - Investment language
- `quarter`, `fiscal`, `financial` - Financial reporting terms
- `merger`, `acquisition` - M&A activity
- `ceo`, `executive` - Executive leadership

### 2. Enhanced All Category Keywords

**SCIENCES & TECH** - Added:
- `algorithm`, `data`, `cloud`, `internet`, `web`, `app`, `programming`

**HEALTH & SPORT** - Added:
- `nutrition`, `diet`, `exercise`, `clinic`, `hospital`, `therapy`

**ARTS** - Added:
- `movie`, `show`, `concert`, `exhibition`, `fashion`, `design`, `style`, `theatre`

### 3. Comprehensive Console Logging

Added debug logging at three levels:

#### Level 1: Topic Detection Start
```javascript
console.log('🎯 [TOPIC-DETECTION] Starting topic detection', {
  query,
  providedFocusCategory: focusCategory,
  willAutoDetect: !focusCategory
});
```

#### Level 2: Keyword Matching Process
```javascript
console.log('🔍 [KEYWORD-MATCH] Analyzing query', { 
  originalQuery: query,
  lowerCaseQuery: queryLower 
});

// For each category match:
console.log('✅ [KEYWORD-MATCH] Matched BUSINESS');
// or
console.log('⚠️ [KEYWORD-MATCH] No match found, defaulting to ANALYSIS');
```

#### Level 3: Topic Determined
```javascript
console.log('🎯 [TOPIC-DETECTION] Topic determined', {
  query,
  detectedCategory,
  wasProvided: !!focusCategory,
  wasAutoDetected: !focusCategory
});
```

#### Level 4: Editorial Style Selected
```javascript
console.log('📰 [EDITORIAL-STYLE] Style selected', {
  category: detectedCategory,
  source: editorialStyle.source,
  tone: editorialStyle.tone
});
```

### 4. UI Message for Auto-Detection

Added informational banner in TabSystem.tsx showing:
- Which topic was auto-selected
- The writing style being used
- Link to change the topic

**UI Message**:
```tsx
{!loading && result?.style_source && (
  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 flex items-start gap-3">
    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
    <div className="flex-1 text-sm">
      <span className="text-blue-900 dark:text-blue-100">
        <strong>Topic "{focusCategory || result?.focus_category || 'ANALYSIS'}"</strong> auto-selected based on your query.
      </span>
      {' '}
      <span className="text-blue-700 dark:text-blue-300">
        Writing style: <em>{result.style_source}</em>
      </span>
      {' '}
      <button
        onClick={() => setShowFocusDropdown(true)}
        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
      >
        Change topic
      </button>
    </div>
  </div>
)}
```

## Testing Instructions

### Step 1: Test Business Queries
Open browser console and search:
- "Apple earning report"
- "Tesla stock performance"
- "Microsoft quarterly revenue"
- "Amazon acquisition strategy"

**Expected Console Output**:
```javascript
🎯 [TOPIC-DETECTION] Starting topic detection { query: "Apple earning report", ... }
🔍 [KEYWORD-MATCH] Analyzing query { originalQuery: "Apple earning report", lowerCaseQuery: "apple earning report" }
✅ [KEYWORD-MATCH] Matched BUSINESS
🎯 [TOPIC-DETECTION] Topic determined { detectedCategory: "BUSINESS", wasAutoDetected: true }
📰 [EDITORIAL-STYLE] Style selected { category: "BUSINESS", source: "Wall Street Journal", tone: "Data-driven, executive-focused, action-oriented" }
```

**Expected UI**:
- Blue banner: "Topic 'BUSINESS' auto-selected based on your query. Writing style: Wall Street Journal"
- Article written in WSJ style (data-driven, executive-focused)

### Step 2: Test Other Categories

**Tech Query**: "ChatGPT new features"
- Should match SCIENCES & TECH (keywords: "chatgpt" contains "ai")
- Style: Wired
- Console: ✅ [KEYWORD-MATCH] Matched SCIENCES & TECH

**Health Query**: "Mediterranean diet benefits"
- Should match HEALTH & SPORT (keywords: "diet")
- Style: Health Magazine
- Console: ✅ [KEYWORD-MATCH] Matched HEALTH & SPORT

**Arts Query**: "Metropolitan Museum exhibition"
- Should match ARTS (keywords: "museum", "exhibition")
- Style: Vogue
- Console: ✅ [KEYWORD-MATCH] Matched ARTS

**Generic Query**: "climate change policy"
- Should default to ANALYSIS (no keyword matches)
- Style: New York Times
- Console: ⚠️ [KEYWORD-MATCH] No match found, defaulting to ANALYSIS

### Step 3: Verify UI Message
1. Run any query
2. Look for blue information banner below topic selector
3. Verify it shows:
   - Detected topic name
   - Editorial source (NYT, WSJ, Wired, Vogue, Health)
   - "Change topic" link that opens dropdown

### Step 4: Test Topic Changing
1. Click "Change topic" link in banner OR click topic dropdown button
2. Select different category
3. Page should reload with new topic
4. New article should be generated in that style

## Debug Log Examples

### Successful Business Detection
```
🎯 [TOPIC-DETECTION] Starting topic detection
  query: "Apple earning report"
  providedFocusCategory: undefined
  willAutoDetect: true

🔍 [KEYWORD-MATCH] Analyzing query
  originalQuery: "Apple earning report"
  lowerCaseQuery: "apple earning report"

✅ [KEYWORD-MATCH] Matched BUSINESS

🎯 [TOPIC-DETECTION] Topic determined
  query: "Apple earning report"
  detectedCategory: "BUSINESS"
  wasProvided: false
  wasAutoDetected: true

📰 [EDITORIAL-STYLE] Style selected
  category: "BUSINESS"
  source: "Wall Street Journal"
  tone: "Data-driven, executive-focused, action-oriented"

🔵 [INSIGHT-WRITER] Payload breakdown
  detectedCategory: "BUSINESS"
  editorialSource: "Wall Street Journal"
  ...
```

### Fallback to Analysis
```
🔍 [KEYWORD-MATCH] Analyzing query
  originalQuery: "general trends"
  lowerCaseQuery: "general trends"

⚠️ [KEYWORD-MATCH] No match found, defaulting to ANALYSIS

🎯 [TOPIC-DETECTION] Topic determined
  detectedCategory: "ANALYSIS"
  wasAutoDetected: true

📰 [EDITORIAL-STYLE] Style selected
  source: "New York Times"
```

## Troubleshooting

### Issue: Still seeing ANALYSIS for business queries
**Check**:
1. Open browser console
2. Look for `🔍 [KEYWORD-MATCH] Analyzing query`
3. Verify `lowerCaseQuery` contains business keywords
4. If no match shown, add more keywords to regex

### Issue: UI message not appearing
**Check**:
1. Verify `result.style_source` exists in response
2. Check console for `📰 [EDITORIAL-STYLE] Style selected`
3. Ensure TabSystem receives `result` prop with `style_source` field

### Issue: Wrong category detected
**Check**:
1. Keyword order matters - first match wins
2. If query has multiple category keywords, adjust regex order
3. Consider making keywords more specific

## Keyword Coverage

| Category | Keyword Count | Coverage |
|----------|---------------|----------|
| BUSINESS | 20 keywords | Finance, markets, corporate, earnings, stocks |
| SCIENCES & TECH | 18 keywords | Technology, AI, research, innovation, programming |
| HEALTH & SPORT | 16 keywords | Medical, wellness, fitness, nutrition, sports |
| ARTS | 16 keywords | Culture, entertainment, creative, exhibitions |
| ANALYSIS | (default) | Politics, policy, general analysis |

## Future Improvements

1. **GPT-Based Detection**: Use AI to classify query topic instead of keywords
2. **Multi-Category Support**: Allow blended styles for cross-category topics
3. **User Preferences**: Remember user's preferred editorial style
4. **Confidence Scoring**: Show how confident the detection is
5. **Custom Keywords**: Let users add their own keyword mappings

## Related Files

- `/src/services/research/regular/agents/insightWriterAgent.ts` - Topic detection logic
- `/src/components/TabSystem.tsx` - UI message display
- `/docs/architecture/DYNAMIC_EDITORIAL_STYLES.md` - Architecture overview
- `/docs/testing/DYNAMIC_STYLES_TEST_GUIDE.md` - Testing guide
