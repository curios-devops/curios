# Veo on Vertex AI — Connection Guide (2026)

This guide documents the **minimum working** connection flow for Veo on Vertex AI and the Supabase Edge Function integration used in this repo.

## 1) Official minimum prerequisites

- Google Cloud project with billing enabled
- Vertex AI API enabled: `aiplatform.googleapis.com`
- IAM role for caller: `roles/aiplatform.user`
- Auth method:
  - Local CLI tests: `gcloud auth print-access-token` (user auth)
  - Supabase Edge Function: service account JWT -> OAuth2 access token

## 2) Verify connection from command line (no assumptions)

Set project/region:

```zsh
gcloud config set project curios-vertex
```

Check API and IAM quickly:

```zsh
gcloud services list --enabled --filter='NAME:aiplatform.googleapis.com' --format='value(NAME)'

gcloud projects get-iam-policy curios-vertex \
  --flatten='bindings[].members' \
  --filter='bindings.members:user:YOUR_EMAIL AND bindings.role:roles/aiplatform.user' \
  --format='table(bindings.role)'
```

Get token:

```zsh
ACCESS_TOKEN="$(gcloud auth print-access-token)"
```

Start Veo generation (`predictLongRunning`):

```zsh
curl -sS -X POST \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001:predictLongRunning" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  --data-binary @veo_request_body.json
```

Use returned `name` as `operationName` and poll with `fetchPredictOperation`:

```zsh
curl -sS -X POST \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001:fetchPredictOperation" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"operationName":"projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/OPERATION_ID"}'
```

## 3) Important polling note

For Veo model operations, this project uses:

- `:predictLongRunning` to start
- `:fetchPredictOperation` to check status

This is the reliable path used in the Edge Function.

## 4) Supabase Edge Function behavior in this repo

`supabase/functions/veo-generate-video/index.ts` now:

- generates via `predictLongRunning`
- checks status via `fetchPredictOperation`
- supports both result shapes:
  - `response.videos[0].gcsUri` (URL-based)
  - `response.videos[0].bytesBase64Encoded` (inline bytes)
- `save` action accepts either:
  - `gcsUri`
  - `videoBase64` (+ optional `mimeType`)

## 5) Manual deploy (no Supabase CLI)

Because CLI is unavailable on older macOS, deploy from Supabase Dashboard:

1. Open Supabase Dashboard -> your project
2. Go to **Edge Functions**
3. Open/create function: `veo-generate-video`
4. Paste contents of:
   - `supabase/functions/veo-generate-video/index.ts`
5. Set function secrets:
   - `VERTEX_AI_SERVICE_ACCOUNT_EMAIL`
   - `VERTEX_AI_PRIVATE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Save/Deploy function
7. Test with action `generate`, then `check`, then optional `save`

## 6) Minimal payloads

Generate:

```json
{
  "action": "generate",
  "prompt": "A cinematic drone shot over snowy mountains at sunrise",
  "aspectRatio": "16:9"
}
```

Check:

```json
{
  "action": "check",
  "operationName": "projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/OPERATION_ID"
}
```

Save (from URL):

```json
{
  "action": "save",
  "userId": "USER_ID",
  "gcsUri": "gs://.../video.mp4"
}
```

Save (from inline bytes):

```json
{
  "action": "save",
  "userId": "USER_ID",
  "videoBase64": "<base64-video>",
  "mimeType": "video/mp4"
}
```
