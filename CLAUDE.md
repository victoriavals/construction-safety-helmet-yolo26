# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A YOLO object-detection project for **construction-safety helmet detection**: a Roboflow-exported dataset plus a pipeline of modular Python scripts (`src/`) — mirrored by a parallel Jupyter notebook suite (`notebooks/`) — that train, evaluate, tune, run inference with, and export a **YOLO26 small** model (`yolo26s.pt`). The dataset is a verbatim Roboflow export and is treated as **read-only** by every script. (A separate web demo lives in `safetyai/` + `backend-huggingface/` — see the bottom section.)

- **Classes (`nc: 3`):** `0=Helmet` (person wearing a helmet), `1=No-Helmet` (person without), `2=Person`.
- Dataset source: Roboflow `naufalfirdaus/construction-safety-helmet-lnit7`, CC BY 4.0. `dataset/` and `dataset.zip` (~1.3 GB) are git-ignored and not tracked. Splits: train 15,555 / valid 1,945 / test 1,945 images; one `.txt` per image with YOLO normalized `class cx cy w h` boxes (an image may have no label file).
- Comments, docstrings, and report output are written in **Indonesian** — match that when editing existing scripts.

## Commands

Run everything **from the project root** (scripts use root-relative `pathlib` paths). Typical end-to-end flow:

```bat
python src/check_gpu.py                                          :: verify PyTorch/CUDA/GPU
python src/validate_dataset.py --data dataset/data.yaml          :: integrity check -> runs/dataset_validation/
python src/eda.py --data dataset/data.yaml                       :: dataset analysis -> runs/eda/
python src/train.py --config config.yaml                         :: baseline training -> runs/train/
python src/evaluate.py --weights runs/train/helmet_yolo26s_baseline/weights/best.pt --data dataset/data.yaml
python src/tune.py --data dataset/data.yaml                      :: up to 4 curated experiments -> runs/tune/
python src/infer.py --weights .../best.pt --source path/to/image.jpg --conf 0.25
python src/export_model.py --weights .../best.pt --format onnx   :: onnx|torchscript|tensorrt (comma-separated ok)
```

Useful flags: `--allow-cpu` (evaluate/infer/tune when no CUDA), `--dry-run` and `--max-exp N` (tune), `--img-sample N` (eda), `--save-txt`/`--save-conf`/`--show` (infer), `--quick` (validate_dataset — skips the slow corrupt-image scan).

Web demo (see the bottom section for context):

```bat
uvicorn app:app --host 0.0.0.0 --port 7860 --app-dir backend-huggingface   :: FastAPI inference API
cd safetyai && npm install && npm run dev                                 :: frontend -> http://localhost:3000
cd safetyai && npm run lint                                               :: tsc --noEmit (the only lint in the repo)
cd safetyai && npm run build                                              :: static bundle -> safetyai/dist/
python build_presentation.py                                              :: PPTX + script -> presentasi/
```

- **Setup:** install PyTorch **CUDA** first per https://pytorch.org/get-started/locally/ (intentionally *not* pinned in `requirements.txt`), then `pip install -r requirements.txt`.
- **No Python tests, linter, or CI exist.** There is no `pytest`, CI, or packaging config — running a script is the only verification on the Python side. The frontend is the only part with tooling (`npm run lint` = `tsc --noEmit`, `npm run build`). If you add Python tests, add the tooling too.
- **Notebooks mirror `src/`.** `notebooks/` holds an executed, inline-visualization version of the pipeline (`01_check_gpu`, `02_eda`, `02b_preprocessing`, `03_train` … `07_export_model`) — the surface the user actually works in. Run in VS Code / Jupyter, or headless: `jupyter nbconvert --to notebook --execute --inplace notebooks/02_eda.ipynb`. Use the `.venv` Jupyter kernel registered as **`helmet-yolo26`** (global Python is CPU-only). Their viz cells auto-export figures to `presentation_figures/` via a `plt.show` hook in each Setup cell, so re-running a notebook refreshes those PNGs.

## Architecture

