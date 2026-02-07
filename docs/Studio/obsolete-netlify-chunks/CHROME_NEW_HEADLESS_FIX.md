# 🌐 Fixed: Chrome New Headless Mode

## The Problem

```
Old Headless mode has been removed from the Chrome binary. 
Please use the new Headless mode
```

**Root Cause**: Google Chrome 115+ removed the old `--headless` flag. Your Chrome installation is too new for Remotion's default settings.

## The Solution

Added explicit Chrome flags for the **new headless mode**:

```javascript
// netlify/functions/render-chunk.js
await renderMedia({
  // ... other options
  browserExecutable: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  chromiumOptions: {
    // Use new headless mode (required for Chrome 115+)
    headless: 'new',
    // Additional flags for stability
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  }
});
```

## What Each Flag Does

| Flag | Purpose |
|------|---------|
| `headless: 'new'` | Use Chrome's new headless mode (115+) |
| `--no-sandbox` | Disable Chrome sandbox (needed in Docker/functions) |
| `--disable-setuid-sandbox` | Alternative sandbox disabling |
| `--disable-dev-shm-usage` | Use /tmp instead of /dev/shm (prevents memory issues) |
| `--disable-web-security` | Allow cross-origin resources (for video/images) |
| `--disable-features=IsolateOrigins,site-per-process` | Improve stability in headless |

## Timeout Fix

Also fixed the dev server timeout configuration:

```toml
# netlify.toml
[dev]
  functionsTimeout = 60  # Was "timeout" (wrong parameter)
```

The correct parameter is `functionsTimeout`, not just `timeout`.

## Chrome Versions

| Chrome Version | Headless Mode | Remotion Support |
|----------------|---------------|------------------|
| < 115 | `--headless` (old) | Default works ✅ |
| 115+ | `--headless=new` | Need explicit flag ⚠️ |
| Latest | `headless: 'new'` | This fix ✅ |

Your Chrome is likely 115+ (2023 or newer).

## Testing

1. **Restart server** (IMPORTANT - loads new netlify.toml):
   ```bash
   # Ctrl+C in terminal
   npm run dev
   ```

2. **Wait for full startup**:
   ```
   ⬥ Loaded function render-chunk
   ```

3. **Test in browser**:
   - Hard refresh: `Cmd+Shift+R`
   - Open Phase 6 Test Page
   - Production Mode ON
   - Click "Test Chunked Renderer"

## Expected Behavior

Now Chrome should launch successfully:
- ✅ No "Old Headless mode" error
- ✅ Browser starts in headless mode
- ✅ Rendering proceeds
- ✅ 60-second timeout (not 30s)

**Possible new errors**:
- Scene rendering issues (wrong data format)
- Missing composition "StudioChunk" (need to verify registration)
- Video/audio file loading errors
- Supabase upload errors

Each specific error = progress! We fix them one by one.

## Production Considerations

**Local Development** (this fix):
- ✅ 60s timeout for testing
- ✅ Uses your installed Chrome
- ✅ New headless mode

**Production Deployment**:
- Uses Chrome Headless Shell (bundled)
- 10s timeout limit (FREE tier)
- 3-second chunks fit perfectly
- Same chromiumOptions should work

## Alternative: Chrome Headless Shell

If this still fails, we can download the correct Chrome Headless Shell:

```bash
# Remotion will auto-download compatible version
npx remotion install
```

But the current fix (new headless mode) should work!

---

**Status**: 🌐 Chrome headless mode configured
**Next**: Test rendering with new flags
**Date**: 2025-02-06
