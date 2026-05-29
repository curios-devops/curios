# Anam Avatar Deployment Checklist

**Project:** CuriosAI Avatar Search
**Date:** 2026-03-10
**Status:** Ready for Deployment

---

## Pre-Deployment Checklist

### ✅ Code Implementation
- [x] Anam Supabase edge function created
- [x] TTS pipeline refactored with Anam integration
- [x] Frontend updated to display Anam videos
- [x] Error handling and fallbacks implemented
- [x] Documentation written

### ✅ Configuration Files
- [x] `.env` contains ANAM_API_KEY
- [x] Supabase function code ready in `supabase/functions/anam-avatar/`
- [x] Deployment scripts created

### ⏳ Testing Files
- [x] Test page created: `public/test-anam.html`
- [ ] Test with real audio data
- [ ] Verify video playback

---

## Deployment Steps

### Step 1: Configure Anam API Key in Supabase

**Option A: Via Supabase Dashboard (Recommended)**
1. [ ] Go to https://app.supabase.com/project/gpfccicfqynahflehpqo
2. [ ] Navigate to: Settings → Edge Functions → Secrets
3. [ ] Click "Add Secret"
4. [ ] Name: `ANAM_API_KEY`
5. [ ] Value: `OGY2N2UxN2MtMmUxMS00MGM5LTg4N2UtZDNjM2NhZDNjMDIwOi9lMUEzTmdhZ1hoSEJIZlM4cUw1RjdtSUtHWW9tNVdpNFplZklpMzVPYXM9`
6. [ ] Click "Save"

**Option B: Via Supabase CLI (if compatible)**
```bash
supabase secrets set ANAM_API_KEY="OGY2N2UxN2MtMmUxMS00MGM5LTg4N2UtZDNjM2NhZDNjMDIwOi9lMUEzTmdhZ1hoSEJIZlM4cUw1RjdtSUtHWW9tNVdpNFplZklpMzVPYXM9"
```

### Step 2: Deploy Anam Function

**Option A: Via Supabase Dashboard (Recommended)**
1. [ ] Go to: Edge Functions → Create Function
2. [ ] Name: `anam-avatar`
3. [ ] Copy code from `supabase/functions/anam-avatar/index.ts`
4. [ ] Paste into editor
5. [ ] Click "Deploy"
6. [ ] Go to function settings
7. [ ] Enable "No JWT verification"
8. [ ] Save settings

**Option B: Via Supabase CLI**
```bash
supabase functions deploy anam-avatar --no-verify-jwt
```

**Option C: Via Docker**
```bash
docker run --rm -it \
  -v $(pwd):/workspace \
  -w /workspace \
  supabase/cli:latest \
  supabase functions deploy anam-avatar --no-verify-jwt
```

### Step 3: Verify Deployment

1. [ ] Check function appears in Supabase Dashboard
2. [ ] Verify function URL: `https://gpfccicfqynahflehpqo.supabase.co/functions/v1/anam-avatar`
3. [ ] Check function logs for any errors

---

## Testing Checklist

### Unit Testing

#### Test 1: Anam Function Healthcheck
```bash
curl -X POST \
  https://gpfccicfqynahflehpqo.supabase.co/functions/v1/anam-avatar \
  -H 'Content-Type: application/json' \
  -d '{"audioBase64": ""}'
```
- [ ] Should return 400 error (missing audio)
- [ ] Confirms function is deployed and responding

#### Test 2: TTS → Anam Pipeline
1. [ ] Open `http://localhost:5173/test-anam.html`
2. [ ] Click "Generate TTS Audio"
3. [ ] Wait for audio to generate (~2-5 seconds)
4. [ ] Audio player should appear
5. [ ] Click "Send to Anam"
6. [ ] Wait for video generation (~10-30 seconds)
7. [ ] Video should appear and play automatically

**Expected Results:**
- [ ] ✅ Audio generates successfully
- [ ] ✅ Audio can be played
- [ ] ✅ Anam function receives audio
- [ ] ✅ Video URL or base64 returned
- [ ] ✅ Video displays and plays

