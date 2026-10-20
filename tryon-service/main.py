"""Self-hosted virtual try-on service wrapping Leffa (MIT).

Run:  uvicorn main:app --host 0.0.0.0 --port 8000
Expects the Leffa repo cloned next to this file (see README.md).
"""
import io
import os
import sys
import tempfile
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from PIL import Image

LEFFA_DIR = Path(os.environ.get("LEFFA_DIR", Path(__file__).parent / "Leffa")).resolve()
if not LEFFA_DIR.exists():
    raise SystemExit(f"Leffa repo not found at {LEFFA_DIR}. See tryon-service/README.md.")

# Leffa loads checkpoints from ./ckpts relative to its own directory.
sys.path.insert(0, str(LEFFA_DIR))
os.chdir(LEFFA_DIR)
from app import LeffaPredictor  # noqa: E402  (Leffa's own inference wrapper)

# Our API category -> (Leffa garment type, Leffa model)
CATEGORIES = {
    "upper_body": ("upper_body", "viton_hd"),
    "lower_body": ("lower_body", "dress_code"),
    "dresses": ("dresses", "dress_code"),
}
STEPS = int(os.environ.get("TRYON_STEPS", "30"))
GUIDANCE = float(os.environ.get("TRYON_GUIDANCE", "2.5"))

state = {}
gpu_lock = threading.Lock()  # one generation at a time per GPU


@asynccontextmanager
async def lifespan(_: FastAPI):
    state["predictor"] = LeffaPredictor()
    yield


app = FastAPI(title="Try-on service", lifespan=lifespan)


@app.get("/health")
def health():
    return {"ok": "predictor" in state}


def run_tryon(person: bytes, garment: bytes, category: str, seed: int) -> bytes:
    garment_type, model_type = CATEGORIES[category]
    with tempfile.TemporaryDirectory() as tmp:
        person_path = Path(tmp, "person.png")
        garment_path = Path(tmp, "garment.png")
        Image.open(io.BytesIO(person)).convert("RGB").save(person_path)
        Image.open(io.BytesIO(garment)).convert("RGB").save(garment_path)
        with gpu_lock:
            result, _mask, _densepose = state["predictor"].leffa_predict_vt(
                str(person_path), str(garment_path),
                False,  # ref_acceleration
                STEPS, GUIDANCE, seed,
                model_type, garment_type,
                False,  # vt_repaint
                False,  # preprocess_garment (we send a flat image on white)
            )
    out = io.BytesIO()
    Image.fromarray(result).save(out, format="PNG")
    return out.getvalue()


@app.post("/tryon")
async def tryon(
    category: str = Form(...),
    seed: int = Form(42),
    person: UploadFile = File(...),
    garment: UploadFile = File(...),
):
    if category not in CATEGORIES:
        raise HTTPException(400, f"category must be one of {list(CATEGORIES)}")
    try:
        png = await run_in_threadpool(run_tryon, await person.read(), await garment.read(), category, seed)
    except OSError as err:  # unreadable image
        raise HTTPException(400, f"Could not read image: {err}")
    return Response(png, media_type="image/png")
