# Anam AI SDK Integration

## 📋 Overview

Successfully integrated Anam AI's official JavaScript SDK (`@anam-ai/js-sdk`) for real-time avatar streaming. This replaces the previous WebSocket-based approach with the official SDK that uses WebRTC for streaming.

## ✅ What's Been Done

### 1. SDK Installation
```bash
npm install @anam-ai/js-sdk
```

### 2. Updated Supabase Function: `get-anam-token`
**Location:** `supabase/functions/get-anam-token/index.ts`

**What it does:**
- Takes the ANAM_API_KEY from environment
- Calls Anam's session token endpoint: `https://api.anam.ai/v1/auth/session-token`
- Returns a short-lived session token to the frontend
- Configures the persona (avatar, voice, LLM, system prompt)

**Changes made:**
- ✅ Removed `async` keyword (no longer async since we return API key directly)
- ✅ Now properly creates session token via Anam API
- ✅ Configures persona with:
  - Avatar ID: `30fa96d0-26c4-4e55-94a0-517025942e18`
  - Voice ID: `6bfbe25a-979d-40f3-a92b-5394170af54b`
  - LLM: `gpt-4o-mini`

### 3. Created Anam Service
**Location:** `src/services/legacy-search/avatar/services/anamAvatarService.ts`

**Features:**
- ✅ Singleton service for managing Anam client
- ✅ `initialize()` - Gets session token and creates client
- ✅ `startStreaming(videoElementId)` - Streams avatar to video element
- ✅ `sendMessage(text)` - Sends text for avatar to speak
- ✅ `sendAudio(blob)` - Sends audio for audio passthrough mode
- ✅ `stop()` - Cleanup and disconnect
- ✅ `isReady()` - Check initialization status

### 4. Created Test Component
**Location:** `src/services/legacy-search/avatar/components/AnamAvatarTest.tsx`

**Features:**
- ✅ Simple UI to test Anam integration
- ✅ Connect/Disconnect buttons
- ✅ Video display area
- ✅ Text input to send messages to avatar
- ✅ Real-time status display
- ✅ Error handling and logging

### 5. Added Test Route
**Location:** `src/main.tsx`

**Route:** `/anam-test`

**Access:** http://localhost:8888/anam-test (dev) or http://localhost:5173/anam-test (Vite direct)

## 🚀 Next Steps: Deploy & Test

### Step 1: Deploy Updated Supabase Function

The `get-anam-token` function needs to be redeployed because we changed it from returning the API key directly to creating a session token.

**Option A: Deploy via Supabase Dashboard (Recommended)**
1. Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions
2. Find `get-anam-token` function
3. Click "Edit"
4. Copy the contents of `supabase/functions/get-anam-token/index.ts`
5. Paste and save
6. Wait for deployment to complete

**Option B: Test Deploy Script (if CLI issues resolved)**
```bash
./scripts/deploy-get-anam-token.sh
```

### Step 2: Test the Integration

1. **Start dev server** (already running):
   ```bash
   npm run dev
   ```

2. **Open test page**:
   ```
   http://localhost:8888/anam-test
   ```

3. **Test flow**:
   - Click "🔌 Connect" button
   - Wait for session token retrieval
   - Wait for avatar video stream to start
   - Type a message (e.g., "Hello, how are you?")
   - Click "📤 Send" to make avatar speak
   - Avatar should lip-sync and respond
   - Click "🛑 Disconnect" when done

4. **Check browser console** for detailed logs:
   - `🎭 [Anam] Getting session token from Supabase...`
   - `✅ [Anam] Session token received`
   - `🎭 [Anam] Initializing client...`
   - `✅ [Anam] Client initialized successfully`
   - `🎬 [Anam] Starting avatar stream to video element`
   - `✅ [Anam] Avatar streaming started`

### Step 3: Verify Supabase Function

Test the function directly with curl:

```bash
curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/get-anam-token \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Expected response:**
```json
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**If you get an error**, check:
- Supabase function logs for errors
- ANAM_API_KEY is set in Supabase secrets
- API key is valid and active

## 📚 Architecture

### Token Flow
```
Frontend Request
    ↓
Supabase Edge Function (get-anam-token)
    ↓
Anam API (/v1/auth/session-token)
    ↓
Session Token (short-lived, secure)
    ↓
Frontend (Anam SDK)
    ↓
WebRTC Connection to Anam
    ↓
Streaming Avatar Video
```

### Security
- ✅ API key stored only on server (Supabase secrets)
- ✅ Session tokens are short-lived (expire after ~1 hour)
- ✅ No API keys exposed in frontend code
- ✅ Token retrieved fresh for each session

## 🔍 Troubleshooting

### Issue: "Failed to get Anam session token"
**Cause:** Supabase function not updated or API key issue
**Fix:** Redeploy the function and verify ANAM_API_KEY secret

### Issue: "Anam API error: 401"
**Cause:** Invalid or expired API key
**Fix:** Check API key in Anam dashboard, update Supabase secret

### Issue: "Anam API error: 400"
**Cause:** Invalid persona configuration
**Fix:** Verify avatar ID, voice ID, and LLM ID are valid

### Issue: Video element not streaming
**Cause:** SDK connection issue or video element not found
**Fix:** Check browser console for errors, verify video element ID matches

### Issue: "sendTextMessage method not available"
**Cause:** SDK version issue or connection not established
**Fix:** Check SDK documentation for correct method names, ensure client is initialized

## 📖 References

- Anam AI Docs: https://docs.anam.ai
- Anam JS SDK: https://www.npmjs.com/package/@anam-ai/js-sdk
- Anam API: https://api.anam.ai/v1/auth/session-token

## 📁 Related Files

- `supabase/functions/get-anam-token/index.ts` - Session token endpoint
- `src/services/legacy-search/avatar/services/anamAvatarService.ts` - Service layer
- `src/services/legacy-search/avatar/components/AnamAvatarTest.tsx` - Test UI
- `src/main.tsx` - Routing (added `/anam-test` route)

## ⏭️ Integration with Avatar Search

Once testing is successful, integrate into the main avatar search flow:

1. Update `AvatarSearchResults.tsx` to use `anamAvatarService`
2. Stream avatar when TTS audio is ready
3. Display avatar video instead of static avatar
4. Add subtitle synchronization if needed
5. Handle graceful fallback to audio-only mode

## 🎯 Success Criteria

- ✅ SDK installed
- ✅ Service created
- ✅ Test component created
- ✅ Route added
- ⏳ **Supabase function deployed** (NEEDS DEPLOYMENT)
- ⏳ **Test page working** (NEEDS TESTING)
- ⏳ **Avatar streaming** (NEEDS VERIFICATION)
- ⏳ **Text-to-speech working** (NEEDS VERIFICATION)

---

**Status:** Ready for deployment and testing
**Last Updated:** 2026-03-11
**Author:** Claude Code
