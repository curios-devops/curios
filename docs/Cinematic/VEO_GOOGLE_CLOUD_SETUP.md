# Google Cloud Vertex AI Veo Setup - Step by Step

## Prerequisites Checklist

Before using Veo API, verify these are configured in Google Cloud:

- [ ] Google Cloud Project created
- [ ] Billing enabled
- [ ] Vertex AI API enabled
- [ ] Service Account created with proper permissions
- [ ] Service Account key downloaded
- [ ] Veo model access granted (regional availability)

---

## Step 1: Verify Project and Billing

### 1.1 Check Current Project

```bash
gcloud config get-value project
```

Expected output: `curios-vertex`

If not set:
```bash
gcloud config set project curios-vertex
```

### 1.2 Verify Billing is Enabled

```bash
gcloud beta billing projects describe curios-vertex
```

Look for:
```
billingAccountName: billingAccounts/XXXXXX-XXXXXX-XXXXXX
billingEnabled: true
```

If billing is not enabled, enable it at:
https://console.cloud.google.com/billing/linkedaccount?project=curios-vertex

---

## Step 2: Enable Required APIs

### 2.1 Enable Vertex AI API

```bash
gcloud services enable aiplatform.googleapis.com --project=curios-vertex
```

### 2.2 Verify API is Enabled

```bash
gcloud services list --enabled --project=curios-vertex | grep aiplatform
```

Expected output:
```
aiplatform.googleapis.com         Vertex AI API
```

### 2.3 Enable Additional Required APIs

```bash
# Cloud Storage (for video output)
gcloud services enable storage-api.googleapis.com --project=curios-vertex

# IAM (for service accounts)
gcloud services enable iam.googleapis.com --project=curios-vertex
```

---

## Step 3: Verify Service Account

### 3.1 List Service Accounts

```bash
gcloud iam service-accounts list --project=curios-vertex
```

Look for your service account email. If not found, create one:

```bash
gcloud iam service-accounts create curios-veo-sa \
  --display-name="Curios Veo Service Account" \
  --project=curios-vertex
```

### 3.2 Grant Required Roles

```bash
# Service account email (replace if different)
SA_EMAIL="curios-veo-sa@curios-vertex.iam.gserviceaccount.com"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding curios-vertex \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/aiplatform.user"

# Grant Storage Admin role (for accessing generated videos)
gcloud projects add-iam-policy-binding curios-vertex \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"
```

### 3.3 Verify Service Account Permissions

```bash
gcloud projects get-iam-policy curios-vertex \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:${SA_EMAIL}"
```

Expected output should include:
```
ROLE
roles/aiplatform.user
roles/storage.admin
```

---

## Step 4: Test Authentication

### 4.1 Get Access Token

```bash
# Authenticate with service account key
gcloud auth activate-service-account ${SA_EMAIL} \
  --key-file=/path/to/your-service-account-key.json \
  --project=curios-vertex

# Get access token
ACCESS_TOKEN=$(gcloud auth print-access-token)
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
```

### 4.2 Test Vertex AI API Access

```bash
# List available models in us-central1
curl -X GET \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/curios-vertex/locations/us-central1/publishers/google/models"
```

This should return a list of available models (including Veo if accessible).

---

## Step 5: Verify Veo Model Access

### 5.1 Check if Veo is Available in Your Region

```bash
curl -X GET \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001" \
  | jq '.'
```

**Expected Response:**
- If model is accessible: Returns model details
- If not accessible: 403 Forbidden or 404 Not Found

**Common Issues:**
- **403 PERMISSION_DENIED**: Service account lacks permissions
- **404 NOT_FOUND**: Model not available in your region or project
- **Veo requires allowlist**: Some Veo models may require Google approval

### 5.2 Request Veo Access (if needed)

If you get 403/404, Veo might require allowlist access:

1. Go to: https://console.cloud.google.com/vertex-ai/generative/video
2. Click "Request Access" or "Enable Veo"
3. Fill out the form
4. Wait for approval (can take 1-3 business days)

---

## Step 6: Test Simple Vertex AI Request

