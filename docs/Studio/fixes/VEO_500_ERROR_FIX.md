# VEO 500 Error Fix

**Issue:** `POST https://[project].supabase.co/functions/v1/veo-generate-video 500 (Internal Server Error)`

**Location:** `VeoVertexProvider.ts:45`

---

## Root Cause

The VEO edge function is returning a 500 error, typically due to:
1. ❌ **Missing Vertex AI credentials** (most common)
2. ❌ Invalid Google Cloud Service Account configuration
3. ❌ Incorrect project ID or location settings
4. ❌ Vertex AI API not enabled in Google Cloud

---

## Quick Fix

### Step 1: Check Edge Function Logs

```bash
# View recent function logs
supabase functions logs veo-generate-video --tail 50

# Or in Supabase Dashboard:
# Navigate to: Edge Functions → veo-generate-video → Logs
```

**Look for these error messages:**
- `"Service Account credentials not configured"`
- `"Failed to get access token"`
- `"VERTEX_AI_SERVICE_ACCOUNT_EMAIL is not set"`
- `"VERTEX_AI_PRIVATE_KEY is not set"`

### Step 2: Verify Secrets are Set

```bash
# List all secrets
supabase secrets list

# Should show:
# VERTEX_AI_SERVICE_ACCOUNT_EMAIL
# VERTEX_AI_PRIVATE_KEY
```

If these are missing, you need to set them up.

---

## Full Setup Guide

### 1. Get Service Account Credentials from Google Cloud

#### Option A: Use Existing Service Account
```bash
# If you already have a service account JSON file
cat ~/path/to/curios-vertex-*.json

# Extract values:
# - "client_email" → VERTEX_AI_SERVICE_ACCOUNT_EMAIL
# - "private_key" → VERTEX_AI_PRIVATE_KEY
```

#### Option B: Create New Service Account
```bash
# 1. Set project
gcloud config set project curios-vertex

# 2. Create service account
gcloud iam service-accounts create veo-service-account \
  --display-name="VEO Video Generation Service Account"

# 3. Grant Vertex AI permissions
gcloud projects add-iam-policy-binding curios-vertex \
  --member="serviceAccount:veo-service-account@curios-vertex.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# 4. Create key
gcloud iam service-accounts keys create ~/veo-key.json \
  --iam-account=veo-service-account@curios-vertex.iam.gserviceaccount.com

# 5. View the key
cat ~/veo-key.json
```

### 2. Set Supabase Secrets

```bash
# Extract email from JSON
SERVICE_ACCOUNT_EMAIL=$(cat ~/veo-key.json | jq -r '.client_email')

# Extract private key from JSON (with proper escaping)
PRIVATE_KEY=$(cat ~/veo-key.json | jq -r '.private_key')

# Set secrets in Supabase
supabase secrets set VERTEX_AI_SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_EMAIL"
supabase secrets set VERTEX_AI_PRIVATE_KEY="$PRIVATE_KEY"

# Verify
supabase secrets list
```

**⚠️ Important:** The private key must include `\n` as literal characters, not actual newlines.

### 3. Redeploy Edge Function

```bash
# After setting secrets, redeploy the function
supabase functions deploy veo-generate-video

# Wait for deployment to complete
# Then test again
```

### 4. Verify Vertex AI API is Enabled

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com --project=curios-vertex

# Verify it's enabled
gcloud services list --enabled --project=curios-vertex | grep aiplatform
```

---

## Test the Fix

### Option 1: Test via Browser Console

```javascript
// In browser console, test the edge function directly
const { data, error } = await supabase.functions.invoke('veo-generate-video', {
  body: {
    action: 'generate',
    prompt: 'A beautiful sunset over the ocean',
    aspectRatio: '16:9'
  }
});

console.log('Response:', { data, error });

// Should return:
// { data: { success: true, operation: 'projects/.../operations/...' } }
```

### Option 2: Test via curl

```bash
# Get your anon key from Supabase dashboard
ANON_KEY="your-anon-key"
SUPABASE_URL="https://your-project.supabase.co"

curl -X POST "${SUPABASE_URL}/functions/v1/veo-generate-video" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "prompt": "A beautiful sunset over the ocean",
    "aspectRatio": "16:9"
  }'

