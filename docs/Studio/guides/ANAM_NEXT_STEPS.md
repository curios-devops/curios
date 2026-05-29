# 🎭 Anam Avatar Integration - Next Steps

## ✅ What's Been Completed

### 1. Discovered Correct Architecture
- ❌ **Wrong approach:** Direct WebSocket to `wss://api.anam.ai/v1/streaming` (got 404 error)
- ✅ **Correct approach:** Use official `@anam-ai/js-sdk` with WebRTC streaming
- ✅ Anam uses **session tokens** (not raw API keys) for production security

### 2. Installed Anam SDK
```bash
npm install @anam-ai/js-sdk
```
- ✅ Package installed successfully
- ✅ No dependencies conflicts

### 3. Updated `get-anam-token` Function
**File:** `supabase/functions/get-anam-token/index.ts`

**Changes:**
- ✅ Now calls Anam's `/v1/auth/session-token` endpoint
- ✅ Creates session token with persona configuration
- ✅ Returns `{ sessionToken: "..." }` instead of raw API key
- ✅ Fixed linting warning (removed unnecessary `async`)

**Persona Configuration:**
```typescript
{
  name: 'CuriosAI Assistant',
  avatarId: '30fa96d0-26c4-4e55-94a0-517025942e18',
  voiceId: '6bfbe25a-979d-40f3-a92b-5394170af54b',
  llmId: 'gpt-4o-mini',
  systemPrompt: "[STYLE] Reply in natural speech without formatting..."
}
```

### 4. Created Anam Service Layer
**File:** `src/services/search/avatar/services/anamAvatarService.ts`

**Methods:**
- ✅ `initialize()` - Gets session token, creates Anam client
- ✅ `startStreaming(videoElementId)` - Starts avatar stream to video element
- ✅ `sendMessage(text)` - Sends text for avatar to speak
- ✅ `sendAudio(blob)` - Sends audio (for audio passthrough mode)
- ✅ `stop()` - Cleanup and disconnect
- ✅ `isReady()` - Check if client is initialized

### 5. Created Test Component
**File:** `src/services/search/avatar/components/AnamAvatarTest.tsx`

**Features:**
- ✅ Video display area
- ✅ Connect/Disconnect buttons
- ✅ Text input to send messages
- ✅ Status indicator (connected/disconnected)
- ✅ Error display
- ✅ Comprehensive logging

### 6. Added Test Route
**File:** `src/main.tsx`

**Route:** `/anam-test`
**URL:** http://localhost:8888/anam-test

---

## 🚀 What You Need to Do Now

### Step 1: Deploy Updated Supabase Function ⚠️ REQUIRED

The `get-anam-token` function **MUST be redeployed** because it now creates session tokens instead of returning the raw API key.

#### Option A: Deploy via Supabase Dashboard (RECOMMENDED)

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions
   ```

2. **Find and edit `get-anam-token` function**

3. **Copy the updated code:**
   - Open: `supabase/functions/get-anam-token/index.ts` (in your local project)
   - Select all and copy

4. **Paste and deploy:**
   - Paste the code in Supabase dashboard
   - Click "Deploy"
   - Wait for confirmation

#### Option B: Deploy via CLI (if you can)

```bash
./scripts/deploy-get-anam-token.sh
```

**Note:** This might require Docker. If it fails, use Option A (Dashboard).

---

### Step 2: Test the Deployment

Test the function with curl to verify it's returning a session token:

```bash
curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/get-anam-token \
  -H 'Content-Type: application/json' \
  -d '{}'
