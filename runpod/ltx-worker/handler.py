"""
RunPod Serverless handler for LTX-2 image-to-video (Movie Mode).

Input  (job["input"]):
    image_url      str   required  URL of the storyboard frame to animate
    prompt         str   required  motion / video prompt for the scene
    duration       int   optional  seconds (clamped to LTX-supported range), default 6
    generate_audio bool  optional  default False (faster drafts)
    seed           int   optional  for reproducibility / scene consistency

Output:
    { "video_base64": "<mp4 bytes b64>", "duration": <int>, "width": 1280, "height": 704 }

The mp4 is returned as base64 so the calling Supabase edge function can upload it to
Storage. Weights are loaded ONCE per cold start from the mounted Network Volume at
/runpod-volume/ltx (see README for the one-time download step).
"""

import base64
import io
import os
import tempfile

import requests
import runpod
import torch
from diffusers import LTXImageToVideoPipeline
from diffusers.utils import export_to_video, load_image

MODEL_DIR = os.environ.get("LTX_MODEL_DIR", "/runpod-volume/ltx")
SUPPORTED_DURATIONS = [6, 8, 10, 12, 14, 16, 18, 20]
# LTX renders at ~24 fps; frames must satisfy 8*n+1.
FPS = 24

# ── Load the pipeline once at cold start ──────────────────────────────────────
_pipe = None


def _get_pipeline() -> "LTXImageToVideoPipeline":
    global _pipe
    if _pipe is None:
        _pipe = LTXImageToVideoPipeline.from_pretrained(
            MODEL_DIR,
            torch_dtype=torch.bfloat16,
        ).to("cuda")
        _pipe.set_progress_bar_config(disable=True)
    return _pipe


def _normalize_duration(value) -> int:
    try:
        d = int(value)
    except (TypeError, ValueError):
        return 6
    for s in SUPPORTED_DURATIONS:
        if d <= s:
            return s
    return SUPPORTED_DURATIONS[-1]


def _num_frames(duration: int) -> int:
    # LTX requires num_frames % 8 == 1
    raw = duration * FPS
    return raw - (raw % 8) + 1


def handler(job):
    job_input = job.get("input", {}) or {}

    image_url = job_input.get("image_url")
    prompt = job_input.get("prompt")
    if not image_url or not prompt:
        return {"error": "image_url and prompt are required"}

    duration = _normalize_duration(job_input.get("duration", 6))
    seed = job_input.get("seed")

    try:
        pipe = _get_pipeline()
        image = load_image(image_url)

        generator = None
        if seed is not None:
            generator = torch.Generator(device="cuda").manual_seed(int(seed))

        result = pipe(
            image=image,
            prompt=prompt,
            negative_prompt="worst quality, blurry, distorted, watermark, text",
            width=1280,
            height=704,
            num_frames=_num_frames(duration),
            num_inference_steps=30,
            generator=generator,
        )
        frames = result.frames[0]

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            export_to_video(frames, tmp.name, fps=FPS)
            tmp.flush()
            with open(tmp.name, "rb") as f:
                video_bytes = f.read()
        os.unlink(tmp.name)

        return {
            "video_base64": base64.b64encode(video_bytes).decode("utf-8"),
            "duration": duration,
            "width": 1280,
            "height": 704,
        }
    except Exception as e:  # surface failures to the edge function
        return {"error": f"LTX generation failed: {e}"}


runpod.serverless.start({"handler": handler})
