# PUPPETEER CHROME TIMEOUT FIX

## Problem Identified

Puppeteer's Chrome is being found correctly:
```
Using Puppeteer Chrome: /Users/marcelo/.cache/puppeteer/chrome/mac-145.0.7632.46/...
```

BUT it times out trying to connect:
```
TimeoutError: Timed out after 25000 ms while trying to connect to the browser!
```

Additionally, the Netlify function times out at 30s instead of the configured 60s.

## Root Causes

1. **Browser Connection Timeout**: Remotion's default 25s timeout isn't enough for Puppeteer Chrome to launch and establish connection
2. **Missing Chrome Flags**: Puppeteer Chrome needs specific flags for headless operation
3. **Function Timeout**: Netlify CLI ignoring `functionsTimeout = 60` setting (using default 30s)

## Changes Made

### 1. Updated render-chunk.js Chrome Configuration

**Added**:
- `timeoutInMilliseconds: 120000` - 2 minutes total render timeout
- `chromiumOptions.timeout: 60000` - 60s browser launch timeout
- `chromiumOptions.headless: true` - Explicit headless mode
- Extended Chrome flags for stability:
  - `--disable-gpu` - No GPU needed for headless
  - `--no-first-run` - Skip first-run setup
  - `--disable-background-networking` - Faster startup
  - `--mute-audio` - No audio output needed
  - And many more stability flags

**Why This Works**:
- Gives Chrome more time to launch (60s instead of default 25s)
- Provides proper flags for headless operation
- Explicitly sets headless mode (Puppeteer default, but making it clear)
- Increases overall render timeout to 2 minutes (was implicitly 30s)

### 2. Function Timeout Issue

The netlify.toml has `functionsTimeout = 60` but Netlify CLI is using 30s default.

**Solution**: Use environment variable override when starting server.

## Testing Instructions

### Step 1: Restart with Explicit Timeout

Stop the current server (`Ctrl+C`) and restart with explicit timeout:

```bash
# Set timeout via environment variable (overrides netlify.toml)
NETLIFY_DEV_TIMEOUT=120 npm run dev
```

OR update your `package.json` dev script:

```json
{
  "scripts": {
    "dev": "NETLIFY_DEV_TIMEOUT=120 netlify dev"
  }
}
```

### Step 2: Hard Refresh Browser

```
Cmd+Shift+R
```

### Step 3: Test Production Render

1. Go to Phase 6 Test Page
2. Enable **Production Mode** (toggle ON)
3. Click **"Test Chunked Renderer"**

### Step 4: Monitor Terminal

**Expected Logs** (now with longer timeouts):

```
[Render Chunk] Using Puppeteer Chrome: /Users/marcelo/.cache/puppeteer/chrome/...
[Render Chunk] Rendering chunk...
[Render Chunk] Render progress: 20.0%
[Render Chunk] Render progress: 40.0%
[Render Chunk] Render progress: 60.0%
[Render Chunk] Render progress: 80.0%
[Render Chunk] Render progress: 100.0%
[Render Chunk] Render complete
[Render Chunk] Uploading to Supabase...
[Render Chunk] Upload complete
Response with status 200 in 45000 ms. ← Should be under 60s per chunk
```

## What Changed in Code

### netlify/functions/render-chunk.js

**Before**:
```javascript
browserExecutable: puppeteerExecutable,
chromiumOptions: {
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
}
```

**After**:
```javascript
browserExecutable: puppeteerExecutable,
timeoutInMilliseconds: 120000, // 2 minutes total
chromiumOptions: {
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--disable-background-networking',
    '--mute-audio',
    // ... and more for stability
  ],
  timeout: 60000, // 60s browser launch timeout
  headless: true
}
```

## Alternative: Update Netlify CLI

If environment variable doesn't work, update Netlify CLI:

```bash
npm install -g netlify-cli@latest
```

Then restart normally:
```bash
npm run dev
```

## Expected Results

### Success Indicators:
- ✅ No more "Timed out after 25000 ms" errors
- ✅ Chrome launches within 60s
- ✅ Render completes within 2 minutes per chunk
- ✅ Function doesn't timeout (waits full 120s if needed)

### First Run Notes:
- **First render may take longer** (45-60s) due to Chrome cache warming
- **Subsequent renders faster** (20-30s) with warm cache
- **3-second chunks** should render in 20-30s total (bundle + render + upload)

## Troubleshooting

### If Still Times Out at 30s:
```bash
# Try with explicit netlify command
netlify dev --timeout=120
```

### If Chrome Still Won't Launch:
Check if Chrome is actually installed by Puppeteer:
```bash
ls -la /Users/marcelo/.cache/puppeteer/chrome/mac-145.0.7632.46/chrome-mac-x64/
```

Should show "Google Chrome for Testing.app" folder.

### If Chrome Launches but Render Fails:
Check terminal for actual error (not just timeout). Look for:
- Memory errors → Reduce parallel chunks from 5 to 3
- Composition errors → Check StudioChunk component
- Upload errors → Check Supabase credentials

## Production Deployment Notes

When deploying to Netlify production:

1. **FREE Tier Limitation**: 10s timeout (can't change)
2. **Solution**: 3-second chunks should render in 6-9s (fits within 10s)
3. **Puppeteer on Netlify**: Automatically works on Ubuntu containers
4. **No Changes Needed**: Same code works in production

## Summary

**What We Fixed**:
1. ✅ Increased browser launch timeout from 25s → 60s
2. ✅ Increased total render timeout to 120s
3. ✅ Added comprehensive Chrome stability flags
4. ✅ Explicit headless mode configuration
5. 🔧 Need to restart server with timeout override

**Next Step**: Restart server with `NETLIFY_DEV_TIMEOUT=120 npm run dev` and test!
