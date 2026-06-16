# LTX-2 Image-to-Video — RunPod Serverless Worker (Movie Mode)

Self-hosted LTX video generation for the Movie service. Called from the Supabase edge
function `generate-movie-video`, which is called from the Netlify frontend via
`RunPodLTXProvider`.

## Architecture

```
Frontend (RunPodLTXProvider)
  → supabase.functions.invoke('generate-movie-video', { imageUrl, prompt, duration })
    → POST https://api.runpod.ai/v2/<ENDPOINT_ID>/run   (Authorization: Bearer RUNPOD_API_KEY)
      → this worker (handler.py) on a GPU with the Network Volume mounted at /runpod-volume
        → returns { video_base64 }
    → edge function uploads mp4 to Supabase Storage bucket `movie-assets`
  → returns { videoUrl }
```

## One-time setup

### 1. Network Volume (stores the weights once)
Create a RunPod **Network Volume** (~50 GB) in the region you'll run the endpoint.

### 2. Download LTX-2 weights onto the volume
Start a temporary GPU pod with the volume mounted at `/runpod-volume`, then:

```bash
pip install "huggingface_hub[cli]"
# HF_TOKEN only needed if the repo is gated
huggingface-cli download Lightricks/LTX-Video \
  --local-dir /runpod-volume/ltx --local-dir-use-symlinks False
```

Terminate the temporary pod afterward. The weights persist on the volume.

### 3. Build & push the worker image
```bash
docker build -t <registry>/ltx-worker:latest runpod/ltx-worker
docker push <registry>/ltx-worker:latest
```

### 4. Create the Serverless Endpoint
- Container image: `<registry>/ltx-worker:latest`
- Attach the Network Volume (mount path `/runpod-volume`)
- GPU: 1× 4090 (or H100 for speed)
- Note the **Endpoint ID** → set as `RUNPOD_ENDPOINT_ID` Supabase secret.

### 5. Supabase secrets
```bash
supabase secrets set RUNPOD_API_KEY=<key> RUNPOD_ENDPOINT_ID=<id>
supabase functions deploy generate-movie-video
```

## Local smoke test (handler logic only, no GPU)
The handler requires CUDA; test end-to-end via the deployed endpoint:

```bash
curl -X POST https://api.runpod.ai/v2/<ENDPOINT_ID>/runsync \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input":{"image_url":"https://.../frame.png","prompt":"slow cinematic push-in","duration":6}}'
```
