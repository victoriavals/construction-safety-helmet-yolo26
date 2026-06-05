# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A construction-safety helmet object-detection dataset exported from Roboflow in **YOLO** format, intended for training a YOLO model (the repo name references YOLO26). As of now the repo contains **only the dataset** — there is no training, inference, or evaluation code, and nothing is committed to git yet (`dataset/` and `dataset.zip` are untracked).

Source: Roboflow project `naufalfirdaus/construction-safety-helmet-lnit7`, exported 2026-06-04, license CC BY 4.0. `dataset.zip` (~1.3 GB) is the original export archive; `dataset/` is its extracted contents.

## Dataset structure

```
dataset/
  data.yaml            # YOLO data config consumed by Ultralytics
  train/{images,labels}   # 15,555 images
  valid/{images,labels}   #  1,945 images
  test/{images,labels}    #  1,945 images
```

- **Classes (`nc: 3`):** `0=Helmet`, `1=No-Helmet`, `2=Person`.
- **Label format:** one `.txt` per image, YOLO normalized boxes — `class cx cy w h` (values 0–1). An image may have no label file when it has no objects.
- Filenames carry Roboflow hashes (e.g. `..._jpg.rf.<hash>.txt`); each label `.txt` pairs with the same-stem image in the sibling `images/` dir.

## Working with the dataset

Train/eval uses the Ultralytics CLI or Python API against `dataset/data.yaml`, e.g. `yolo detect train data=dataset/data.yaml model=yolo26n.pt`. Before running, note:

- **Path resolution gotcha:** `data.yaml` defines `train/val/test` as `../train/images` etc. with no `path:` key. Ultralytics resolves these relative to its configured datasets root (or the yaml location), so the `../` prefix often points outside `dataset/` and fails. If a run can't find images, either add a `path:` key pointing at the `dataset/` dir or change the entries to `train/images`, `valid/images`, `test/images`.
- The yaml key is `val:` (maps to `valid/images`), not `valid:`.

## Conventions for adding code

When introducing training/inference scripts here, keep the dataset directory untouched (it's a verbatim Roboflow export) and add a `.gitignore` before committing — `dataset/` and especially `dataset.zip` are large and should generally not be tracked in git.