```

#### ✅ Expected Response (Success):
```json
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
}
```
(Your token will be different and much longer)

#### ❌ Possible Errors:

**Error: `{"error":"Anam API error: 401"}`**
- **Cause:** Invalid ANAM_API_KEY
- **Fix:** Check API key in Supabase secrets, verify it's valid in Anam dashboard

**Error: `{"error":"Anam API error: 400"}`**
- **Cause:** Invalid persona configuration
- **Fix:** Verify avatar ID, voice ID are correct in Anam docs

**Error: `{"error":"Anam API key not configured"}`**
- **Cause:** ANAM_API_KEY not set in Supabase
- **Fix:** Run `npx supabase@1.200.3 secrets set ANAM_API_KEY="your-key"`

---

### Step 3: Test in Browser

1. **Open the test page:**
   ```
   http://localhost:8888/anam-test
   ```
   (Your dev server is already running)

2. **Click "🔌 Connect"**
   - Should show "Connecting..." briefly
   - Check browser console for logs:
     ```
     🎭 [Anam] Getting session token from Supabase...
     ✅ [Anam] Session token received
     🎭 [Anam] Initializing client...
     ✅ [Anam] Client initialized successfully
     🎬 [Anam] Starting avatar stream to video element
     ✅ [Anam] Avatar streaming started
     ```

3. **Wait for avatar video to appear**
   - Video should start streaming in the display area
   - Avatar should be visible and animated

4. **Send a test message:**
   - Type: "Hello! This is a test."
   - Click "📤 Send"
   - Avatar should lip-sync and speak the message

5. **Click "🛑 Disconnect"**
   - Video should stop
   - Status should change to "Disconnected"

---

## 🔍 Troubleshooting Guide

### Browser Console Shows: "Failed to get Anam session token"
**Issue:** Supabase function call failed
**Check:**
1. Is the function deployed? (curl test above)
2. Are there CORS errors in Network tab?
3. Check Supabase function logs in dashboard

### Browser Console Shows: "Anam client not initialized"
**Issue:** SDK initialization failed
**Check:**
1. Was session token received? (check earlier logs)
2. Is the session token valid? (not expired)
3. Check SDK version: `npm list @anam-ai/js-sdk`

### Video Element Not Streaming
**Issue:** SDK stream connection failed
**Check:**
1. Is video element ID correct? (should be `anam-avatar-video`)
2. Are there WebRTC errors in console?
3. Check browser permissions for camera/microphone
4. Try different browser (Chrome recommended)

### Avatar Not Speaking
**Issue:** `sendTextMessage` method issue
**Check:**
1. Is client connected? (check status indicator)
2. Check SDK documentation for correct method names
3. Try logging `anamClient` object to see available methods
4. Check Anam API status

---

## 📚 Documentation Created

1. **Integration Guide:**
   - `docs/Search/architecture/ANAM_SDK_INTEGRATION.md`
   - Complete technical documentation

2. **Deployment Script:**
   - `scripts/deploy-get-anam-token.sh`
   - Automated deployment (if CLI works)

3. **Test WebSocket (obsolete):**
   - `public/test-anam-websocket.html`
   - Can be deleted (was for WebSocket approach)
   - `scripts/test-anam-websocket.js`
   - Can be deleted (was for WebSocket approach)

---

## ⏭️ After Successful Test

Once the test page works correctly, integrate into main avatar search:

1. **Update `AvatarSearchResults.tsx`:**
   ```typescript
   import { anamAvatarService } from '../services/anamAvatarService';

   // When TTS audio is ready:
   await anamAvatarService.initialize();
   await anamAvatarService.startStreaming('avatar-video-element');
   ```

2. **Update `AvatarDisplay.tsx`:**
   - Add video element with ID for streaming
   - Show Anam video instead of static avatar
   - Keep audio-only fallback

3. **Test full workflow:**
   - Search query → LLM → TTS → Anam avatar
   - Verify subtitles sync with avatar speech
   - Verify graceful fallback to audio-only

---

## 🎯 Success Checklist

- [x] SDK installed
- [x] Service created with all methods
- [x] Test component created
- [x] Test route added to main.tsx
- [x] Documentation written
- [x] Deployment script created
- [ ] **Supabase function deployed** ⚠️ YOU NEED TO DO THIS
- [ ] **curl test passes** ⚠️ TEST AFTER DEPLOYMENT
- [ ] **Browser test works** ⚠️ TEST AFTER DEPLOYMENT
- [ ] **Avatar streams video** ⚠️ VERIFY AFTER DEPLOYMENT
- [ ] **Text-to-speech works** ⚠️ VERIFY AFTER DEPLOYMENT
- [ ] Integration with main search flow
- [ ] End-to-end testing

---

## 🆘 If You Need Help

**Check browser console for detailed logs:**
- All Anam operations are logged with 🎭 prefix
- Errors are logged with ❌ prefix
- Success is logged with ✅ prefix

**Check Supabase function logs:**
```
https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/logs/edge-functions
```

**Check Anam API status:**
```
https://status.anam.ai
```

---

**Current Status:** ✅ Code ready, ⚠️ waiting for Supabase deployment

**Next Action:** Deploy `get-anam-token` function via Supabase Dashboard

**Test URL:** http://localhost:8888/anam-test

**Expected Result:** Streaming avatar video with lip-synced speech

---

**Good luck! 🚀**