**If errors:**
- [ ] Check browser console
- [ ] Check Supabase function logs
- [ ] Verify ANAM_API_KEY is correct
- [ ] Test Anam API key directly

### Integration Testing

#### Test 3: Full Avatar Search Workflow
1. [ ] Start dev server: `npm run dev`
2. [ ] Navigate to home page
3. [ ] Click avatar button (left button in search box)
4. [ ] Type query: "What is machine learning?"
5. [ ] Click equalizer button (right button)
6. [ ] Wait for complete generation (~20-40 seconds)

**Expected Results:**
- [ ] ✅ Search executes (Brave or Tavily)
- [ ] ✅ Narrative text appears
- [ ] ✅ Status shows "Generating avatar and voice..."
- [ ] ✅ Audio plays
- [ ] ✅ Video displays (if Anam succeeds)
- [ ] ✅ OR audio visualization (if Anam fails - acceptable fallback)
- [ ] ✅ Subtitles appear
- [ ] ✅ Controls work (play/pause, subtitles)

#### Test 4: Voice Input Workflow
1. [ ] On home page, click mic button
2. [ ] Grant microphone permission
3. [ ] Say: "Tell me about artificial intelligence"
4. [ ] Wait for transcription
5. [ ] Text should appear in search box
6. [ ] Click equalizer button
7. [ ] Complete generation should work

**Expected Results:**
- [ ] ✅ Voice recording works
- [ ] ✅ Whisper transcription accurate
- [ ] ✅ Text appears in search box
- [ ] ✅ Avatar search triggers
- [ ] ✅ Video/audio generates

### Browser Compatibility Testing

#### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Test for each:**
- [ ] Video playback works
- [ ] Audio playback works
- [ ] UI responsive
- [ ] No console errors

#### Mobile Browsers
- [ ] Safari (iOS)
- [ ] Chrome (iOS)
- [ ] Chrome (Android)
- [ ] Samsung Internet

**Test for each:**
- [ ] Voice recording works
- [ ] Video playback works
- [ ] Audio playback works
- [ ] Touch controls work
- [ ] Layout responsive

### Error Scenario Testing

#### Test 5: TTS Fallback
1. [ ] Temporarily disable ElevenLabs API key
2. [ ] Trigger avatar search
3. [ ] Should fall back to OpenAI TTS
4. [ ] Audio should still generate
5. [ ] Anam should still work

**Expected:**
- [ ] ✅ OpenAI TTS activates
- [ ] ✅ Audio generates
- [ ] ✅ Anam receives audio
- [ ] ✅ Video generates

#### Test 6: Anam Fallback
1. [ ] Temporarily disable Anam API key
2. [ ] Trigger avatar search
3. [ ] Should fall back to audio-only
4. [ ] Audio visualization should display

**Expected:**
- [ ] ✅ TTS works
- [ ] ✅ Anam fails gracefully
- [ ] ⚠️ No error shown to user
- [ ] ✅ Audio-only visualization displays
- [ ] ✅ Message: "Avatar generation in progress..."

#### Test 7: Complete Failure
1. [ ] Disable all API keys
2. [ ] Trigger avatar search
3. [ ] Should show error message

**Expected:**
- [ ] ❌ Error message displays
- [ ] ✅ No crash or blank page
- [ ] ✅ User can retry

---

## Performance Benchmarks

### Timing Targets
- [ ] Search: < 5 seconds
- [ ] LLM narrative: < 10 seconds
- [ ] TTS audio: < 5 seconds
- [ ] Anam video: < 30 seconds
- [ ] **Total: < 50 seconds**

### Size Targets
- [ ] Audio file: < 500 KB
- [ ] Video file: < 10 MB
- [ ] Page load: < 2 seconds

### Measure Actual Performance
- [ ] Record average search time: _____ seconds
- [ ] Record average LLM time: _____ seconds
- [ ] Record average TTS time: _____ seconds
- [ ] Record average Anam time: _____ seconds
- [ ] Record average total time: _____ seconds

---

## Production Readiness Checklist

### Security
- [ ] ANAM_API_KEY stored in Supabase secrets (not in frontend)
- [ ] ELEVENLAB_API_KEY stored in Supabase secrets
- [ ] No JWT verification disabled only for necessary functions
- [ ] CORS headers configured correctly

