"""
RunPod Serverless handler for LTX-2 image-to-video WITH synchronized audio (Movie Mode).

Model: LTX-2 19B **distilled** in diffusers format (8 inference steps, guidance 1.0),
loaded once per cold start from the Network Volume. Audio is generated jointly with
the video (this is what speaks the swipe's voiceover), muxed into the returned mp4.

Input  (job["input"]):
    warmup         bool  optional  load the pipeline and return immediately — used by the
                                   app's "user opened Movie mode" wake-up ping
    image_url      str   required  URL of the storyboard frame to animate
    prompt         str   required  motion / voiceover prompt for the scene
    duration       int   optional  seconds (clamped 4-12), default 6
    seed           int   optional  for style consistency across swipes

Output:
    { "video_base64": "<mp4 bytes b64>", "duration": <int>, "width": W, "height": H }
    or { "warm": true } for warmup pings, or { "error": "..." }.

The mp4 is returned as base64; the calling Supabase edge function uploads it to Storage.
"""

import base64
import os
import tempfile

import runpod
import torch
from diffusers import LTX2ImageToVideoPipeline
from diffusers.utils import encode_video, load_image

MODEL_DIR = os.environ.get("LTX_MODEL_DIR", "/runpod-volume/ltx2")
# 768x512 is the documented sweet spot for LTX-2 single-stage generation; raising it
# raises VRAM + time per clip. Frames come in 16:9, so we centre-crop to 3:2.
WIDTH = int(os.environ.get("LTX_WIDTH", "768"))
HEIGHT = int(os.environ.get("LTX_HEIGHT", "512"))
FPS = 24.0
MIN_DURATION = 4
MAX_DURATION = 12  # 12s @ 24fps = 289 frames; longer gets slow/expensive per clip
NUM_INFERENCE_STEPS = 8  # distilled checkpoint: 8 steps, guidance 1.0
NEGATIVE_PROMPT = "worst quality, inconsistent motion, blurry, jittery, distorted, watermark, text"

# ── Load the pipeline once per cold start ─────────────────────────────────────
_pipe = None


def _get_pipeline() -> "LTX2ImageToVideoPipeline":
    global _pipe
    if _pipe is None:
        pipe = LTX2ImageToVideoPipeline.from_pretrained(MODEL_DIR, torch_dtype=torch.bfloat16)
        # Keeps peak VRAM within a 48GB card (one component on GPU at a time).
        pipe.enable_model_cpu_offload()
        pipe.vae.enable_tiling()
        pipe.set_progress_bar_config(disable=True)
        _pipe = pipe
    return _pipe


def _clamp_duration(value) -> int:
    try:
        d = int(value)
    except (TypeError, ValueError):
        return 6
    return max(MIN_DURATION, min(MAX_DURATION, d))


def _num_frames(duration: int) -> int:
    # LTX requires num_frames % 8 == 1.
    raw = int(duration * FPS)
    return raw - (raw % 8) + 1


def _cover_crop(image, width: int, height: int):
    """Resize + centre-crop to fill width x height without distortion."""
    src_w, src_h = image.size
    scale = max(width / src_w, height / src_h)
    new_w, new_h = round(src_w * scale), round(src_h * scale)
    image = image.resize((new_w, new_h))
    left = (new_w - width) // 2
    top = (new_h - height) // 2
    return image.crop((left, top, left + width, top + height))


def handler(job):
    job_input = job.get("input", {}) or {}

    if job_input.get("warmup"):
        _get_pipeline()
        return {"warm": True}

    image_url = job_input.get("image_url")
    prompt = job_input.get("prompt")
    if not image_url or not prompt:
        return {"error": "image_url and prompt are required"}

    duration = _clamp_duration(job_input.get("duration", 6))
    seed = job_input.get("seed")

    try:
        pipe = _get_pipeline()
        image = _cover_crop(load_image(image_url).convert("RGB"), WIDTH, HEIGHT)

        generator = None
        if seed is not None:
            generator = torch.Generator(device="cuda").manual_seed(int(seed))

        video, audio = pipe(
            image=image,
            prompt=prompt,
            negative_prompt=NEGATIVE_PROMPT,
            width=WIDTH,
            height=HEIGHT,
            num_frames=_num_frames(duration),
            frame_rate=FPS,
            num_inference_steps=NUM_INFERENCE_STEPS,
            guidance_scale=1.0,
            generator=generator,
            output_type="np",
            return_dict=False,
        )

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            encode_video(
                video[0],
                fps=FPS,
                audio=audio[0].float().cpu(),
                audio_sample_rate=pipe.vocoder.config.output_sampling_rate,
                output_path=tmp.name,
            )
            tmp.flush()
            with open(tmp.name, "rb") as f:
                video_bytes = f.read()
        os.unlink(tmp.name)

        return {
            "video_base64": base64.b64encode(video_bytes).decode("utf-8"),
            "duration": duration,
            "width": WIDTH,
            "height": HEIGHT,
        }
    except Exception as e:  # surface failures to the edge function (it falls back to Wavespeed)
        return {"error": f"LTX generation failed: {e}"}


runpod.serverless.start({"handler": handler})