### 6.1 Test with Gemini (to verify API works)

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/curios-vertex/locations/us-central1/publishers/google/models/gemini-1.5-flash:generateContent" \
  -d '{
    "contents": {
      "role": "user",
      "parts": { "text": "Hello, this is a test" }
    }
  }' | jq '.'
```

**Expected:** Returns generated text response

**If this fails:** Your basic Vertex AI setup has issues

---

## Step 7: Test Veo Video Generation

### 7.1 Simple Veo Test Request

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001:predictLongRunning" \
  -d '{
    "instances": [
      {
        "prompt": "A simple test: a red ball rolling on a table"
      }
    ],
    "parameters": {
      "aspectRatio": "16:9",
      "sampleCount": 1
    }
  }' | jq '.'
```

**Expected Response:**
```json
{
  "name": "projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/OPERATION_ID"
}
```

**Save the operation name!**

### 7.2 Check Operation Status

```bash
# Replace OPERATION_NAME with the full name from step 7.1
OPERATION_NAME="projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/YOUR_OPERATION_ID"

curl -X GET \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1/${OPERATION_NAME}" \
  | jq '.'
```

**Expected Response (while processing):**
```json
{
  "name": "projects/...",
  "metadata": { ... }
  // No "done" field or "done": false
}
```

**Expected Response (when complete):**
```json
{
  "name": "projects/...",
  "metadata": { ... },
  "done": true,
  "response": {
    "predictions": [
      {
        "gcsUri": "gs://bucket-name/path/to/video.mp4"
      }
    ]
  }
}
```

---

## Troubleshooting Common Issues

### Error: "Request had insufficient authentication scopes"

**Solution:**
```bash
# Re-authenticate with correct scopes
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform
```

### Error: "The caller does not have permission"

**Solutions:**
1. Verify service account has `roles/aiplatform.user`:
   ```bash
   gcloud projects get-iam-policy curios-vertex \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:YOUR_SA_EMAIL"
   ```

2. Add the role if missing:
   ```bash
   gcloud projects add-iam-policy-binding curios-vertex \
     --member="serviceAccount:YOUR_SA_EMAIL" \
     --role="roles/aiplatform.user"
   ```

### Error: "API aiplatform.googleapis.com is not enabled"

**Solution:**
```bash
gcloud services enable aiplatform.googleapis.com --project=curios-vertex
```

### Error: "Model veo-3.1-generate-001 not found"

**Possible Causes:**
1. Veo not available in your region (try different region)
2. Veo requires allowlist access (request access)
3. Model name changed (check latest docs)

**Check available models:**
```bash
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/curios-vertex/locations/us-central1/publishers/google/models" \
  | jq '.models[] | select(.displayName | contains("veo")) | {name, displayName}'
```

### Error: 404 when checking operation status

**Possible Causes:**
1. Operation path includes `/publishers/google/models/MODEL_ID/` which is incorrect for status checks
2. Need to use different endpoint

**Test different approaches:**

```bash
# Approach 1: Full path
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/OPERATION_ID"

# Approach 2: Operations only (try this if approach 1 fails)
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/curios-vertex/locations/us-central1/operations/OPERATION_ID"

# Approach 3: Check in Cloud Console
# Go to: https://console.cloud.google.com/vertex-ai/generative/video/locations/us-central1/operations?project=curios-vertex
```

---

## Summary Checklist

Before running Supabase function, verify:

- [ ] `gcloud auth print-access-token` works
- [ ] Vertex AI API enabled
- [ ] Service account has `aiplatform.user` role
- [ ] Can list models in Vertex AI
- [ ] Veo model returns details (not 404)
- [ ] Test video generation returns operation ID
- [ ] Can check operation status (even if still processing)

**Once all checks pass, the Supabase function should work!**

---

## Next Steps

1. Run through all steps above
2. Document any errors you encounter
3. Once basic curl tests work, update Supabase secrets:
   ```bash
   supabase secrets set VERTEX_AI_SERVICE_ACCOUNT_EMAIL="your-sa@curios-vertex.iam.gserviceaccount.com"
   supabase secrets set VERTEX_AI_PRIVATE_KEY="$(cat /path/to/key.json | jq -r '.private_key')"
   ```
4. Test Supabase function
