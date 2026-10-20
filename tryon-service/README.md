# Try-on service (Leffa, self-hosted)

Needs an NVIDIA GPU (~16 GB+ VRAM recommended for Leffa in fp16; Leffa reports ~6 s/image on an A100) and Python 3.10.

```
git clone https://github.com/franciszzj/Leffa Leffa
conda create -n tryon python=3.10 -y && conda activate tryon
pip install -r Leffa/requirements.txt -r requirements.txt   # install a CUDA build of torch first if needed
uvicorn main:app --host 0.0.0.0 --port 8000
```
First start downloads the checkpoints into `Leffa/ckpts`. Then point the Sails backend at it: `TRYON_URL=http://<gpu-host>:8000`.

`POST /tryon` (multipart: `category` = upper_body|lower_body|dresses, `person`, `garment`, optional `seed`) returns a PNG.

Inputs that work best: a front-facing, full-body, plain-background photo of the person, and a flat garment photo on white.

Env: `LEFFA_DIR`, `TRYON_STEPS` (default 30), `TRYON_GUIDANCE` (default 2.5).

Do not expose this port publicly; only the Sails backend should call it.
