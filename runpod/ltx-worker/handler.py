"""
RunPod Serverless handler for LTX-2 image-to-video WITH synchronized audio (Movie Mode).

Model: LTX-2 19B **distilled** in diffusers format (8 inference steps, guidance 1.0),
loaded once per cold start from the Network Volume. Audio is generated jointly with
the video (this is what speaks the swipe's voiceover), muxed into the returned mp4.

Speed setup (all with graceful fallback to plain bf16 + CPU offload):
  - transformer quantized to fp8 dynamic (torchao) — Ada GPUs (L40S/4090) run fp8 at ~2x bf16
  - text encoder quantized to int8 weight-only so EVERYTHING stays GPU-resident
    (no per-job offload transfers, and torch.compile graphs stay valid)
  - transformer wrapped in torch.compile (dynamic shapes — num_frames varies per duration)
  - warmup runs a micro-generation to absorb quantization/compile cost into the
    "user opened Movie mode" ping instead of the first real render

Env kill-switches (endpoint template env vars, no rebuild needed):
  LTX_QUANT=none    disable quantization (falls back to bf16 + model_cpu_offload)
  LTX_COMPILE=0     disable torch.compile

Input  (job["input"]):
    warmup         bool  optional  load + warm the pipeline, return immediately
    image_url      str   required  URL of the storyboard frame to animate
    prompt         str   required  motion / voiceover prompt for the scene
    duration       int   optional  seconds (clamped 4-10), default 6
    seed           int   optional  for style consistency across swipes

Output:
    { "video_base64": "<mp4 bytes b64>", "duration": <int>, "width": W, "height": H }
    or { "warm": true } for warmup pings, or { "error": "..." }.
"""

import base64
import os
import tempfile
import time

import numpy as np
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
MAX_DURATION = 10  # storyboard caps at 10s too; render cost is linear in frames
NUM_INFERENCE_STEPS = 8  # distilled checkpoint: 8 steps, guidance 1.0
NEGATIVE_PROMPT = "worst quality, inconsistent motion, blurry, jittery, distorted, watermark, text"

QUANT = os.environ.get("LTX_QUANT", "fp8")
# Default OFF: measured on L40S, torch.compile produced NaN frames (black video) with the
# fp8-quantized transformer AND only ~10% speed over fp8 eager (17.4s vs 19.5s per 4s clip)
# while costing an ~18min first compile per worker. fp8 eager is the production path.
COMPILE = os.environ.get("LTX_COMPILE", "0") == "1"

# ── Load the pipeline once per cold start ─────────────────────────────────────
_pipe = None
# Diagnostics returned in the warmup response (and `path` on every render) so a
# silent fallback is visible from the API — worker logs aren't reachable remotely.
_init_report: dict = {"path": "uninitialized"}


def _quantize(pipe) -> None:
    """fp8 transformer + int8 text encoder, then everything GPU-resident."""
    from torchao.quantization import (
        quantize_,
        float8_dynamic_activation_float8_weight,
        int8_weight_only,
    )

    t0 = time.time()
    # Text encoder on CPU first (24GB bf16 -> ~12.5GB int8), avoids a VRAM spike.
    quantize_(pipe.text_encoder, int8_weight_only())
    _init_report["te_int8_s"] = round(time.time() - t0)
    print(f"[ltx] text_encoder int8 in {_init_report['te_int8_s']}s", flush=True)

    t0 = time.time()
    # Transformer alone fits 48GB in bf16; quantize on-GPU (fast), 38GB -> ~19GB.
    pipe.transformer.to("cuda")
    quantize_(pipe.transformer, float8_dynamic_activation_float8_weight())
    _init_report["tf_fp8_s"] = round(time.time() - t0)
    print(f"[ltx] transformer fp8 in {_init_report['tf_fp8_s']}s", flush=True)

    # Everything resident: no per-job device moves -> compiled graphs stay valid.
    pipe.to("cuda")


def _micro_generate(pipe) -> None:
    """Tiny render to absorb kernel/compile warmup into the warmup ping."""
    t0 = time.time()
    pipe(
        image=torch.zeros(3, 192, 320),
        prompt="a calm test scene",
        negative_prompt=NEGATIVE_PROMPT,
        width=320,
        height=192,
        num_frames=9,
        frame_rate=FPS,
        num_inference_steps=2,
        guidance_scale=1.0,
        output_type="latent",
        return_dict=False,
    )
    print(f"[ltx] micro warmup gen in {time.time()-t0:.0f}s", flush=True)


def _get_pipeline() -> "LTX2ImageToVideoPipeline":
    global _pipe
    if _pipe is None:
        t0 = time.time()
        pipe = LTX2ImageToVideoPipeline.from_pretrained(MODEL_DIR, torch_dtype=torch.bfloat16)
        _init_report["load_s"] = round(time.time() - t0)
        print(f"[ltx] weights loaded in {_init_report['load_s']}s", flush=True)

        resident = False
        if QUANT == "fp8":
            try:
                _quantize(pipe)
                resident = True
            except Exception as e:  # noqa: BLE001 — any quant failure falls back to bf16
                _init_report["quant_error"] = str(e)[:300]
                print(f"[ltx] quantization failed, bf16 fallback: {e}", flush=True)

        if not resident:
            # Proven baseline: one component at a time on the GPU.
            pipe.enable_model_cpu_offload()

        pipe.vae.enable_tiling()
        pipe.set_progress_bar_config(disable=True)

        # Compile only when GPU-resident: under CPU offload the per-job device moves
        # would invalidate the graphs and re-compile (minutes) on every render.
        compiled = False
        if COMPILE and resident:
            try:
                # If compilation fails at runtime (missing toolchain, unsupported op),
                # fall back to eager per-graph instead of raising on every forward.
                torch._dynamo.config.suppress_errors = True  # noqa: SLF001
                # dynamic=True: num_frames changes per requested duration; static graphs
                # would recompile (minutes) on every new shape.
                pipe.transformer = torch.compile(pipe.transformer, dynamic=True)
                compiled = True
                print("[ltx] transformer compiled (dynamic)", flush=True)
            except Exception as e:  # noqa: BLE001
                _init_report["compile_error"] = str(e)[:300]
                print(f"[ltx] torch.compile failed, running eager: {e}", flush=True)

        try:
            t0 = time.time()
            _micro_generate(pipe)
            _init_report["microgen_s"] = round(time.time() - t0)
        except Exception as e:  # noqa: BLE001 — warmup gen is best-effort
            _init_report["microgen_error"] = str(e)[:300]
            print(f"[ltx] micro warmup failed (non-fatal): {e}", flush=True)

        _init_report["path"] = ("fp8-resident" if resident else "bf16-offload") + ("+compile" if compiled else "")
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
        return {"warm": True, **_init_report}

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

        t0 = time.time()
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
        print(f"[ltx] {duration}s render in {time.time()-t0:.0f}s", flush=True)

        # diffusers' np output is float32 in [0,1] on some versions, uint8 on others;
        # encode_video requires uint8 — normalize explicitly so version drift can't break us.
        frames = video[0]
        if getattr(frames, "dtype", None) != np.uint8:
            frames = (np.clip(np.asarray(frames), 0.0, 1.0) * 255).round().astype(np.uint8)

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            encode_video(
                frames,
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
            "path": _init_report.get("path"),
        }
    except Exception as e:  # surface failures to the edge function (it falls back to Wavespeed)
        return {"error": f"LTX generation failed: {e}"}


runpod.serverless.start({"handler": handler})
