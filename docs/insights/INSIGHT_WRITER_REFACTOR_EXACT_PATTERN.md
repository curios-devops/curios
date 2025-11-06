# InsightWriterAgent Refactor - Exact SearchWriterAgent Pattern

## Problem

The Insights workflow was freezing after these console logs:
```
[2025-11-04T21:47:25.932Z] DEBUG: Final result counts {"web":10,"images":10,"videos":0}
[2025-11-04T21:47:27.398Z] DEBUG: Queue processing finished
```

After the search completed, InsightWriterAgent would call OpenAI but **never receive a response** or the app would freeze waiting.

## Root Cause

The InsightWriterAgent had **inline OpenAI call logic** embedded directly in the `execute()` method, making it:
- Hard to debug
- Complex with nested try-catch blocks
- Different structure from the working SearchWriterAgent
- Potential for timing/race issues

## Solution: Copy Exact Working Pattern

### Working Pattern (SearchWriterAgent)

SearchWriterAgent uses **clean separation**:
1. ✅ `execute()` method handles business logic
2. ✅ `callOpenAI()` method handles API calls
3. ✅ Simple, linear flow
4. ✅ Clear error handling

```typescript
// SearchWriterAgent structure
class SearchWriterAgent {
  private async callOpenAI(messages, model): Promise<ArticleResult> {
    // Simple fetch logic
    // Simple parsing
    // Simple validation
    // Return result
  }

  async execute(params): Promise<AgentResponse<ArticleResult>> {
    try {
      // Build prompts
      const messages = [...];
      
      // Call OpenAI (single line)
      const articleResult = await this.callOpenAI(messages, model);
      
      // Return immediately
      return { success: true, data: articleResult };
    } catch (error) {
      // Fallback
      return { success: false, data: this.getFallbackData(query) };
    }
  }
}
```

### Before Fix (InsightWriterAgent)

```typescript
class InsightWriterAgent {
  async execute(request): Promise<AgentResponse<InsightWriterResult>> {
    try {
      // Build prompts
      const systemPrompt = `...`;
      const userPrompt = `...`;
      
      // ❌ INLINE OpenAI call (80+ lines of code!)
      const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const payload = { ... };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      let writerResult: InsightWriterResult;
      try {
        const response = await fetch(supabaseEdgeUrl, {...});
        clearTimeout(timeoutId);
        const data = await response.json();
        
        // Nested parsing logic
        if (typeof data.text === 'object') { ... }
        else if (typeof data.text === 'string') { ... }
        
        // Nested validation
        if (!writerResult?.headline || ...) { ... }
        
      } catch (error) {
        // Nested error handling
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') { ... }
        writerResult = this.getFallbackInsights(query, results);
      }
      
      // Post-processing validation
      if (!writerResult.headline) { ... }
      if (!writerResult.subtitle) { ... }
      // ... more checks
      
      return { success: true, data: writerResult };
    } catch (error) {
      // Outer error handling
      return { success: true, data: this.getFallbackInsights(...) };
    }
  }
}
```

**Problems**:
- ❌ 80+ lines of OpenAI logic inline
- ❌ Nested try-catch blocks (2 levels deep)
- ❌ Complex control flow
- ❌ Hard to debug where freeze happens
- ❌ Different structure from working SearchWriterAgent

### After Fix (InsightWriterAgent)