# Should return:
# {"success":true,"operation":"projects/.../operations/...","message":"Video generation started..."}
```

---

## Common Errors & Solutions

### Error 1: "Service Account credentials not configured"

**Solution:**
```bash
# Set the secrets
supabase secrets set VERTEX_AI_SERVICE_ACCOUNT_EMAIL="your-email@project.iam.gserviceaccount.com"
supabase secrets set VERTEX_AI_PRIVATE_KEY="$(cat ~/veo-key.json | jq -r '.private_key')"
```

### Error 2: "Failed to get access token"

**Causes:**
- Invalid private key format
- Service account doesn't have Vertex AI permissions
- Project ID mismatch

**Solution:**
```bash
# 1. Verify service account has correct role
gcloud projects get-iam-policy curios-vertex \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:veo-service-account@curios-vertex.iam.gserviceaccount.com"

# 2. If missing, add the role
gcloud projects add-iam-policy-binding curios-vertex \
  --member="serviceAccount:veo-service-account@curios-vertex.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Error 3: "Request body must be valid JSON"

**Cause:** Empty or malformed request body

**Solution:**
Check that your frontend is sending the correct payload:
```typescript
const { data, error } = await supabase.functions.invoke('veo-generate-video', {
  body: {
    action: 'generate',          // Required
    prompt: 'your prompt',       // Required for 'generate'
    aspectRatio: '16:9'          // Optional
  }
});
```

### Error 4: "Vertex AI request failed (403)"

**Cause:** Vertex AI API not enabled or insufficient permissions

**Solution:**
```bash
# Enable the API
gcloud services enable aiplatform.googleapis.com --project=curios-vertex

# Grant admin role (if needed)
gcloud projects add-iam-policy-binding curios-vertex \
  --member="serviceAccount:veo-service-account@curios-vertex.iam.gserviceaccount.com" \
  --role="roles/aiplatform.admin"
```

---

## Debugging Checklist

- [ ] Secrets are set: `supabase secrets list`
- [ ] Service account email is correct format: `*@*.iam.gserviceaccount.com`
- [ ] Private key includes `\n` characters (not actual newlines)
- [ ] Vertex AI API is enabled: `gcloud services list --enabled | grep aiplatform`
- [ ] Service account has `roles/aiplatform.user` role
- [ ] Edge function is deployed: `supabase functions list`
- [ ] Project ID matches: `curios-vertex`
- [ ] Location is correct: `us-central1`

---

## Permanent Fix: Environment Check

Add this check to your cinematic service to provide better error messages:

```typescript
// In cinematicService.ts or a new file
export async function checkVeoConfiguration(): Promise<{
  isConfigured: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Test the edge function
  try {
    const { data, error } = await supabase.functions.invoke('veo-generate-video', {
      body: { action: 'check', operationName: 'test' }
    });

    if (error) {
      if (error.message?.includes('credentials not configured')) {
        errors.push('Vertex AI credentials are not configured in Supabase secrets.');
      } else {
        errors.push(`Edge function error: ${error.message}`);
      }
    }
  } catch (err) {
    errors.push(`Failed to connect to VEO service: ${err}`);
  }

  return {
    isConfigured: errors.length === 0,
    errors
  };
}
```

Then use it before generating videos:

```typescript
const { isConfigured, errors } = await checkVeoConfiguration();

if (!isConfigured) {
  console.error('VEO Configuration Errors:', errors);
  alert(`Video generation is not available:\n${errors.join('\n')}`);
  return;
}
```

---

## Related Documentation

- [VEO Video Generation Workflow](../guides/VEO_VIDEO_GENERATION_WORKFLOW.md)
- [Vertex AI Setup Guide](../guides/VEO_VERTEX_CONNECTION_2026.md)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)

---

## Support

If this guide doesn't resolve your issue:

1. **Check function logs:** `supabase functions logs veo-generate-video`
2. **Check browser console** for detailed error messages
3. **Verify Google Cloud Console** shows the service account exists
4. **Test authentication** with `gcloud auth list`

**Last Updated:** 2026-04-08
