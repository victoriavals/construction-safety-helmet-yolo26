# -*- coding: utf-8 -*-
"""
Backend FastAPI — Deteksi Helm Konstruksi (YOLO26s).
Dideploy ke Hugging Face Spaces (Docker). Inference server-side pakai ultralytics.

Endpoint:
  GET  /                -> health check (minimal info)
  POST /predict/image   -> (file gambar) -> JSON {annotated(base64), detections, counts, ...}
  POST /predict/video   -> (file video)  -> file MP4 (H.264) beranotasi

Pengerasan keamanan (lihat README):
  - Batas ukuran upload (gambar & video) + tolak payload raksasa lebih awal (413).
  - Rate limit per-IP (sliding window) untuk mencegah penyalahgunaan/DoS.
  - Guard PIL decompression-bomb.
  - Pembersihan berkas sementara (anti disk-leak) via BackgroundTask.
  - Pesan error generik (tidak membocorkan detail internal).
  - CORS, /docs, ukuran, dan rate-limit dapat dikonfigurasi via environment.
"""
import base64
import io
import os
import shutil
import subprocess
import tempfile
import threading
import time
from collections import deque
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from starlette.background import BackgroundTask
from ultralytics import YOLO

# ----------------------------- Konfigurasi --------------------------------
MODEL_PATH = os.environ.get("MODEL_PATH", "model/best.pt")
CLASSES = ["Helmet", "No-Helmet", "Person"]

MAX_IMAGE_MB = float(os.environ.get("MAX_IMAGE_MB", "10"))
MAX_VIDEO_MB = float(os.environ.get("MAX_VIDEO_MB", "40"))
MAX_IMAGE_BYTES = int(MAX_IMAGE_MB * 1024 * 1024)
MAX_VIDEO_BYTES = int(MAX_VIDEO_MB * 1024 * 1024)
GLOBAL_MAX_BYTES = max(MAX_IMAGE_BYTES, MAX_VIDEO_BYTES)

# Batas piksel untuk mencegah "decompression bomb" (gambar kecil -> piksel raksasa).
Image.MAX_IMAGE_PIXELS = int(os.environ.get("MAX_IMAGE_PIXELS", "40000000"))  # 40 MP

# Rate limit: RATE_LIMIT permintaan per RATE_WINDOW detik, per alamat IP.
RATE_LIMIT = int(os.environ.get("RATE_LIMIT", "60"))
RATE_WINDOW = int(os.environ.get("RATE_WINDOW", "60"))

# CORS: default "*" (demo publik). Untuk produksi set ke domain frontend, mis.
#   ALLOWED_ORIGINS="https://app-kamu.vercel.app,https://domain-kamu.com"
_origins_env = os.environ.get("ALLOWED_ORIGINS", "*").strip()
ALLOW_ORIGINS = ["*"] if _origins_env == "*" else [o.strip() for o in _origins_env.split(",") if o.strip()]

# /docs & /openapi.json dimatikan secara default (kurangi permukaan serang).
# Set ENABLE_DOCS=1 untuk mengaktifkan kembali.
ENABLE_DOCS = os.environ.get("ENABLE_DOCS", "0") == "1"

VIDEO_SUFFIXES = {".mp4", ".avi", ".mkv", ".mov", ".webm"}

app = FastAPI(
    title="Deteksi Helm Konstruksi — API",
    version="1.1",
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_DOCS else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    max_age=600,
)

# ----------------------------- Rate limiter -------------------------------
_rl_lock = threading.Lock()
_rl_hits: dict[str, deque] = {}


def _client_ip(request: Request) -> str:
    """Ambil IP klien; di belakang proxy HF gunakan X-Forwarded-For."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limited(ip: str) -> bool:
    """True bila IP sudah melewati kuota pada jendela waktu berjalan."""
    now = time.time()
    with _rl_lock:
        if len(_rl_hits) > 10000:  # jaga memori: buang yang kosong/lama
            _rl_hits.clear()
        dq = _rl_hits.setdefault(ip, deque())
        while dq and dq[0] <= now - RATE_WINDOW:
            dq.popleft()
        if len(dq) >= RATE_LIMIT:
            return True
        dq.append(now)
        return False


async def _read_limited(file: UploadFile, max_bytes: int) -> bytes | None:
    """Baca berkas dalam potongan; kembalikan None bila melebihi max_bytes."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1 << 20)  # 1 MB
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            return None
        chunks.append(chunk)
    return b"".join(chunks)


