# Quick Deploy Guide: Anam Avatar Function

## ✅ What's Ready
- Function code: `supabase/functions/anam-avatar/index.ts`
- Import path fixed (removed problematic import)
- Config updated: `supabase/config.toml`
- API key in `.env`: `ANAM_API_KEY`

## 🚀 Deployment Method: Supabase Dashboard (Easiest)

### Step 1: Configure API Key Secret

1. Go to: https://app.supabase.com/project/gpfccicfqynahflehpqo/settings/vault
2. Click **"Add Secret"**
3. Fill in:
   - **Name:** `ANAM_API_KEY`
   - **Value:** `OGY2N2UxN2MtMmUxMS00MGM5LTg4N2UtZDNjM2NhZDNjMDIwOi9lMUEzTmdhZ1hoSEJIZlM4cUw1RjdtSUtHWW9tNVdpNFplZklpMzVPYXM9`
4. Click **"Save"**

### Step 2: Deploy Function

**Option A: Via Dashboard (Recommended - No Docker/CLI needed)**

1. Go to: https://app.supabase.com/project/gpfccicfqynahflehpqo/functions
2. Click **"Create a new function"** (or **"Deploy new version"** if exists)
3. **Function name:** `anam-avatar`
4. Copy the entire content from `supabase/functions/anam-avatar/index.ts`
5. Paste into the editor
6. Click **"Deploy function"**
7. Go to function settings:
   - Disable **"Enforce JWT"**
   - Click **"Save"**

**Option B: Via CLI (Requires Docker Desktop)**

If you have Docker Desktop running:

```bash
# Start Docker Desktop first, then run:
./scripts/deploy-anam-avatar.sh
```

### Step 3: Verify Deployment

Test the function with curl:

```bash
curl -X POST \
  https://gpfccicfqynahflehpqo.supabase.co/functions/v1/anam-avatar \
  -H 'Content-Type: application/json' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNDIyMDYsImV4cCI6MjA1MDcxODIwNn0.wLnIXxThhq144sQpUFzLd_ifimgr1oetMwvchDmMF84' \
  -d '{"audioBase64": ""}'
```

Expected: Error response (400) saying "Audio data is required" - this confirms the function is deployed and working.

### Step 4: Test Full Flow

**Using Test Page:**
```bash
npm run dev
# Open: http://localhost:5173/test-anam.html
# Click: "1️⃣ Generate TTS Audio"
# Click: "2️⃣ Send to Anam"
# Wait for video to generate
```

**Using Avatar Search:**
```bash
npm run dev
# Open: http://localhost:5173
# Click avatar button (left button in search box)
# Type: "What is artificial intelligence?"
# Click equalizer button
# Wait 20-40 seconds for full generation
```

---

## 🔍 Troubleshooting

### Function Not Found
- Verify function name is exactly `anam-avatar` (with hyphen)
- Check function appears in Supabase Dashboard
- Refresh the functions list

### 401 Unauthorized / API Key Error
- Verify secret `ANAM_API_KEY` is set in Vault
- Check key value matches the one in `.env`
- Redeploy function after setting secret

### 500 Internal Server Error
- Check function logs in Dashboard
- Verify Anam API key is valid
- Test Anam API directly if possible

### Video Not Generating
- Check browser console for errors
- Verify audio is being sent (base64)
- Check Supabase function logs
- Anam API may be slow (10-30 seconds normal)

### Docker Error (CLI Deployment)
**Solution:** Use Dashboard deployment instead (no Docker needed)

---

## 📋 Quick Checklist

- [ ] ANAM_API_KEY added to Supabase Vault
- [ ] Function code copied to Dashboard
- [ ] Function deployed successfully
- [ ] JWT verification disabled
- [ ] Test with curl (400 error = working)
- [ ] Test with test page
- [ ] Test full avatar search flow

---

## 📞 Next Steps After Deployment

1. Test with sample audio
2. Monitor function logs
3. Test on mobile devices
4. Optimize if needed
5. Document any issues

---

**Estimated deployment time:** 5-10 minutes via Dashboard

**Note:** The CLI deployment requires Docker Desktop to be running. Dashboard deployment is simpler and doesn't require any local tools.
