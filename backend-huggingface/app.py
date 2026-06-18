# -*- coding: utf-8 -*-
"""
Backend FastAPI — Deteksi Helm Konstruksi (YOLO26s).
Dideploy ke Hugging Face Spaces (Docker). Inference server-side pakai ultralytics.

Endpoint:
  GET  /                -> health check
  POST /predict/image   -> (file gambar) -> JSON {annotated(base64), detections, counts, ...}
  POST /predict/video   -> (file video)  -> file MP4 (H.264) beranotasi
"""
import base64
import io
import os
import subprocess
import tempfile
import time
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from ultralytics import YOLO

MODEL_PATH = os.environ.get("MODEL_PATH", "model/best.pt")
CLASSES = ["Helmet", "No-Helmet", "Person"]

app = FastAPI(title="Deteksi Helm Konstruksi — API", version="1.0")

# CORS: izinkan frontend (Vercel) memanggil API ini.
# Untuk produksi, ganti "*" dengan domain Vercel kamu, mis. ["https://namamu.vercel.app"].
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Muat model SEKALI saat startup (bukan tiap request).
print(f"[startup] memuat model: {MODEL_PATH}")
model = YOLO(MODEL_PATH, task="detect")
print("[startup] model siap.")


@app.get("/")
def health():
    return {"status": "ok", "model": MODEL_PATH, "classes": CLASSES}


@app.post("/predict/image")
async def predict_image(
    file: UploadFile = File(...),
    conf: float = Query(0.25, ge=0.01, le=0.95),
    iou: float = Query(0.45, ge=0.1, le=0.9),
):
    """Deteksi pada satu gambar. Balikan gambar beranotasi (base64) + ringkasan."""
    try:
        img = Image.open(io.BytesIO(await file.read())).convert("RGB")
    except Exception as e:
        return JSONResponse({"error": f"gambar tidak valid: {e}"}, status_code=400)

    t0 = time.time()
    r = model.predict(np.array(img), conf=conf, iou=iou, imgsz=640, verbose=False)[0]
    dt = (time.time() - t0) * 1000

    # gambar beranotasi (ultralytics .plot() -> BGR) -> JPEG base64
    annotated = r.plot()[:, :, ::-1]  # BGR -> RGB
    buf = io.BytesIO()
    Image.fromarray(annotated).save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode()

    dets, counts = [], [0, 0, 0]
    if r.boxes is not None and len(r.boxes):
        for b, c, cf in zip(r.boxes.xyxy.tolist(), r.boxes.cls.tolist(), r.boxes.conf.tolist()):
            ci = int(c)
            if 0 <= ci < len(CLASSES):
                counts[ci] += 1
            dets.append({"cls": ci, "name": CLASSES[ci] if ci < len(CLASSES) else str(ci),
                         "conf": round(float(cf), 3), "box": [round(x, 1) for x in b]})

    return {
        "annotated": "data:image/jpeg;base64," + b64,
        "detections": dets,
        "counts": {CLASSES[i]: counts[i] for i in range(len(CLASSES))},
        "no_helmet": counts[1],
        "total": len(dets),
        "time_ms": round(dt, 1),
    }


@app.post("/predict/video")
async def predict_video(
    file: UploadFile = File(...),
    conf: float = Query(0.25, ge=0.01, le=0.95),
    iou: float = Query(0.45, ge=0.1, le=0.9),
    stride: int = Query(2, ge=1, le=10),  # proses tiap N frame (hemat CPU)
):
    """Deteksi pada video. Balikan MP4 (H.264) beranotasi.

    Catatan: di HF free (CPU), video panjang LAMBAT. Gunakan klip pendek (<= ~8 detik)
    dan/atau naikkan `stride`. ffmpeg me-re-encode ke H.264 agar bisa diputar di browser.
    """
    work = Path(tempfile.mkdtemp())
    inp = work / ("input" + Path(file.filename or "video.mp4").suffix)
    inp.write_bytes(await file.read())

    try:
        model.predict(str(inp), conf=conf, iou=iou, imgsz=640, vid_stride=stride,
                      save=True, project=str(work), name="pred", exist_ok=True, verbose=False)
    except Exception as e:
        return JSONResponse({"error": f"gagal memproses video: {e}"}, status_code=500)

    pred_dir = work / "pred"
    raw = next((p for p in pred_dir.iterdir() if p.suffix.lower() in (".mp4", ".avi", ".mkv")), None) if pred_dir.exists() else None
    if raw is None:
        return JSONResponse({"error": "output video tidak ditemukan"}, status_code=500)

    out = work / "annotated.mp4"
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(raw), "-vcodec", "libx264", "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", str(out)],
            check=True, capture_output=True,
        )
        final = out
    except Exception:
        final = raw  # fallback: kirim apa adanya (mungkin tak terputar di sebagian browser)

    return FileResponse(str(final), media_type="video/mp4", filename="annotated.mp4")