**`config.yaml` is the single source of defaults for `train.py` only.** Precedence is **CLI arg > `config.yaml` > hard-coded `HARD_DEFAULTS`** (see `resolve_params` in `train.py`). The config key is `data_yaml:` but scripts also accept `data:`. The other scripts (`evaluate`, `infer`, `export_model`, `tune`) do **not** read `config.yaml` — they carry their own `DEFAULTS` dicts and argparse defaults, so editing `config.yaml` only affects training.

**`tune.py` reuses `train.py` as a library.** It does `import train as T` (after inserting `src/` on `sys.path`) and calls `T.build_batch_candidates`, `T.check_cuda_and_gpu`, `T.free_cuda`, `T._is_oom_error`, `T.extract_metrics`. When changing those functions in `train.py`, verify `tune.py` still works. `tune.py` hard-refuses non-small models (`FORBIDDEN_MODEL_HINTS = ("m.pt", "l.pt", "x.pt", "yolo26m", "yolo26l", "yolo26x")`) to protect the 8 GB GPU target, and runs at most 4 curated experiments (`EXPERIMENTS`, capped by `--max-exp`, default 4). Winner selection is deliberately fuzzy — `MAP_TOL = 0.005` / `RECALL_TOL = 0.01` treat near-identical scores as ties. **Note before adding experiments:** all four `EXPERIMENTS` differ only in `lr0`/`weight_decay`/`epochs`, and Ultralytics' `optimizer='auto'` *ignores* a user-set `lr0` — which is why the completed tuning run produced near-identical results. A new lr sweep will burn GPU hours for nothing unless you also set `optimizer=` explicitly.

**`eda.py` is dual-purpose** — a CLI *and* a library imported by `notebooks/02_eda.ipynb` via its public functions (`load_dataset_config`, `resolve_splits`, `analyze`, `make_figures`, `write_outputs`, `build_report_text`, `run_eda`). Keep those signatures stable. Its `main()` forces the `Agg` matplotlib backend; the notebook does not.

**Every notebook self-bootstraps to the project root.** Each Setup cell runs a `find_project_root()` walk (looking for a dir containing both `src/` and `dataset/`), then `os.chdir(PROJECT_ROOT)` and `sys.path.insert(0, str(SRC))` — that is why notebooks can use the same root-relative paths as the scripts and can `import eda`/`train` directly. Keep that cell intact when editing notebooks.

**Figures flow notebooks → `presentation_figures/` → `presentasi/`.** The Setup cell monkey-patches `plt.show` to auto-save each figure as `presentation_figures/<nb-name>_NN.png`, and it **deletes all existing `<nb-name>_*.png` first** — so re-running a notebook that emits fewer plots than before drops the extras, and figure numbering shifts. Unlike `runs/`, `presentation_figures/` **is tracked in git** (33 PNGs), so those deletions show up as real diffs. `build_presentation.py` then reads those PNGs plus files under `runs/` and writes `presentasi/Presentasi_Helmet_YOLO26.pptx` + `Script_Presentasi.md`; per its docstring it runs on **global** Python (needs `python-pptx`), not the `.venv`. Missing images degrade to a red placeholder box instead of failing.

**Frontend ↔ backend contract.** `safetyai/src/api.ts` resolves the base URL as `window.API_BASE` (runtime, from `safetyai/public/config.js`) → `VITE_API_BASE` (build-time) → empty, then calls `GET /` (health), `POST /predict/image`, `POST /predict/video` with `?conf=&iou=` — matching `backend-huggingface/app.py`. Because `public/config.js` is copied verbatim into `dist/`, the deployed backend URL can be changed without rebuilding; it also defaults to the current page host on port 7860 for local/LAN use. Changing a response shape means editing both `app.py` and `api.ts`.

**Cross-cutting conventions (replicated in every script — keep them consistent):**

