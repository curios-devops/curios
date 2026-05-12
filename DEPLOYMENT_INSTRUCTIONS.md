# 🚀 Deployment Instructions - VEO Error Fix

## What Was Fixed

1. ✅ **Enhanced error handling** in VeoVertexProvider (client-side)
2. ✅ **Enhanced error logging** in veo-generate-video Edge Function (server-side)
3. ✅ **Fixed TypeScript error** (`process.env` → `Deno.env`)
4. ✅ **Updated loading message** ("Preparing your video...")
5. ✅ **Created diagnostic tools** and troubleshooting guides

---

## 📦 Deploy the Fixes

### Step 1: Deploy the Enhanced Edge Function

```bash
# Navigate to project root
cd /Users/marcelo/Documents/Curios

# Deploy the veo-generate-video function with enhanced logging
supabase functions deploy veo-generate-video

# Wait for deployment to complete (usually 10-30 seconds)
```

### Step 2: Verify Deployment

```bash
# Check function logs to confirm deployment
supabase functions logs veo-generate-video --tail 5
```

### Step 3: Test the Function

Option A - Quick test via script:
```bash
# Run the diagnostic script
./scripts/diagnose-veo-error.sh
```

Option B - Manual test:
```bash
# Test via curl (replace YOUR_ANON_KEY)
curl -X POST "https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"generate","prompt":"A beautiful sunset over the ocean","aspectRatio":"16:9"}'
```

Expected success response:
```json
{
  "success": true,
  "operation": "projects/curios-vertex/locations/us-central1/operations/...",
  "message": "Video generation started. Use 'check' action to poll status."
}
```

Expected error response (if credentials issue):
```json
{
  "success": false,
  "error": "Failed to get access token: ..."
}
```

---

## 🔍 If You Still Get 500 Error

### The enhanced logs will now show the EXACT error. Check them:

```bash
supabase functions logs veo-generate-video --tail 20
```

Look for these specific messages in the logs:

#### 1. **Missing Credentials**
```
MISSING: VERTEX_AI_SERVICE_ACCOUNT_EMAIL secret
MISSING: VERTEX_AI_PRIVATE_KEY secret
```

**Fix:**
```bash
supabase secrets set VERTEX_AI_SERVICE_ACCOUNT_EMAIL="your-email@curios-vertex.iam.gserviceaccount.com"
supabase secrets set VERTEX_AI_PRIVATE_KEY="$(cat ~/veo-key.json | jq -r '.private_key')"
```

#### 2. **Failed to get access token**
```
Error: Failed to get access token: invalid_grant
```

**Cause:** Private key format is incorrect

**Fix:**
```bash
# Re-extract and re-set the private key
PRIVATE_KEY=$(cat ~/veo-key.json | jq -r '.private_key')
supabase secrets set VERTEX_AI_PRIVATE_KEY="$PRIVATE_KEY"

# Redeploy
supabase functions deploy veo-generate-video
```

#### 3. **Vertex AI request failed (403)**
```
Error: Vertex AI request failed (403): Permission denied
```

**Cause:** Service account doesn't have permissions OR API not enabled

**Fix:**
```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com --project=curios-vertex

# Grant permissions
SERVICE_ACCOUNT_EMAIL=$(cat ~/veo-key.json | jq -r '.client_email')
gcloud projects add-iam-policy-binding curios-vertex \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/aiplatform.user"
```

---

## 📊 What The Enhanced Logging Provides

### Before (generic error):
```
POST /functions/v1/veo-generate-video 500
```

### After (detailed error):
```
Error in veo-generate-video: Error: Failed to get access token: invalid_grant
Detailed error info: {
  "message": "Failed to get access token: invalid_grant",
  "stack": "...",
  "type": "Error",
  "timestamp": "2026-04-08T22:03:15.123Z"
}
```

This tells you EXACTLY what's wrong!

---

## 🛠️ Diagnostic Tools Available

### 1. Automated Diagnostic Script
```bash
./scripts/diagnose-veo-error.sh
```
- Checks secrets
- Verifies Google Cloud setup
- Shows recent logs
- Tests the function

### 2. Manual Redeploy Script
```bash
./scripts/redeploy-veo-with-debug.sh
```
- Verifies secrets before deploying
- Deploys with enhanced logging
- Shows test commands

### 3. Documentation
- **[VEO_500_ERROR_FIX.md](docs/Studio/fixes/VEO_500_ERROR_FIX.md)** - Complete troubleshooting guide
- **[DEBUG_VEO_500.md](DEBUG_VEO_500.md)** - Live debugging steps
- **[FIXES_APPLIED.md](FIXES_APPLIED.md)** - Summary of all fixes

---

## ✅ Deployment Checklist

- [ ] Edge function deployed: `supabase functions deploy veo-generate-video`
- [ ] TypeScript errors resolved (no `process.env`)
- [ ] Logs show enhanced error messages
- [ ] Secrets are set: `supabase secrets list`
- [ ] Test request made
- [ ] Logs checked for specific error details
- [ ] Issue identified and resolved based on logs

---

## 🎯 Expected Outcome

After deploying the enhanced function and checking logs, you'll see ONE of these:

### ✅ Success
```json
{"success": true, "operation": "projects/..."}
```
→ Function is working! Video generation has started.

### ❌ Credentials Missing
```
MISSING: VERTEX_AI_SERVICE_ACCOUNT_EMAIL secret
```
→ Set the secrets using commands above

### ❌ Authentication Failed
```
Error: Failed to get access token: invalid_grant
```
→ Re-set VERTEX_AI_PRIVATE_KEY with correct format

### ❌ Permission Denied
```
Error: Vertex AI request failed (403)
```
→ Enable API and grant permissions

---

## 📞 Next Steps

1. **Deploy the function** (see Step 1 above)
2. **Try generating a video** in your app
3. **Check the logs immediately**: `supabase functions logs veo-generate-video --tail 20`
4. **Share the exact error message** from the logs
5. We'll fix the specific issue based on the detailed error

---

**The enhanced logging will tell us EXACTLY what's wrong!** 🎯
