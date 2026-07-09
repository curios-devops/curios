# LTX-2 Image-to-Video (with audio) — RunPod Serverless Worker (Movie Mode)

Self-hosted **LTX-2 19B distilled** video+audio generation for the Movie service, as the
PRIMARY backend. Wavespeed stays as the automatic FALLBACK (error or too slow → the edge
function falls back, the user never notices).

## Cost model (the whole point)

| Item | Cost | Notes |
|---|---|---|
| Network Volume 80 GB (US-IL-1) | ~$4/month | The ONLY idle cost. Weights parked once (~65 GB), never re-downloaded. |
| GPU while generating | ~$0.05–0.08/video | 48GB-class flex worker (L40S), per-second billing. |
| Warm window after a job | ~$0.16/session | Idle timeout 300s — worker sleeps 5 min after the last job. |
| No traffic | $0 GPU | Min workers = 0. Nothing runs, nothing bills. |

⚠️ **Do NOT download `Lightricks/LTX-Video` or the single-file checkpoints** — that repo is
~314 GB of every variant (the $50 mistake). And don't download the diffusers snapshot raw
either: it's **93 GB** because the Gemma-12B text encoder ships in fp32 (48.7 GB).
`download_and_convert.py` (this folder) downloads the snapshot and rewrites the text encoder
to bf16 shard-by-shard → **~65 GB** on disk, faster cold starts, identical runtime behavior
(the worker loads everything as bf16 anyway).

## Warm-up / sleep lifecycle

- The app pings `{ warmup: true }` when a user selects Movie mode (or Auto routes to it) —
  the worker cold-starts and loads the pipeline (~1–2 min) while the user is still in the
  research/storyboard phase, so the video render usually hits a warm worker.
- **Idle timeout 300s**: after the last job the worker stays warm 5 min (regenerations are
  instant), then scales to zero. No traffic → no GPU spend.

## One-time setup

### 1. Network Volume
RunPod Console → Storage → New Network Volume: **80 GB**, in a datacenter that has BOTH
storage clusters AND **48 GB GPU** serverless availability (checked 2026-07-09: US-IL-1
with L40S; note US-TX-1 has A6000s but no volume storage). (~$0.05/GB/mo ≈ $4/mo.)

Current volume: `ltx2-weights-us` (id `5iriwbqcre`, US-IL-1, 80 GB).

### 2. Download + convert the weights (CPU pod — do NOT rent a GPU for this)
Deploy a **CPU pod** (4 vCPU / 16 GB RAM ≈ $0.16/hr — the bf16 conversion needs ~8 GB RAM)
with the volume attached at `/runpod-volume`, then:

```bash
pip install huggingface_hub safetensors numpy
pip install torch --index-url https://download.pytorch.org/whl/cpu
export HF_HUB_DISABLE_XET=1   # Xet transfer stalls on small CPU pods; plain HTTP is reliable
python3 download_and_convert.py   # ~45 min: snapshot minus text_encoder, then fp32→bf16 per shard
du -sh /runpod-volume/ltx2        # expect ~65 GB
```

**Terminate the pod when done.** The weights persist on the volume.

### 3. Build & push the worker image, then create the endpoint
The image lives on Docker Hub as **`devopsavatar/ltx-worker:latest`**. To update it:

```bash
docker buildx build --platform linux/amd64 -t devopsavatar/ltx-worker:latest --push runpod/ltx-worker
```

Endpoint (created 2026-07-09 via the RunPod API — id `htce0j29igux93`, template `ltx2-worker`):
- GPU: **48 GB** classes (`ADA_48_PRO,AMPERE_48` = L40S / RTX 6000 Ada / A6000 / A40)
- Workers: min **0**, max **1** (hard spend cap)
- **Idle timeout: 300 s** (the 5-min warm window)
- Network Volume `ltx2-weights` (120 GB, EU-RO-1) mounted at `/runpod-volume`

Workers pull the new image on their next cold start after a push (or bump the
template's image tag to force it).

### 4. Supabase secrets + deploy
```bash
supabase secrets set RUNPOD_API_KEY=<key> RUNPOD_ENDPOINT_ID=<endpoint-id>
supabase functions deploy generate-movie-video
```

Without these secrets the edge function simply keeps using Wavespeed — safe to deploy first.

## Request flow (async — a render takes ~4 min, beyond any sync response window)

```
Movie mode selected → warmup ping → worker loads pipeline (cold ~1-2 min)
Core video request → edge fn creates video_jobs row → RunPod /run (webhook back to the fn,
  executionTimeout RUNPOD_JOB_TIMEOUT_MS=10min) → responds { jobId, async: true } instantly
RunPod finishes → webhook → fn re-fetches result via /status → uploads mp4 → row 'ready'
Client (RunPodLTXProvider) polls the video_jobs row (5s, up to 12 min) → videoUrl
Job error/timeout → client retries once with forceBackend:"wavespeed" (sync fallback)
```

Note: the function is deployed with `--no-verify-jwt` so the webhook can reach it; client
branches enforce the Authorization header manually, and the webhook authenticates by row id
+ RunPod job id match + re-fetching the result with our own API key.

## Smoke test

```bash
# Warmup (starts a worker, loads weights):
curl -X POST https://api.runpod.ai/v2/<ENDPOINT_ID>/runsync \
  -H "Authorization: Bearer $RUNPOD_API_KEY" -H "Content-Type: application/json" \
  -d '{"input":{"warmup":true}}'

# Real generation:
curl -X POST https://api.runpod.ai/v2/<ENDPOINT_ID>/run \
  -H "Authorization: Bearer $RUNPOD_API_KEY" -H "Content-Type: application/json" \
  -d '{"input":{"image_url":"https://.../frame.png","prompt":"slow cinematic push-in. Voiceover: a calm narrator says: testing one two three","duration":6}}'
# then poll https://api.runpod.ai/v2/<ENDPOINT_ID>/status/<job-id>
```
