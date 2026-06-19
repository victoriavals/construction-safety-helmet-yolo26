# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A YOLO object-detection project for **construction-safety helmet detection**: a Roboflow-exported dataset plus a pipeline of modular Python scripts (`src/`) and an EDA notebook that train, evaluate, tune, run inference with, and export a **YOLO26 small** model (`yolo26s.pt`). The dataset is a verbatim Roboflow export and is treated as **read-only** by every script.

- **Classes (`nc: 3`):** `0=Helmet` (person wearing a helmet), `1=No-Helmet` (person without), `2=Person`.
- Dataset source: Roboflow `naufalfirdaus/construction-safety-helmet-lnit7`, CC BY 4.0. `dataset/` and `dataset.zip` (~1.3 GB) are git-ignored and not tracked. Splits: train 15,555 / valid 1,945 / test 1,945 images; one `.txt` per image with YOLO normalized `class cx cy w h` boxes (an image may have no label file).
- Comments, docstrings, and report output are written in **Indonesian** — match that when editing existing scripts.

## Commands

Run everything **from the project root** (scripts use root-relative `pathlib` paths). Typical end-to-end flow:

```bat
python src/check_gpu.py                                          :: verify PyTorch/CUDA/GPU
python src/eda.py --data dataset/data.yaml                       :: dataset analysis -> runs/eda/
python src/train.py --config config.yaml                         :: baseline training -> runs/train/
python src/evaluate.py --weights runs/train/helmet_yolo26s_baseline/weights/best.pt --data dataset/data.yaml
python src/tune.py --data dataset/data.yaml                      :: up to 4 curated experiments -> runs/tune/
python src/infer.py --weights .../best.pt --source path/to/image.jpg --conf 0.25
python src/export_model.py --weights .../best.pt --format onnx   :: onnx|torchscript|tensorrt (comma-separated ok)
```

Useful flags: `--allow-cpu` (evaluate/infer/tune when no CUDA), `--dry-run` and `--max-exp N` (tune), `--img-sample N` (eda), `--save-txt`/`--save-conf`/`--show` (infer).

- **Setup:** install PyTorch **CUDA** first per https://pytorch.org/get-started/locally/ (intentionally *not* pinned in `requirements.txt`), then `pip install -r requirements.txt`.
- **No test suite, linter, or build step exists.** There is no `pytest`, CI, or packaging config — running a script is the only verification. If you add tests, add the tooling too.

## Architecture

**`config.yaml` is the single source of defaults for `train.py` only.** Precedence is **CLI arg > `config.yaml` > hard-coded `HARD_DEFAULTS`** (see `resolve_params` in `train.py`). The config key is `data_yaml:` but scripts also accept `data:`. The other scripts (`evaluate`, `infer`, `export_model`, `tune`) do **not** read `config.yaml` — they carry their own `DEFAULTS` dicts and argparse defaults, so editing `config.yaml` only affects training.

**`tune.py` reuses `train.py` as a library.** It does `import train as T` (after inserting `src/` on `sys.path`) and calls `T.build_batch_candidates`, `T.check_cuda_and_gpu`, `T.free_cuda`, `T._is_oom_error`, `T.extract_metrics`. When changing those functions in `train.py`, verify `tune.py` still works. `tune.py` hard-refuses non-small models (`FORBIDDEN_MODEL_HINTS`) to protect the 8 GB GPU target and runs at most 4 curated experiments.

**`eda.py` is dual-purpose** — a CLI *and* a library imported by `notebooks/01_eda.ipynb` via its public functions (`load_dataset_config`, `resolve_splits`, `analyze`, `make_figures`, `write_outputs`, `build_report_text`, `run_eda`). Keep those signatures stable. Its `main()` forces the `Agg` matplotlib backend; the notebook does not.

**Cross-cutting conventions (replicated in every script — keep them consistent):**

- **Absolute `project` paths.** Ultralytics resolves a *relative* `project=` against its own `RUNS_DIR/<task>/` (e.g. `runs/detect/...`), scattering output. Every script does `Path(...).resolve()` before passing `project=` so output lands exactly in `runs/{train,evaluate,tune,infer,export}`. Preserve this when adding Ultralytics calls.
- **OOM batch fallback 8→4→2.** `train.py` and `tune.py` retry training at successively smaller batches on CUDA OOM (`build_batch_candidates` + `_is_oom_error`). Non-OOM errors are re-raised (train) or recorded and skipped (tune — a failed experiment never stops the run; results CSV is written incrementally).
- **Robust metric extraction.** `extract_metrics`/`extract_overall` read precision/recall/mAP50/mAP50-95 from several sources in order (`results.box` → `results_dict` → `trainer.metrics` → parsing `results.csv`) because the available source varies by Ultralytics version. Missing values become `None` and render as `N/A` rather than crashing.
- **Split path resolution** (`resolve_splits` in eda, `resolve_images_dir` in evaluate): tolerant of Roboflow's `../` prefixes and the `valid` vs `val` naming mismatch. The yaml key is `val:` mapping to the physical `valid/` folder.
- Scripts return meaningful exit codes (`0` ok, `1` runtime failure, `2` bad input/env, `130` interrupted) and write a human-readable `*_summary.txt`/report alongside CSVs in their `runs/` subdir.

## Known gotchas

- **`src/validate_dataset.py` does NOT exist** despite being referenced throughout `README.md` (workflow table, troubleshooting) and in `train.py` comments. Commands like `python src/validate_dataset.py ...` will fail; the script would have to be written first.
- **`data.yaml` path resolution.** The Roboflow export defines `train/val/test` as `../train/images` etc. with no `path:` key. The project scripts handle the `../` prefix and `valid`/`val` themselves, but a raw `yolo detect ...` CLI invocation may not — add a `path:` key pointing at `dataset/`, or rewrite the entries to `train/images`, `valid/images`, `test/images`, if a run can't find images.
- The dataset contains a few stray segmentation-style labels (not 5-column boxes); `eda.py`'s `_parse_boxes` and Ultralytics both silently drop them.
- `yolo26s.pt` needs an Ultralytics version with YOLO26 support; weights auto-download on first use (needs internet).

## Conventions for adding code

Keep `dataset/` untouched (verbatim Roboflow export; scripts are read-only against it). All experiment output goes under `runs/` (git-ignored except `.gitkeep`); model weights (`*.pt`, `*.onnx`, etc.) are git-ignored. New scripts should follow the existing pattern: root-relative paths, argparse with sensible defaults, absolute `project=` for Ultralytics, graceful `--allow-cpu` handling, and a written summary in `runs/`.

## Project context, status & web demo

Beyond the training pipeline above, this repo also ships a **web demo**: `safetyai/`
(React + Vite frontend, bilingual ID/EN) and `backend-huggingface/` (FastAPI inference
API, deployed to a Hugging Face Docker Space). For carried-over working context — user
preferences, the REAL trained-model metrics, how to run the full stack locally,
deployment URLs, and the security hardening that has been applied — read the companion
doc, which is imported below so it loads automatically:

@docs/CONTEXT.md
