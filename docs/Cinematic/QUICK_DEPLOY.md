# ⚡ Quick Deployment - add-scene-narration

**Function:** `add-scene-narration`
**Location:** `supabase/functions/add-scene-narration/index.ts`
**Purpose:** Burn TTS narration + text overlay into scene videos

---

## 🚀 Fastest Deployment (Supabase Dashboard)

### Step 1: Copy Function Code
```bash
# Copy the file contents
cat supabase/functions/add-scene-narration/index.ts | pbcopy
```

Or manually open: `supabase/functions/add-scene-narration/index.ts` and copy all contents (Cmd+A, Cmd+C)

### Step 2: Deploy via Dashboard

1. **Open:** https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions
2. **Click:** "Deploy a new function" (or "+ New Edge Function")
3. **Fill in:**
   - Name: `add-scene-narration`
   - Paste the copied code
4. **Settings:**
   - Memory: 512 MB
   - Timeout: 300 seconds
   - Verify JWT: ❌ Disabled
5. **Click:** "Deploy function"

### Step 3: Verify
Check that function shows as **🟢 Active**

---

## 🔑 Required Secrets (Already Set?)

Check these exist in Dashboard → Settings → Edge Functions → Secrets:

- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_STORAGE_BUCKET` (or defaults to "videos")

---

## 🧪 Quick Test

```bash
curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/add-scene-narration \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** `{"success":false,"error":"videoUrl is required"}`
**Means:** ✅ Function is working!

---

## ✅ Done!

That's it! The function is now deployed and ready to use.

Your cinematic videos will now have:
- 🎙️ TTS narration on each scene
- 📝 Text overlays
- 🎬 Full video stitching
- ⬇️ Download button

---

**Full guide:** See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions and troubleshooting.
