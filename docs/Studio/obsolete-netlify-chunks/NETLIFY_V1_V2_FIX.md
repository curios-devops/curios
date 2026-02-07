# 🔧 Fixed: Netlify Functions Format (v1 vs v2)

## The Problem

The server logs showed:
```
method: undefined
⬥ Your function response must have a numerical statusCode. You gave: undefined
```

**Root Cause**: The function was using **Netlify Functions v2** format (Web API `Request`/`Response`), but Netlify Dev in this project uses **v1** format (AWS Lambda-style `event`/`context`).

## The Fix

Changed from **v2 format**:
```javascript
// ❌ BEFORE (v2)
export const handler = async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const body = await req.json();
  // ...
}
```

To **v1 format**:
```javascript
// ✅ AFTER (v1)
export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  const body = JSON.parse(event.body);
  // ...
}
```

## Key Differences

| v1 (AWS Lambda Style) | v2 (Web Standard) |
|----------------------|-------------------|
| `event.httpMethod` | `req.method` |
| `event.body` (string) | `await req.json()` |
| `return { statusCode, headers, body }` | `return new Response(...)` |
| `body: JSON.stringify(data)` | Constructor takes body directly |

## Changes Made

1. **Handler signature**: `(req, context)` → `(event, context)`
2. **Method check**: `req.method` → `event.httpMethod`
3. **Parse body**: `await req.json()` → `JSON.parse(event.body)`
4. **Return format**: `new Response(...)` → `{ statusCode, headers, body }`

All 5 response points in the function were updated:
- 405 Method Not Allowed
- 400 Bad Request (invalid input)
- 500 Internal Error (no Supabase config)
- 200 Success (with chunk URL)
- 500 Internal Error (catch block)

## Testing

1. **Restart server**:
   ```bash
   # Ctrl+C in terminal running npm run dev
   npm run dev
   ```

2. **Wait for**: `⬥ Loaded function render-chunk`

3. **Test in browser**:
   - Hard refresh: `Cmd+Shift+R`
   - Open Phase 6 Test Page
   - Toggle Production Mode ON
   - Click "Test Chunked Renderer"

4. **Expected behavior**:
   - No more "method: undefined" ✅
   - No more "statusCode: undefined" ✅
   - Should see actual request processing
   - May still fail on Remotion bundling (that's next step)

## Why This Matters

Netlify Functions has two formats:
- **v1** (Legacy): AWS Lambda-compatible, widely supported
- **v2** (Modern): Web standard `Request`/`Response` API

Your `netlify.toml` doesn't specify `functions_directory` with `@netlify/functions` dependency, so it defaults to v1 format.

To use v2 format, you would need:
```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild_zisi"
```

But for now, **v1 format works perfectly** and is more compatible.

---

**Status**: ✅ Function format fixed
**Next**: Test actual video rendering (Remotion bundling)
**Date**: 2025-02-06