# --------------------------- Middleware global ----------------------------
@app.middleware("http")
async def security_guard(request: Request, call_next):
    # Tolak payload raksasa sedini mungkin (sebelum dibaca ke memori).
    cl = request.headers.get("content-length")
    if cl and cl.isdigit() and int(cl) > GLOBAL_MAX_BYTES:
        return JSONResponse({"error": "payload terlalu besar"}, status_code=413)
    response = await call_next(request)
    # Header keamanan dasar.
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


# ------------------------------- Startup ----------------------------------
print(f"[startup] memuat model: {MODEL_PATH}")
model = YOLO(MODEL_PATH, task="detect")
print("[startup] model siap.")


@app.get("/")
def health():
    # Tidak membocorkan path internal model.
    return {"status": "ok", "classes": CLASSES}


@app.post("/predict/image")
async def predict_image(
    request: Request,
    file: UploadFile = File(...),
    conf: float = Query(0.25, ge=0.01, le=0.95),
    iou: float = Query(0.45, ge=0.1, le=0.9),
):
    """Deteksi pada satu gambar. Balikan gambar beranotasi (base64) + ringkasan."""
    if _rate_limited(_client_ip(request)):
        return JSONResponse({"error": "terlalu banyak permintaan, coba lagi nanti"}, status_code=429)

    if file.content_type and not file.content_type.startswith("image/"):
        return JSONResponse({"error": "tipe berkas harus gambar"}, status_code=400)

    raw = await _read_limited(file, MAX_IMAGE_BYTES)
    if raw is None:
        return JSONResponse({"error": f"gambar melebihi batas {MAX_IMAGE_MB:.0f} MB"}, status_code=413)

    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Image.DecompressionBombError:
        return JSONResponse({"error": "resolusi gambar melebihi batas"}, status_code=400)
    except Exception:
        return JSONResponse({"error": "berkas gambar tidak valid"}, status_code=400)

    t0 = time.time()
    r = model.predict(np.array(img), conf=conf, iou=iou, imgsz=640, verbose=False)[0]
    dt = (time.time() - t0) * 1000

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
    request: Request,
    file: UploadFile = File(...),
    conf: float = Query(0.25, ge=0.01, le=0.95),
    iou: float = Query(0.45, ge=0.1, le=0.9),
    stride: int = Query(2, ge=1, le=10),  # proses tiap N frame (hemat CPU)
):
    """Deteksi pada video. Balikan MP4 (H.264) beranotasi.

    Catatan: di HF free (CPU), video panjang LAMBAT. Gunakan klip pendek (<= ~8 detik)
    dan/atau naikkan `stride`. ffmpeg me-re-encode ke H.264 agar bisa diputar di browser.
    """
    if _rate_limited(_client_ip(request)):
        return JSONResponse({"error": "terlalu banyak permintaan, coba lagi nanti"}, status_code=429)

    if file.content_type and not file.content_type.startswith("video/"):
        return JSONResponse({"error": "tipe berkas harus video"}, status_code=400)

    raw = await _read_limited(file, MAX_VIDEO_BYTES)
    if raw is None:
        return JSONResponse({"error": f"video melebihi batas {MAX_VIDEO_MB:.0f} MB"}, status_code=413)

    work = Path(tempfile.mkdtemp())
    try:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in VIDEO_SUFFIXES:
            suffix = ".mp4"
        inp = work / ("input" + suffix)
        inp.write_bytes(raw)

        model.predict(str(inp), conf=conf, iou=iou, imgsz=640, vid_stride=stride,
                      save=True, project=str(work), name="pred", exist_ok=True, verbose=False)

        pred_dir = work / "pred"
        raw_out = next((p for p in pred_dir.iterdir() if p.suffix.lower() in (".mp4", ".avi", ".mkv")), None) if pred_dir.exists() else None
        if raw_out is None:
            shutil.rmtree(work, ignore_errors=True)
            return JSONResponse({"error": "output video tidak ditemukan"}, status_code=500)

        out = work / "annotated.mp4"
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(raw_out), "-vcodec", "libx264", "-pix_fmt", "yuv420p",
                 "-movflags", "+faststart", str(out)],
                check=True, capture_output=True, timeout=120,
            )
            final = out
        except Exception:
            final = raw_out  # fallback: kirim apa adanya

        # Berkas sementara dibersihkan SETELAH respons terkirim.
        return FileResponse(
            str(final), media_type="video/mp4", filename="annotated.mp4",
            background=BackgroundTask(shutil.rmtree, str(work), ignore_errors=True),
        )
    except Exception:
        shutil.rmtree(work, ignore_errors=True)
        return JSONResponse({"error": "gagal memproses video"}, status_code=500)
