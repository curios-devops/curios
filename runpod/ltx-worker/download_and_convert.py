import json, os, shutil
from huggingface_hub import hf_hub_download, list_repo_files, snapshot_download

REPO = "rootonchair/LTX-2-19b-distilled"
ROOT = "/runpod-volume/ltx2"
TMP = "/runpod-volume/.tmp"

# Stage 1: everything except the fp32 text encoder (~44GB)
snapshot_download(REPO, local_dir=ROOT, ignore_patterns=["text_encoder/*"])
print("stage1 done", flush=True)

# Stage 2: text encoder shard-by-shard fp32 -> bf16 (49GB -> ~24GB on disk)
import torch
from safetensors.torch import load_file, save_file

dst = os.path.join(ROOT, "text_encoder")
os.makedirs(dst, exist_ok=True)
os.makedirs(TMP, exist_ok=True)
files = [f for f in list_repo_files(REPO) if f.startswith("text_encoder/")]
for i, f in enumerate(sorted(files)):
    name = os.path.basename(f)
    out = os.path.join(dst, name)
    if os.path.exists(out):
        print("skip", name, flush=True)
        continue
    p = hf_hub_download(REPO, f, local_dir=TMP)
    if name.endswith(".safetensors"):
        sd = load_file(p)
        sd = {k: (v.to(torch.bfloat16) if v.dtype == torch.float32 else v) for k, v in sd.items()}
        save_file(sd, out, metadata={"format": "pt"})
        os.remove(p)
    else:
        shutil.move(p, out)
    print(f"te {i+1}/{len(files)}: {name}", flush=True)

shutil.rmtree(TMP, ignore_errors=True)
with open(os.path.join(ROOT, ".download-complete"), "w") as fh:
    fh.write("ok")
print("ALL DONE", flush=True)
