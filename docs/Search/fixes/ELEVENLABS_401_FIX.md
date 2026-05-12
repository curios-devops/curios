# Fix: ElevenLabs TTS 401 Unauthorized Error

## Problem
Avatar Search returns 401 Unauthorized when calling the `elevenlabs-tts` edge function.

## Root Cause
The Supabase edge function has **JWT verification enabled**, which blocks anonymous requests from the browser.

## Solution
Disable JWT verification for the `elevenlabs-tts` function in the Supabase dashboard.

## Steps to Fix

### Via Supabase Dashboard (Easiest Method)

1. **Open the function in Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions/elevenlabs-tts

2. **Navigate to function settings:**
   - Look for tabs at the top: "Code", "Details", "Settings", or similar
   - Click on the tab that shows configuration options

3. **Find JWT Verification setting:**
   - Look for one of these:
     - "Verify JWT" toggle/checkbox
     - "JWT Verification" switch
     - "Anonymous access" option
     - Under "Security" or "Authorization" section

4. **Disable JWT verification:**
   - Turn OFF the "Verify JWT" toggle
   - OR Enable "Allow anonymous access"
   - OR Uncheck "Require authentication"

5. **Save/Deploy:**
   - Click "Save" or "Deploy" button
   - Wait for deployment to complete

### Alternative: Via CLI (if you upgrade)

```bash
# Upgrade Supabase CLI
brew uninstall supabase
brew install supabase/tap/supabase

# Login
supabase login

# Deploy with --no-verify-jwt flag
supabase functions deploy elevenlabs-tts --no-verify-jwt --project-ref gpfccicfqynahflehpqo
```

### Alternative: Via Docker

```bash
docker run --rm -v "$PWD:/workspace" -w /workspace supabase/cli:latest \
  functions deploy elevenlabs-tts --no-verify-jwt --project-ref gpfccicfqynahflehpqo
```

## Verification

After disabling JWT verification, test the function:

```bash
# Run the test script
bash scripts/test-elevenlabs-direct.sh
```

Expected result: You should see audio data returned (base64-encoded MP3).

## How to Test in Browser

1. Navigate to: http://localhost:5173/avatar-search?q=test
2. Check browser console for logs
3. You should see:
   - ✅ `🎬 [ElevenLabs] Starting TTS via Supabase edge function`
   - ✅ `📡 [ElevenLabs] Edge function response: 200`
   - ✅ `✅ [ElevenLabs] Audio generated successfully`

## Technical Details

### Why JWT verification must be disabled

The `elevenlabs-tts` function is designed to be called directly from the browser with only the Supabase anon key. It does not require user authentication because:

1. The ElevenLabs API key is stored server-side (secure)
2. The function only performs TTS (no sensitive data access)
3. Rate limiting is handled by ElevenLabs API quota

### Security Considerations

Even with JWT verification disabled:
- ✅ The ElevenLabs API key remains server-side
- ✅ CORS headers restrict cross-origin access
- ✅ ElevenLabs API rate limits prevent abuse
- ✅ Input validation prevents injection attacks

## Related Files

- Edge function: `supabase/functions/elevenlabs-tts/index.ts`
- Client code: `src/services/search/avatar/services/elevenLabsAurora.ts`
- Config: `supabase/config.toml`
- Test script: `scripts/test-elevenlabs-direct.sh`
- Deploy script: `scripts/deploy-elevenlabs-tts.sh`

## Troubleshooting

### Still getting 401 after disabling JWT?

1. **Clear browser cache** and hard refresh (Cmd+Shift+R)
2. **Check if changes were saved** in Supabase dashboard
3. **Wait 30-60 seconds** for propagation
4. **Check Supabase function logs** for error details
5. **Verify the anon key** is correct in `.env`

### Function not found?

The function might not be deployed yet:
1. Check if it exists in dashboard: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions
2. If missing, you need to deploy it first (see deployment section above)

### Environment variable issues?

Check that `ELEVENLAB_API_KEY` is set in Supabase:
1. Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/settings/functions
2. Look for "Secrets" or "Environment Variables"
3. Verify `ELEVENLAB_API_KEY` exists and has the correct value

## Success Criteria

✅ Browser console shows `200` response from edge function
✅ Audio blob is created and object URL is generated
✅ Avatar displays with working audio playback
✅ No 401 errors in console

## Date
2026-03-07
