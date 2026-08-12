# Project Context & History

Durable, in-repo context for anyone (human or Claude Code) picking this repo up on a
new machine — it travels with `git clone` so the assistant is immediately "up to speed".
Complements `CLAUDE.md`. Point-in-time facts are dated; verify against current code/git
before relying on them.

## User preferences & working style
- Strongly prefers **many explanatory "why this / why those" visualizations** in
  notebooks — diagnostic visuals that justify design decisions, not bare plots. Favor a
  "❓ question → 📊 visual → 💡 why it matters" structure, executed so outputs are
  embedded inline.
- Works in **Indonesian**: write narration, comments, and report text in Indonesian to
  match the repo. The web UI is bilingual ID/EN.

## Model & results (REAL, not demo)
- `runs/train/helmet_yolo26s_baseline/` and `runs/tune/` are REAL (yolo26s, 50 epochs,
  imgsz 640, trained on an RTX 4060 Ti).
- Validation metrics (best.pt): **Precision 0.847, Recall 0.708, mAP@50 0.786,
  mAP@50-95 0.508**. Test set: mAP@50 0.648, mAP@50-95 0.405.
- The model is **conservative** (precision ≫ recall → it misses some objects). Tuning
  confirmed the baseline config is best. Note: Ultralytics `optimizer='auto'` IGNORES a
  user-set `lr0` — this explains why tuning experiments looked identical.
- The SafetyAI **About** page shows these REAL numbers; the **Dashboard** is clearly
  labelled illustrative demo data (no real scan history exists yet).

## Apps in this repo (beyond the training pipeline)
- **`safetyai/`** — the active frontend: React + Vite + TypeScript, bilingual ID/EN,
  fully responsive (Home / Detect / Dashboard / About). It replaced an older static
  `frontend-vercel/` (now deleted). It performs **no in-browser inference** — it sends
  images/video to the backend. Backend URL comes from `safetyai/public/config.js`
  (`window.API_BASE`, runtime override) and wins over build-time `VITE_API_BASE`.
- **`backend-huggingface/`** — FastAPI inference API (ultralytics). Endpoints:
  `GET /` (health), `POST /predict/image`, `POST /predict/video`.

## Running locally
- **Backend:** use the project `.venv` python (has torch cu128). The venv once lacked
  pip → bootstrap with `python -m ensurepip --upgrade`; then install
  `fastapi uvicorn[standard] python-multipart` (ultralytics/torch/cv2/pillow/numpy
  already present). Needs `backend-huggingface/model/best.pt` (copy from
  `runs/train/helmet_yolo26s_baseline/weights/best.pt`, ~20 MB). Run:
  `uvicorn app:app --host 0.0.0.0 --port 7860 --app-dir backend-huggingface`
  (bind `0.0.0.0` for LAN/Tailscale access). First inference ~6 s warmup, then
  ~80 ms/img on GPU. `ffmpeg` required for the video endpoint.
- **Frontend:** `cd safetyai && npm install && npm run dev` → http://localhost:3000.

## Deployment
- **Backend → Hugging Face Docker Space** `naufalfirdaus/deteksi-helm-api`.
  Live API: **https://naufalfirdaus-deteksi-helm-api.hf.space**. Deployed via the `hf`
  CLI: `hf repo create <user>/deteksi-helm-api --repo-type space --space_sdk docker`,
  then `hf upload <user>/deteksi-helm-api ./backend-huggingface . --repo-type space`
  (`best.pt` handled by LFS automatically). Re-run that `hf upload` to push updates.
  Namespace before `/` must be the username, not the space name.
- **Frontend:** `cd safetyai && npm run build` → serve the static `dist/` on any host
  (Vercel / VPS / nginx). Set `window.API_BASE` (config.js) to the HF URL for production.
- **Cold start is real and must stay handled.** A free HF Space sleeps after ~48 h idle
  and wakes on the first HTTP request, but that request can hang ~60 s (measured
  2026-08-12: first `GET /` returned nothing after 60 s, the next returned
  `{"status":"ok"}` instantly). So `safetyai/src/api.ts` deliberately does **not** use a
  plain one-shot `fetch` for health: `warmUpBackend()` is a singleton that retries
  `GET /` with an 8 s per-attempt timeout and backoff up to a 120 s budget, publishing
  `"waking" | "ready" | "error"` to subscribers. `App.tsx` fires it on app mount (so the
  Space warms while the visitor reads Home, not when they open Detect), and
  `predictImage`/`predictVideo` `await ensureAwake()` so an upload during cold start
  waits instead of failing. Don't "simplify" this back into a single fetch — the UI will
  falsely report a dead server. Note `"error"` here usually means the Space is **paused**
  (needs a manual restart in the HF dashboard), not merely asleep.

## Security hardening (already applied; QA 22/22 local + live)
Backend (`backend-huggingface/app.py` v1.1 + `Dockerfile`):
- Per-IP rate limit, upload size caps (image 10 MB / video 40 MB, early 413),
  PIL decompression-bomb guard, temp-dir cleanup via BackgroundTask, generic error
  messages, security headers (nosniff / X-Frame-Options DENY / Referrer-Policy),
  non-root Docker user (uid 1000), `/docs` disabled, runtime auto-install disabled
  (`YOLO_AUTOINSTALL=false`), `pi-heif` pinned at build for deterministic startup.
- Tunable via HF Space **Variables**: `ALLOWED_ORIGINS` (default `*` — set to the
  frontend domain in prod), `RATE_LIMIT`/`RATE_WINDOW` (60/60s), `MAX_IMAGE_MB` (10),
  `MAX_VIDEO_MB` (40), `ENABLE_DOCS` (0).

Frontend: `safetyai/vercel.json` (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy,
Permissions-Policy) + `safetyai/vite.config.ts` modulePreload polyfill disabled so a
strict `script-src 'self'` CSP works. Verify the CSP in a real browser after deploy.

## Not in git (rebuild/re-fetch on a new machine)
`dataset/`, `dataset.zip`, `runs/`, `*.pt`/`*.onnx` weights, `.venv/`, and
`safetyai/node_modules/` are git-ignored (large). The trained model is already live on
the HF Space, so the backend does not need a local `best.pt` to serve. Re-download the
dataset (Roboflow) and weights only if you intend to retrain.