### Monitoring
- [ ] Supabase function logs accessible
- [ ] Browser console logs working
- [ ] Error tracking set up (if applicable)

### Documentation
- [ ] Architecture documented: `docs/Search/architecture/ANAM_AVATAR_WORKFLOW.md`
- [ ] Deployment documented: `docs/Search/deployment/ANAM_DEPLOYMENT_MANUAL.md`
- [ ] Summary documented: `docs/Search/architecture/ANAM_REFACTOR_SUMMARY.md`
- [ ] This checklist available: `ANAM_DEPLOYMENT_CHECKLIST.md`

### Backup Plan
- [ ] Audio-only fallback working
- [ ] OpenAI TTS fallback working
- [ ] Tavily search fallback working
- [ ] Error messages user-friendly

---

## Post-Deployment

### Immediate (Within 24 Hours)
- [ ] Monitor function logs for errors
- [ ] Check error rates
- [ ] Verify user reports (if any)
- [ ] Test on multiple devices

### Short-term (Within 1 Week)
- [ ] Analyze usage metrics
- [ ] Measure performance benchmarks
- [ ] Check API usage/costs
- [ ] Gather user feedback
- [ ] Fix any critical bugs

### Medium-term (Within 1 Month)
- [ ] Implement subtitle synchronization
- [ ] Add download video feature
- [ ] Optimize performance
- [ ] Add analytics tracking
- [ ] Implement A/B testing

---

## Troubleshooting Guide

### Function Not Found (404)
**Problem:** Anam function not deployed
**Solution:**
1. Verify function in Supabase Dashboard
2. Check function name is exactly `anam-avatar`
3. Redeploy if needed

### Unauthorized (401)
**Problem:** ANAM_API_KEY invalid or not set
**Solution:**
1. Check secret in Supabase Dashboard
2. Verify key format (should be base64-like string)
3. Test key with Anam API directly
4. Regenerate key if needed

### Internal Server Error (500)
**Problem:** Function crashed or API error
**Solution:**
1. Check Supabase function logs
2. Look for error messages
3. Verify Anam API is responding
4. Check audio format/size
5. Test with smaller audio sample

### Video Not Playing
**Problem:** Browser can't play video format
**Solution:**
1. Check video MIME type (`video/mp4`)
2. Verify video URL/blob is valid
3. Test in different browser
4. Check for CORS errors
5. Try re-encoding video

### Audio/Video Out of Sync
**Problem:** Playback timing issues
**Solution:**
1. Currently not critical (video includes audio)
2. Future: implement proper sync
3. Fallback: use audio-only mode

---

## Success Metrics

### Technical Metrics
- [ ] Function deployment success: ✅/❌
- [ ] Anam API connectivity: ✅/❌
- [ ] Video generation success rate: ____%
- [ ] Average generation time: _____ seconds
- [ ] Error rate: ____%

### User Experience Metrics
- [ ] User can complete full workflow: ✅/❌
- [ ] Video plays successfully: ✅/❌
- [ ] Audio fallback works: ✅/❌
- [ ] Mobile experience acceptable: ✅/❌
- [ ] No critical bugs: ✅/❌

---

## Sign-off

- [ ] Code reviewed and approved
- [ ] Deployment completed successfully
- [ ] Testing completed and passed
- [ ] Documentation updated
- [ ] Team notified
- [ ] Production ready ✅

**Deployed by:** _______________
**Date:** _______________
**Sign-off:** _______________

---

## Additional Notes

**Known Issues:**
- Supabase CLI incompatible with macOS 10.16 → Use dashboard deployment
- Anam API rate limits unknown → Monitor usage
- Video generation can take 10-30 seconds → Show progress indicator

**Future Improvements:**
- Word-level subtitle synchronization
- Multiple avatar personas
- Video caching for repeated queries
- Real-time streaming generation
- Multi-language support

**Contact:**
- Technical questions: See docs in `docs/Search/`
- Supabase issues: Check function logs in dashboard
- Anam API issues: Contact Anam support

---

**This checklist should be completed before considering the Anam avatar feature production-ready.**
