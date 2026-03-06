# Side-by-Side Search Comparison Test

## Purpose

This test page allows you to compare **Reverse Image Search (SERP API)** vs **Brave Text Search** side-by-side, showing both raw tool results and the formatted payload that gets sent to the Writer Agent.

## Location

`http://localhost:5173/serp-test`

## What It Does

### Left Column: Reverse Image Search
1. Uploads `Elon Musk.png` to Supabase Storage
2. Gets public URL
3. Calls `reverseImageSearchTool()` (same as production)
4. Shows raw results from SERP API
5. Shows formatted Writer Agent payload

### Right Column: Brave Text Search
1. Searches hardcoded query: `"Elon Musk"`
2. Calls `braveSearchTool()` (same as production)
3. Shows raw results from Brave API
4. Shows formatted Writer Agent payload

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🧪 Side-by-Side Search Comparison                         │
├───────────────────────────┬─────────────────────────────────┤
│ 📸 Reverse Image Search   │ 🦁 Brave Text Search           │
│ [Elon Musk.png image]     │ "Elon Musk"                     │
│ [Test Reverse Image]      │ [Test Brave Search]             │
├───────────────────────────┼─────────────────────────────────┤
│ 📦 Raw Tool Results       │ 📦 Raw Tool Results             │
│ - Web: X                  │ - Web: X                        │
│ - Images: X               │ - Images: X                     │
│ - Related: X              │ - News: X                       │
│ [Expand JSON]             │ [Expand JSON]                   │
├───────────────────────────┼─────────────────────────────────┤
│ ✍️ Writer Agent Payload   │ ✍️ Writer Agent Payload         │
│ - Query: "Image Search"   │ - Query: "Elon Musk"            │
│ - Results: X              │ - Results: X                    │
│ - Images: X               │ - Images: X                     │
│ - Videos: 0               │ - Videos: X                     │
│ [Expand JSON]             │ [Expand JSON]                   │
└───────────────────────────┴─────────────────────────────────┘
```

## How to Use

1. **Start dev server**: `npm run dev`
2. **Navigate to**: `http://localhost:5173/serp-test`
3. **Click "Test Reverse Image"** - Wait for results (left column)
4. **Click "Test Brave Search"** - Wait for results (right column)
5. **Compare the results**:
   - Expand "Raw Tool Results" JSON to see what each API returns
   - Expand "Writer Agent Payload" JSON to see what RetrieverAgent formats
   - Check console for detailed logs

## What to Look For

### Image Structure Comparison

**Reverse Image (SERP API)** should return:
```json
{
  "url": "https://example.com/image.jpg",
  "alt": "Elon Musk",           // ✅ Required field
  "title": "Elon Musk",          // ✅ Optional
  "source_url": "https://..."    // ✅ Correct field name
}
```

**Brave Search** returns:
```json
{
  "url": "https://example.com/image.jpg",
  "alt": "Search result image",  // ✅ Required field
  "source_url": "https://..."    // ✅ Correct field name
}
```

### Expected Differences

| Feature | Reverse Image | Brave Search |
|---------|--------------|--------------|
| Query | "Image Search" | "Elon Musk" |
| Web Results | From SERP API | From Brave API |
| Images | From SERP `inline_images` | From Brave Images API |
| Videos | None (empty array) | From Brave Videos API |
| News | None | Merged into results |

## Debugging

If images don't appear in production but work here:

1. **Check image structure** - Expand JSONs, verify `alt` field exists
2. **Check counts** - Both should have images > 0
3. **Compare payloads** - Writer Agent payload should match production
4. **Check console** - Look for transformation errors

## Files Used (Exact Production Logic)

- `src/commonService/searchTools/reverseImageSearchTool.ts` - SERP API wrapper
- `src/commonService/searchTools/braveSearchTool.ts` - Brave API wrapper
- `src/lib/supabase.ts` - Supabase client
- `supabase/functions/reverse-image-search/index.ts` - Edge Function

## Console Logs

You should see:

```
🔍 [TEST] Starting Reverse Image Search test
📤 [TEST] Uploading image: 123456 bytes
✅ [TEST] Upload successful: uploads/test-123456.png
✅ [TEST] Public URL: https://...
🔍 [TEST] Calling reverseImageSearchTool...
✅ [TEST] Reverse Image Search completed: { webCount: 10, imagesCount: 50, ... }
📦 [TEST] Writer Agent Payload prepared: { resultsCount: 10, imagesCount: 50 }

🔍 [TEST] Starting Brave Search test
🔍 [TEST] Calling braveSearchTool with: "Elon Musk"
✅ [TEST] Brave Search completed: { webCount: 10, imagesCount: 50, ... }
📦 [TEST] Writer Agent Payload prepared: { resultsCount: 10, imagesCount: 50, ... }
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Upload error | Check Supabase bucket exists and has correct RLS policies |
| SERP API error | Check Edge Function deployed and SERPAPI_API_KEY set |
| Brave API error | Check BRAVE_API_KEY in .env |
| No images in JSON | Check API quotas, try different image |
| Structure mismatch | Check Edge Function image mapping (should have `alt` field) |

## Next Steps

After comparing results:

1. If structures match → Issue is in UI rendering or Writer Agent
2. If SERP missing `alt` → Edge Function needs fix (already done)
3. If Brave has images but SERP doesn't → Check SERP API quota/response
4. If counts differ greatly → Expected (different APIs, different results)
