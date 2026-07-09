# LTX-2 Image-to-Video (with audio) — RunPod Serverless Worker (Movie Mode)

Self-hosted **LTX-2 19B distilled** video+audio generation for the Movie service, as the
PRIMARY backend. Wavespeed stays as the automatic FALLBACK (error or too slow → the edge
function falls back, the user never notices).

## Cost model (the whole point)

| Item | Cost | Notes |
|---|---|---|
| Network Volume ~60 GB | ~$3/month | The ONLY idle cost. Weights parked once, never re-downloaded. |
| GPU while generating | ~$0.05–0.08/video | 48GB-class flex worker (L40S/A6000), per-second billing. |
| Warm window after a job | ~$0.16/session | Idle timeout 300s — worker sleeps 5 min after the last job. |
| No traffic | $0 GPU | Min workers = 0. Nothing runs, nothing bills. |

⚠️ **Do NOT download `Lightricks/LTX-Video` or the single-file checkpoints** — that repo is
~314 GB of every variant (the $50 mistake). We need ONE diffusers-format snapshot (~55 GB).

## Warm-up / sleep lifecycle

- The app pings `{ warmup: true }` when a user selects Movie mode (or Auto routes to it) —
  the worker cold-starts and loads the pipeline (~1–2 min) while the user is still in the
  research/storyboard phase, so the video render usually hits a warm worker.
- **Idle timeout 300s**: after the last job the worker stays warm 5 min (regenerations are
  instant), then scales to zero. No traffic → no GPU spend.

## One-time setup

### 1. Network Volume
RunPod Console → Storage → New Network Volume: **60 GB**, in a region that has
**L40S / RTX A6000** serverless availability. (~$0.05/GB/mo ≈ $3/mo.)

### 2. Download the weights onto the volume (CPU pod — do NOT rent a GPU for this)
Deploy the cheapest **CPU pod** with the volume attached at `/runpod-volume`, then:

```bash
pip install "huggingface_hub[cli]"
huggingface-cli download rootonchair/LTX-2-19b-distilled \
  --local-dir /runpod-volume/ltx2
du -sh /runpod-volume/ltx2   # expect roughly 50-60 GB
```

If loading later complains about a missing component (e.g. `text_encoder`, `vocoder`),
pull just that subfolder from the base repo into the same dir:

```bash
huggingface-cli download Lightricks/LTX-2 --include "text_encoder/*" "vocoder/*" \
  --local-dir /runpod-volume/ltx2
```

**Terminate the pod when done.** The weights persist on the volume.

### 3. Serverless endpoint (RunPod builds the image from GitHub — no local Docker)
RunPod Console → Serverless → New Endpoint → **Import from GitHub**:
- Repo: this repository, Dockerfile path `runpod/ltx-worker/Dockerfile`, context `runpod/ltx-worker`
- GPU: **48 GB** (L40S / RTX A6000 / A40)
- Workers: min **0**, max **1** (hard spend cap)
- **Idle timeout: 300 s** (the 5-min warm window)
- FlashBoot: enabled
- Attach the Network Volume (mount path `/runpod-volume`)

Note the **Endpoint ID**.

### 4. Supabase secrets + deploy
```bash
supabase secrets set RUNPOD_API_KEY=<key> RUNPOD_ENDPOINT_ID=<endpoint-id>
supabase functions deploy generate-movie-video
```

Without these secrets the edge function simply keeps using Wavespeed — safe to deploy first.

## Request flow

```
Movie mode selected → warmup ping → worker loads pipeline (cold ~1-2 min)
Core video request → edge fn → RunPod /run → poll /status (budget RUNPOD_WAIT_MS, default 120s)
  COMPLETED → { video_base64 } → upload to Supabase Storage → { videoUrl, backend: "runpod" }
  FAILED / over budget → cancel job → Wavespeed ltx-2-fast → { videoUrl, backend: "wavespeed" }
```

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
