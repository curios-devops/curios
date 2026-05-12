# Debug VEO 500 Error - Live Investigation

## Current Status
- ✅ Secrets ARE set (per user confirmation)
- ❌ Still getting 500 error
- Response content_length: 711 bytes (there's an error message)

## Need to Check

### 1. Get Full Error Message from Logs
```bash
# Get the actual error text from function logs
supabase functions logs veo-generate-video --tail 20 --output pretty

# Or in Supabase Dashboard:
# Edge Functions → veo-generate-video → Logs → Find this execution_id: 7eaafeb1-81e6-422f-9c74-5c53448653bb
```

### 2. Common Issues After Secrets are Set

#### Issue A: Private Key Format Problem
The private key might have incorrect newline handling.

**Check:**
```bash
# View your current secret (shows first few chars)
supabase secrets list

# The VERTEX_AI_PRIVATE_KEY should contain literal \n characters, not actual newlines
```

**Fix:**
```bash
# Correct way to set the private key
PRIVATE_KEY=$(cat ~/veo-key.json | jq -r '.private_key' | sed 's/$/\\n/' | tr -d '\n')

# Set it properly
supabase secrets set VERTEX_AI_PRIVATE_KEY="$PRIVATE_KEY"

# Redeploy
supabase functions deploy veo-generate-video
```

#### Issue B: Service Account Permissions
The service account might not have the correct permissions.

**Check:**
```bash
# Get the service account email
SERVICE_ACCOUNT_EMAIL=$(supabase secrets get VERTEX_AI_SERVICE_ACCOUNT_EMAIL)

# Check its permissions
gcloud projects get-iam-policy curios-vertex \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SERVICE_ACCOUNT_EMAIL}"
```

**Expected output should include:**
```
role: roles/aiplatform.user
```

**Fix:**
```bash
# Add the required role
gcloud projects add-iam-policy-binding curios-vertex \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/aiplatform.user"
```

#### Issue C: Vertex AI API Not Enabled
**Check:**
```bash
gcloud services list --enabled --project=curios-vertex | grep aiplatform
```

**Expected:** Should show `aiplatform.googleapis.com`

**Fix:**
```bash
gcloud services enable aiplatform.googleapis.com --project=curios-vertex
```

#### Issue D: Invalid Project ID or Location
The function has hardcoded:
- PROJECT_ID: `curios-vertex`
- LOCATION: `us-central1`

**Check if this matches your actual project:**
```bash
gcloud config get-value project
```

If different, need to update the edge function code.

### 3. Test Authentication Locally

```bash
# Extract credentials from secrets
SERVICE_ACCOUNT_EMAIL=$(supabase secrets get VERTEX_AI_SERVICE_ACCOUNT_EMAIL)

# Create a test JSON key file
cat > /tmp/test-key.json <<EOF
{
  "type": "service_account",
  "project_id": "curios-vertex",
  "private_key_id": "test",
  "private_key": "$(supabase secrets get VERTEX_AI_PRIVATE_KEY | sed 's/\\n/\n/g')",
  "client_email": "$SERVICE_ACCOUNT_EMAIL",
  "client_id": "test",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
}
EOF

# Try to authenticate
gcloud auth activate-service-account --key-file=/tmp/test-key.json

# If this fails, the private key format is wrong
```

### 4. Direct Test of Edge Function

```bash
# Test with proper auth
curl -X POST "https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "prompt": "A beautiful sunset over the ocean",
    "aspectRatio": "16:9"
  }' \
  -v

# This will show the full error response
```

## Most Likely Issues (in order)

1. **Private Key Format** (80% probability)
   - The `\n` characters in the private key are not being handled correctly
   - Solution: Re-set the secret with proper escaping

2. **Service Account Permissions** (15% probability)
   - Missing `roles/aiplatform.user` role
   - Solution: Add IAM binding

3. **API Not Enabled** (5% probability)
   - Vertex AI API not enabled in the project
   - Solution: Enable the API

## Quick Fix Commands (Run in Order)

```bash
# 1. Re-extract and re-set private key with correct format
PRIVATE_KEY=$(cat ~/veo-key.json | jq -r '.private_key')
supabase secrets set VERTEX_AI_PRIVATE_KEY="$PRIVATE_KEY"

# 2. Ensure service account has permissions
SERVICE_ACCOUNT_EMAIL=$(cat ~/veo-key.json | jq -r '.client_email')
gcloud projects add-iam-policy-binding curios-vertex \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/aiplatform.user"

# 3. Ensure API is enabled
gcloud services enable aiplatform.googleapis.com --project=curios-vertex

# 4. Redeploy function
supabase functions deploy veo-generate-video

# 5. Wait 10 seconds for deployment
sleep 10

# 6. Test again
```

## Need More Info

To help debug further, please provide:

1. **Full error message from function logs:**
   ```bash
   supabase functions logs veo-generate-video --tail 5
   ```

2. **Confirm the service account email format:**
   ```bash
   supabase secrets list | grep VERTEX_AI_SERVICE_ACCOUNT_EMAIL
   ```
   Should look like: `something@curios-vertex.iam.gserviceaccount.com`

3. **Check if the key file exists:**
   ```bash
   ls -la ~/veo-key.json
   cat ~/veo-key.json | jq '.client_email, .private_key | length'
   ```
   The private_key length should be around 1600-1700 characters.

---

**Next Step:** Run the "Quick Fix Commands" above and report back the results.