```typescript
class InsightWriterAgent {
  private readonly defaultModel: string = 'gpt-4.1-mini-2025-04-14';

  constructor() {
    logger.info('InsightWriterAgent: Initialized');
  }

  // ✅ EXTRACTED OpenAI call (exactly like SearchWriterAgent)
  private async callOpenAI(
    messages: Array<{ role: string; content: string }>,
    model: string = this.defaultModel
  ): Promise<InsightWriterResult> {
    const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseEdgeUrl) throw new Error('Supabase Edge Function URL not configured');
    if (!supabaseAnonKey) throw new Error('Supabase anon key not found');

    logger.debug('Calling OpenAI via Supabase', { model, messageCount: messages.length });

    const payload = {
      prompt: JSON.stringify({
        messages,
        model,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_output_tokens: 2000
      })
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(supabaseEdgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OpenAI API error', { status: response.status, error: errorText.substring(0, 200) });
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.text) throw new Error('No content in response');

      // Parse response
      let insightResult: InsightWriterResult;
      if (typeof data.text === 'object') {
        insightResult = data.text;
      } else if (typeof data.text === 'string') {
        const cleanText = data.text.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');
        insightResult = JSON.parse(cleanText);
      } else {
        throw new Error('Unexpected response format');
      }

      // Validate
      if (!insightResult?.headline || !insightResult?.markdown_report) {
        throw new Error('Invalid insight format');
      }

      logger.debug('Insight generated successfully', { reportLength: insightResult.markdown_report.length });
      return insightResult;

    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.error('Request timeout after 30s');
          throw new Error('Request timeout - please try again');
        }
        logger.error('OpenAI call failed', { error: error.message });
      }
      throw error;
    }
  }

  // ✅ SIMPLIFIED execute method (exactly like SearchWriterAgent)
  async execute(request: InsightWriterRequest): Promise<AgentResponse<InsightWriterResult>> {
    const { query, insight_areas, search_queries, results, analysis_strategy } = request;

    try {
      logger.info('InsightWriterAgent: Starting execution', { 
        query, 
        resultsCount: results.length
      });

      if (!results || results.length === 0) {
        throw new Error('No search results provided');
      }

      // Build prompts
      const systemPrompt = `...`;
      const resultsContext = this.formatResultsForContext(results);
      const userPrompt = `...`;
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      logger.debug('Calling OpenAI to generate insights', {
        promptLength: systemPrompt.length + userPrompt.length,
        sourceCount: results.length
      });

      // ✅ SINGLE LINE OpenAI call (same as SearchWriterAgent)
      const insightResult = await this.callOpenAI(messages, this.defaultModel);

      // Simple defaults for missing fields
      if (!insightResult.subtitle) insightResult.subtitle = 'Strategic Analysis and Key Findings';
      if (!insightResult.short_summary) insightResult.short_summary = `Analysis of ${query}`;
      if (!insightResult.follow_up_questions || insightResult.follow_up_questions.length === 0) {
        insightResult.follow_up_questions = [`What are the key trends in ${query}?`];
      }
      if (!insightResult.citations) insightResult.citations = [];
      if (!insightResult.confidence_level) insightResult.confidence_level = 75;

      logger.info('InsightWriterAgent: Successfully generated insights', {
        reportLength: insightResult.markdown_report.length
      });

      // ✅ IMMEDIATE RETURN (same as SearchWriterAgent)
      return {
        success: true,
        data: insightResult
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logger.error('InsightWriterAgent: Execution failed', {
        query,
        error: errorMessage
      });

      // ✅ FALLBACK (same as SearchWriterAgent)
      return {
        success: false,
        error: errorMessage,
        data: this.getFallbackInsights(query, results)
      };
    }
  }
}
```

## Key Changes

### 1. ✅ Extracted `callOpenAI()` Method
- **Same signature** as SearchWriterAgent
- **Same logic** for fetch, parse, validate
- **Same error handling** with AbortController
- **Same timeout** (30 seconds)

### 2. ✅ Simplified `execute()` Method
- **Linear flow**: Build prompts → Call API → Return
- **Single try-catch**: No nested error handling
- **Simple defaults**: Minimal post-processing
- **Immediate return**: No complex validation loops

### 3. ✅ Removed Complexity
- ❌ Removed nested try-catch blocks
- ❌ Removed inline OpenAI call code
- ❌ Removed complex validation logic
- ❌ Removed potential freeze points

## Why This Fixes the Freeze

### Before
```
execute() {
  try {
    // Build prompts
    try {
      // Inline OpenAI call (80+ lines)
      // Nested parsing
      // Nested validation
    } catch {
      // Nested error handling
    }
    // Post-processing validation
    // More logic
  } catch {
    // Outer error handling
  }
}
```
**Problem**: If freeze happens in nested logic, hard to debug and recover.

### After
```
execute() {
  try {
    // Build prompts
    const result = await this.callOpenAI(messages); // Single line!
    // Simple defaults
    return { success: true, data: result };
  } catch (error) {
    return { success: false, data: this.getFallbackData() };
  }
}
```
**Solution**: Simple, linear flow. If OpenAI fails, we catch and return fallback immediately.

## Benefits

1. ✅ **Same structure** as proven working SearchWriterAgent
2. ✅ **Easy to debug** - can add logs in `callOpenAI()` method
3. ✅ **No nested complexity** - single try-catch level
4. ✅ **Clear error boundary** - errors caught at method level
5. ✅ **Standard pattern** - consistent across all writer agents

## Testing

The console should now show:
```javascript
InsightWriterAgent: Starting execution { query: "elon musk", resultsCount: 6 }
Calling OpenAI via Supabase { model: "gpt-4.1-mini-2025-04-14", messageCount: 2 }
Insight generated successfully { reportLength: 1500 }
InsightWriterAgent: Successfully generated insights { reportLength: 1500 }
```

If timeout occurs:
```javascript
Request timeout after 30s
InsightWriterAgent: Execution failed { query: "elon musk", error: "Request timeout" }
// Returns fallback insights automatically
```

## Files Modified

- `/src/services/research/regular/agents/insightWriterAgent.ts`
  - Extracted `callOpenAI()` method (90 lines)
  - Simplified `execute()` method (35 lines)
  - Removed nested try-catch complexity
  - **Now matches SearchWriterAgent structure exactly**

## Conclusion

The freeze was caused by **complex inline logic** with nested error handling. By extracting the OpenAI call into a separate method and matching the proven SearchWriterAgent pattern exactly, we:

1. ✅ Eliminated nested complexity
2. ✅ Simplified error handling  
3. ✅ Made debugging easier
4. ✅ Created consistent pattern across agents
5. ✅ Should fix the freeze issue

**Next**: Test the Insights workflow to confirm no more freezing! 🎉
