# Studio API Fix - OpenAI 400 Error Resolution

## Problem

The Studio Writer Agent was receiving a **400 Bad Request** error when calling the Supabase Edge Function (`fetch-openai`):

```
POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai 400 (Bad Request)
```

## Root Cause

The issue was in `/src/services/studio/agents/studioWriterAgent.ts` in the `callOpenAI()` method (non-streaming mode):

### The Problem
```typescript
const payload = {
  prompt: JSON.stringify({
    messages,
    model,
    temperature: 0.7,
    max_output_tokens: 800
    // Missing: response_format was implicitly expected to be JSON
  }),
  stream: false
};
```

### Why It Failed
Looking at `/supabase/functions/fetch-openai/index.ts`, the edge function has this logic:

```typescript
// Only add response_format for non-streaming requests
if (!enableStreaming) {
  payload.response_format = parsedPrompt.response_format || { type: 'json_object' };
}
```

**The edge function defaults to `response_format: { type: 'json_object' }`** when `stream: false`.

However, the Studio Writer Agent generates **plain text/markdown content** (bullet points, scripts), NOT JSON. When OpenAI receives `response_format: json_object` but the system prompt doesn't instruct it to generate JSON, OpenAI returns a 400 error.

## Solution

### Fixed the `callOpenAI()` method:

```typescript
private async callOpenAI(
  messages: Array<{ role: string; content: string }>,
  model: string
): Promise<string> {
  // ... setup code ...

  // Prepare payload WITHOUT response_format (we want plain text/markdown, not JSON)
  const payload = {
    prompt: JSON.stringify({
      messages,
      model,
      temperature: 0.7,
      max_output_tokens: 800
      // NO response_format - plain text is default
    }),
    stream: false
  };

  // ... rest of implementation ...

  // The edge function returns { text: content }
  return data.text || data.content || '';
}
```

### Key Changes:
1. **Removed implicit JSON mode** - We don't include `response_format` in the prompt payload
2. **Added error handling** - Better logging and timeout handling
3. **Fixed response parsing** - Edge function returns `{ text: content }`, so we check both `data.text` and `data.content`

## Search Service Comparison

The Search Writer Agent works correctly because:

1. **SearchWriterAgent uses JSON mode intentionally**:
   ```typescript
   response_format: { type: 'json_object' }
   ```
   And its system prompt explicitly says: "Return ONLY valid JSON"

2. **StudioWriterAgent generates markdown**:
   - Key Ideas: Bulleted list format
   - Script: Sections with headers (Hook, Explanation, Takeaway)
   - Should NOT use JSON mode

## UI Improvements

Also improved the Studio Results page layout:

### Removed
- ❌ **Plan section** (not needed for user-facing UI, internal only)

### Enhanced Layout
- ✅ **Video Preview** - Clean 9:16 aspect ratio placeholder
- ✅ **Key Ideas Section** - Separate card that streams first
- ✅ **Script Section** - Separate card that streams second
- ✅ **Progress Sidebar** - Shows workflow steps only

### Benefits
- Cleaner, more focused interface
- Better visual hierarchy
- Separate streaming sections for better UX
- Key ideas appear immediately while script is being generated

## Testing

To test the fix:
1. Navigate to: `http://localhost:5173/studio/results?q=Why%20is%20the%20sky%20blue?`
2. You should see:
   - Progress bar updating
   - Key ideas streaming in first (3-5 bullets)
   - Script streaming in second (Hook → Explanation → Takeaway)
   - No 400 errors in console

## Files Modified

1. `/src/services/studio/agents/studioWriterAgent.ts`
   - Fixed `callOpenAI()` method to not use JSON mode
   - Added better error handling and logging
   - Fixed response parsing for edge function format

2. `/src/services/studio/pages/StudioResults.tsx`
   - Removed planDetails variable and Plan section
   - Created separate cards for Key Ideas and Script
   - Improved layout: video + content sections in main area, progress in sidebar

## Technical Details

### Edge Function Response Format
- **Streaming mode**: SSE chunks with `data: {"content": "..."}`
- **Non-streaming mode**: JSON with `{ text: "...", openai: {...} }`

### OpenAI Behavior
- **Without response_format**: Returns plain text (default)
- **With response_format: json_object**: Returns only valid JSON
  - ⚠️ Requires system prompt to explicitly request JSON
  - ⚠️ Will error (400) if prompt doesn't indicate JSON output

### Best Practice
Match the `response_format` to your use case:
- **Structured data** → Use `json_object` + explicit JSON instructions
- **Natural text/markdown** → No response_format (plain text default)