- **Absolute `project` paths.** Ultralytics resolves a *relative* `project=` against its own `RUNS_DIR/<task>/` (e.g. `runs/detect/...`), scattering output. Every script does `Path(...).resolve()` before passing `project=` so output lands exactly in `runs/{train,evaluate,tune,infer,export}`. Preserve this when adding Ultralytics calls.
- **OOM batch fallback.** `train.py` and `tune.py` retry training at successively smaller batches on CUDA OOM (`build_batch_candidates` + `_is_oom_error`). The sequence is *your* batch followed by `DEFAULT_FALLBACK_BATCHES = [8, 4, 2]`, deduped and strictly decreasing — so the default `batch: 8` gives 8→4→2, but `--batch 16` gives 16→8→4→2 and `--batch 3` gives just 3→2. Non-OOM errors are re-raised (train) or recorded and skipped (tune — a failed experiment never stops the run; results CSV is written incrementally).
- **Robust metric extraction.** `extract_metrics`/`extract_overall` read precision/recall/mAP50/mAP50-95 from several sources in order (`results.box` → `results_dict` → `trainer.metrics` → parsing `results.csv`) because the available source varies by Ultralytics version. Missing values become `None` and render as `N/A` rather than crashing.
- **Split path resolution** (`resolve_splits` in eda, `resolve_images_dir` in evaluate): tolerant of Roboflow's `../` prefixes and the `valid` vs `val` naming mismatch. The yaml key is `val:` mapping to the physical `valid/` folder.
- Scripts return meaningful exit codes (`0` ok, `1` runtime failure, `2` bad input/env, `130` interrupted) and write a human-readable `*_summary.txt`/report alongside CSVs in their `runs/` subdir.

## Known gotchas

- **`README.md` is stale about `notebooks/`.** It lists a single `notebooks/01_eda.ipynb` and claims notebooks are "EDA & visualisasi only" while scripts do the training; in reality a full mirrored suite exists (`01`…`07`, incl. `03_train.ipynb`), and the EDA notebook is `02_eda.ipynb`. Trust the actual files over `README.md`. (`README.md` *is* accurate about `src/validate_dataset.py` — that script now exists, added in `d2094e7`; earlier versions of this file wrongly said it didn't.)
- **`data.yaml` path resolution.** The Roboflow export defines `train/val/test` as `../train/images` etc. with no `path:` key. The project scripts handle the `../` prefix and `valid`/`val` themselves, but a raw `yolo detect ...` CLI invocation may not — add a `path:` key pointing at `dataset/`, or rewrite the entries to `train/images`, `valid/images`, `test/images`, if a run can't find images.
- The dataset contains a few stray segmentation-style labels (not 5-column boxes); `eda.py`'s `_parse_boxes` and Ultralytics both silently drop them.
- `yolo26s.pt` needs an Ultralytics version with YOLO26 support; weights auto-download on first use (needs internet).
- **Two static-frontend folders exist; only `safetyai/` is active.** The current frontend is `safetyai/` (React + Vite, see bottom section). `webdemo/` is an older plain-HTML/JS static demo, and docs may still mention a now-deleted `frontend-vercel/` — don't edit `webdemo/` expecting it to be the live app.

## Conventions for adding code

Keep `dataset/` untouched (verbatim Roboflow export; scripts are read-only against it). All experiment output goes under `runs/` (git-ignored except `.gitkeep`); model weights (`*.pt`, `*.onnx`, etc.) are git-ignored *anywhere* in the tree — which is why `backend-huggingface/model/` ships only a `README.txt` and you must copy `best.pt` in by hand for local backend runs. New scripts should follow the existing pattern: root-relative paths, argparse with sensible defaults, absolute `project=` for Ultralytics, graceful `--allow-cpu` handling, and a written summary in `runs/`.

## Project context, status & web demo

Beyond the training pipeline above, this repo also ships a **web demo**: `safetyai/`
(React + Vite frontend, bilingual ID/EN) and `backend-huggingface/` (FastAPI inference
API, deployed to a Hugging Face Docker Space). For carried-over working context — user
preferences, the REAL trained-model metrics, how to run the full stack locally,
deployment URLs, and the security hardening that has been applied — read the companion
doc, which is imported below so it loads automatically:

@docs/CONTEXT.md
