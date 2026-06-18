---
title: Deteksi Helm Konstruksi API
emoji: 🦺
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Backend FastAPI — Deteksi Helm Konstruksi (YOLO26s)

Inference server-side (ultralytics) untuk demo deteksi helm. **Isi repo ini =
isi Hugging Face Space (Docker).** Frontend-nya terpisah (di Vercel).

## Isi backend (yang WAJIB ada di Space)
```
backend-huggingface/        ← seluruh isi folder ini = root HF Space
├── README.md               # metadata Space (YAML di atas) — WAJIB & di root
├── Dockerfile              # base image + ffmpeg/libgl + uvicorn (port 7860)
├── requirements.txt        # fastapi, uvicorn, ultralytics, opencv-headless, pillow, numpy
├── app.py                  # FastAPI: /predict/image & /predict/video
├── .gitattributes          # *.pt lewat git-lfs
└── model/
    └── best.pt             # ← MODEL terlatih (taruh di sini)
```
> Header **YAML** di README.md ini (sdk: docker, app_port: 7860) WAJIB agar HF tahu
> cara menjalankan Space. Jangan dihapus.

## Endpoint
- `GET  /` — health check → `{"status":"ok",...}`.
- `POST /predict/image?conf=0.25&iou=0.45` — form-data `file` (gambar) → JSON
  `{annotated(base64), detections[], counts{}, no_helmet, total, time_ms}`.
- `POST /predict/video?conf=0.25&iou=0.45&stride=2` — form-data `file` (video) → `annotated.mp4` (H.264).

## Deploy ke Hugging Face Spaces
1. Salin model: `runs/train/helmet_yolo26s_baseline/weights/best.pt` → `model/best.pt`.
   (Backend pakai **best.pt langsung**, BUKAN ONNX.)
2. Buat Space baru → **SDK: Docker** → Blank.
3. Push/upload **seluruh isi folder ini** ke repo Space:
   ```bash
   git init && git lfs install
   git remote add origin https://huggingface.co/spaces/<user>/<space>
   git add . && git commit -m "backend deteksi helm"
   git push origin main
   ```
   `*.pt` otomatis lewat **git-lfs** (lihat `.gitattributes`). File besar juga bisa via
   tombol *Upload files* di UI Space.
4. Tunggu build. Cek `https://<user>-<space>.hf.space/` → `{"status":"ok",...}`.

## Catatan
- **Free tier = CPU.** Gambar cepat (~ratusan ms). Video: pakai klip pendek (≤ ~8 dtk)
  / naikkan `stride`. Space "tidur" saat idle (cold start request pertama).
- **CORS** dibuka `*`. Untuk produksi, batasi ke domain Vercel kamu di `app.py`.

## Uji lokal
```bash
pip install -r requirements.txt          # (butuh torch via ultralytics)
# taruh model di model/best.pt
uvicorn app:app --host 0.0.0.0 --port 7860   # buka http://localhost:7860
```
Video butuh `ffmpeg` ter-install (di Docker sudah otomatis).
