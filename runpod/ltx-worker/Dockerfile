FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    LTX_MODEL_DIR=/runpod-volume/ltx2 \
    # Persist torch.compile (inductor) artifacts on the network volume: compilation
    # is paid once ever, not on every cold start.
    TORCHINDUCTOR_CACHE_DIR=/runpod-volume/.inductor-cache \
    TORCHINDUCTOR_FX_GRAPH_CACHE=1

# build-essential: torch.compile's inductor backend invokes a C compiler at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip git ffmpeg build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY handler.py .

# Weights are NOT baked into the image — they live on the mounted Network Volume
# at /runpod-volume/ltx2 (see README.md "One-time weight download").
CMD ["python3", "-u", "handler.py"]
