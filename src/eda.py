"""
eda.py
======
Exploratory Data Analysis (EDA) untuk dataset YOLO (object detection).

Menganalisis dataset dari data.yaml: jumlah gambar/label/bbox per split,
distribusi kelas + persentase, gambar tanpa anotasi, bbox per gambar, statistik
ukuran gambar, statistik bounding box, potensi class imbalance, dan indikasi
objek kecil (small object) berdasarkan area bbox relatif.

Output (runs/eda/):
  eda_summary.csv, class_distribution.csv, bbox_statistics.csv,
  image_statistics.csv, eda_report.txt, figures/*.png

Jalankan dari ROOT project (Windows):
    python src/eda.py --data dataset/data.yaml
    python src/eda.py --data dataset/data.yaml --img-sample 4000   # percepat baca ukuran gambar

Fungsi publik (dipakai oleh notebooks/01_eda.ipynb):
    load_dataset_config, resolve_splits, analyze, make_figures,
    write_outputs, build_report_text, run_eda

Catatan: READ-ONLY terhadap dataset (tidak menghapus / mengubah file asli).
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

# --- Konstanta ---
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

SPLITS = [
    ("train", ["train"], ["train"]),
    ("valid", ["valid", "val"], ["val", "valid"]),
    ("test", ["test"], ["test"]),
]

# Ambang skala objek mengikuti definisi gaya COCO pada imgsz 640
# (small < 32^2 px, medium < 96^2 px). Dinyatakan sebagai AREA RELATIF terhadap gambar.
SMALL_AREA_THR = (32 * 32) / (640 * 640)    # ~0.0025
MEDIUM_AREA_THR = (96 * 96) / (640 * 640)   # ~0.0225


def _line(char: str = "=", width: int = 64) -> str:
    return char * width


# --------------------------------------------------------------------------- #
# Konfigurasi dataset & path
# --------------------------------------------------------------------------- #
def load_dataset_config(data_yaml: Path) -> tuple[dict, list[str], int, Path]:
    """Baca data.yaml -> (data, class_names, nc, dataset_root)."""
    data_yaml = Path(data_yaml)
    if not data_yaml.is_file():
        raise FileNotFoundError(f"data.yaml tidak ditemukan: {data_yaml}")
    try:
        import yaml
    except ImportError as exc:
        raise RuntimeError("PyYAML belum terinstal. Jalankan: pip install -r requirements.txt") from exc
    with data_yaml.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    if not isinstance(data, dict):
        raise RuntimeError("Isi data.yaml tidak valid (bukan mapping).")

    names = data.get("names")
    if isinstance(names, dict):
        class_names = [str(names[k]) for k in sorted(names, key=lambda x: int(x))]
    elif isinstance(names, (list, tuple)):
        class_names = [str(n) for n in names]
    else:
        class_names = []
    nc = data.get("nc", len(class_names))
    if not isinstance(nc, int) or nc <= 0:
        nc = len(class_names)
    if len(class_names) < nc:
        class_names += [f"class_{i}" for i in range(len(class_names), nc)]
    elif len(class_names) > nc:
        class_names = class_names[:nc]
    if nc <= 0:
        raise RuntimeError("Jumlah kelas (nc/names) tidak valid di data.yaml.")

    root = data_yaml.parent.resolve()
    return data, class_names, nc, root


def resolve_splits(root: Path, data: dict) -> dict[str, tuple[Path, Path]]:
    """Tentukan folder (images, labels) tiap split yang ADA.

    Tahan terhadap path '../' khas Roboflow & nama folder `valid`/`val`.
    """
    found: dict[str, tuple[Path, Path]] = {}
    for split_name, folder_cands, key_cands in SPLITS:
        raw_value = next((data.get(k) for k in key_cands if data.get(k)), None)
        images_dir = None
        if isinstance(raw_value, str) and raw_value.strip():
            cand = (root / raw_value).resolve()
            if cand.is_dir():
                images_dir = cand
        if images_dir is None:
            for name in folder_cands:
                cand = root / name / "images"
                if cand.is_dir():
                    images_dir = cand
                    break
        if images_dir is None:
            continue
        labels_dir = images_dir.parent / "labels"
        if not labels_dir.is_dir():
            continue
        found[split_name] = (images_dir, labels_dir)
    return found


def _list_images(images_dir: Path) -> list[Path]:
    return sorted(p for p in images_dir.iterdir() if p.suffix.lower() in IMAGE_EXTS)


def _parse_boxes(label_path: Path, nc: int) -> list[tuple[int, float, float, float, float]]:
    """Kembalikan daftar bbox valid (cid, x, y, w, h) dari satu file label.

    Hanya baris berformat deteksi (tepat 5 kolom, class_id integer dalam rentang,
    koordinat float, w>0, h>0). Baris lain (mis. poligon) diabaikan untuk EDA.
    """
    boxes: list[tuple[int, float, float, float, float]] = []
    try:
        text = label_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return boxes
    for raw in text.splitlines():
        raw = raw.strip()
        if not raw:
            continue
        parts = raw.split()
        if len(parts) != 5:
            continue
        try:
            cid = int(parts[0])
            x, y, w, h = (float(v) for v in parts[1:])
        except ValueError:
            continue
        if cid < 0 or cid >= nc:
            continue
        if w <= 0 or h <= 0:
            continue
        boxes.append((cid, x, y, w, h))
    return boxes


# --------------------------------------------------------------------------- #
# Analisis utama
# --------------------------------------------------------------------------- #
def analyze(data_yaml, img_sample: int | None = None) -> dict:
    """Analisis dataset penuh. Kembalikan dict hasil EDA.

    Args:
        data_yaml : path ke data.yaml
        img_sample: jika diisi, baca ukuran (hanya) sejumlah sampel gambar acak
                    per dataset untuk mempercepat (statistik ukuran jadi perkiraan).
    """
    import numpy as np

    data, class_names, nc, root = load_dataset_config(Path(data_yaml))
    splits = resolve_splits(root, data)
    if not splits:
        raise RuntimeError("Tidak ada split (train/valid/test) yang bisa ditemukan.")

    try:
        from tqdm import tqdm
    except ImportError:  # progress opsional
        def tqdm(x, **kwargs):
            return x

    per_split: dict[str, dict] = {}
    class_counts_total = {c: 0 for c in range(nc)}

    all_bbox_w: list[float] = []
    all_bbox_h: list[float] = []
    all_bbox_area: list[float] = []
    all_bboxes_per_image: list[int] = []
    all_img_w: list[int] = []
    all_img_h: list[int] = []

    rng = np.random.default_rng(42)

    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("Pillow belum terinstal. Jalankan: pip install -r requirements.txt") from exc

    for split, (images_dir, labels_dir) in splits.items():
        images = _list_images(images_dir)
        label_files = sorted(p for p in labels_dir.iterdir() if p.suffix.lower() == ".txt")

        class_counts = {c: 0 for c in range(nc)}
        boxes_by_stem: dict[str, int] = {}
        n_bboxes = 0

        for lbl in tqdm(label_files, desc=f"[{split}] labels", unit="file", leave=False):
            boxes = _parse_boxes(lbl, nc)
            boxes_by_stem[lbl.stem] = len(boxes)
            n_bboxes += len(boxes)
            for cid, _x, _y, w, h in boxes:
                class_counts[cid] += 1
                class_counts_total[cid] += 1
                all_bbox_w.append(w)
                all_bbox_h.append(h)
                all_bbox_area.append(w * h)

        # bbox per gambar & gambar tanpa anotasi
        n_no_anno = 0
        for img in images:
            cnt = boxes_by_stem.get(img.stem, 0)
            all_bboxes_per_image.append(cnt)
            if cnt == 0:
                n_no_anno += 1

        # ukuran gambar (opsional sampling)
        scan = images
        if img_sample and img_sample < len(images):
            idx = rng.choice(len(images), size=img_sample, replace=False)
            scan = [images[i] for i in idx]
        for img in tqdm(scan, desc=f"[{split}] image sizes", unit="img", leave=False):
            try:
                with Image.open(img) as im:
                    w, h = im.size
                all_img_w.append(int(w))
                all_img_h.append(int(h))
            except Exception:
                continue  # gambar rusak dilewati (dilaporkan di validate_dataset.py)

        per_split[split] = {
            "n_images": len(images),
            "n_labels": len(label_files),
            "n_bboxes": n_bboxes,
            "n_images_no_anno": n_no_anno,
            "class_counts": class_counts,
            "avg_bboxes_per_image": (n_bboxes / len(images)) if images else 0.0,
        }

    # --- agregasi numpy ---
    bbox_w = np.array(all_bbox_w, dtype=float)
    bbox_h = np.array(all_bbox_h, dtype=float)
    bbox_area = np.array(all_bbox_area, dtype=float)
    bpi = np.array(all_bboxes_per_image, dtype=int)
    img_w = np.array(all_img_w, dtype=int)
    img_h = np.array(all_img_h, dtype=int)

    total_bboxes = int(bbox_area.size)

    # distribusi kelas (persentase terhadap total bbox)
    class_pct = {
        c: (100.0 * class_counts_total[c] / total_bboxes if total_bboxes else 0.0)
        for c in range(nc)
    }

    # class imbalance
    nonzero = {c: v for c, v in class_counts_total.items() if v > 0}
    if nonzero:
        imbalance_ratio = max(nonzero.values()) / min(nonzero.values())
    else:
        imbalance_ratio = 0.0
    empty_classes = [c for c, v in class_counts_total.items() if v == 0]

    # small object analysis
    if total_bboxes:
        frac_small = float((bbox_area < SMALL_AREA_THR).mean())
        frac_medium = float(((bbox_area >= SMALL_AREA_THR) & (bbox_area < MEDIUM_AREA_THR)).mean())
        frac_large = float((bbox_area >= MEDIUM_AREA_THR).mean())
        median_area = float(np.median(bbox_area))
    else:
        frac_small = frac_medium = frac_large = median_area = 0.0
    small_object_dataset = frac_small >= 0.40

    return {
        "data_yaml": Path(data_yaml),
        "root": root,
        "class_names": class_names,
        "nc": nc,
        "splits": list(splits.keys()),
        "per_split": per_split,
        "class_counts_total": class_counts_total,
        "class_pct": class_pct,
        "total_bboxes": total_bboxes,
        # arrays
        "bbox_w": bbox_w,
        "bbox_h": bbox_h,
        "bbox_area": bbox_area,
        "bboxes_per_image": bpi,
        "img_w": img_w,
        "img_h": img_h,
        # turunan
        "imbalance_ratio": imbalance_ratio,
        "empty_classes": empty_classes,
        "frac_small": frac_small,
        "frac_medium": frac_medium,
        "frac_large": frac_large,
        "median_area": median_area,
        "small_object_dataset": small_object_dataset,
        "img_sampled": bool(img_sample),
    }


# --------------------------------------------------------------------------- #
# Output: CSV & report
# --------------------------------------------------------------------------- #
def _safe_stat(arr, fn, default=0.0):
    import numpy as np
    return float(fn(arr)) if getattr(arr, "size", 0) else default


def write_outputs(result: dict, out_dir: Path) -> None:
    import numpy as np
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    def _csv(name, header, rows):
        with (out_dir / name).open("w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(header)
            w.writerows(rows)

    # eda_summary.csv
    rows = []
    tot = {"img": 0, "lbl": 0, "bbox": 0, "noanno": 0}
    for s in result["splits"]:
        d = result["per_split"][s]
        rows.append([s, d["n_images"], d["n_labels"], d["n_bboxes"],
                     d["n_images_no_anno"], round(d["avg_bboxes_per_image"], 3)])
        tot["img"] += d["n_images"]; tot["lbl"] += d["n_labels"]
        tot["bbox"] += d["n_bboxes"]; tot["noanno"] += d["n_images_no_anno"]
    avg_all = (tot["bbox"] / tot["img"]) if tot["img"] else 0.0
    rows.append(["TOTAL", tot["img"], tot["lbl"], tot["bbox"], tot["noanno"], round(avg_all, 3)])
    _csv("eda_summary.csv",
         ["split", "images", "labels", "bboxes", "images_no_annotation", "avg_bboxes_per_image"],
         rows)

    # class_distribution.csv
    rows = []
    for cid in range(result["nc"]):
        per_split_counts = [result["per_split"][s]["class_counts"].get(cid, 0) for s in result["splits"]]
        rows.append([cid, result["class_names"][cid], *per_split_counts,
                     result["class_counts_total"][cid], round(result["class_pct"][cid], 2)])
    _csv("class_distribution.csv",
         ["class_id", "class_name", *result["splits"], "total", "percent"],
         rows)

    # bbox_statistics.csv (nilai NORMALIZED relatif terhadap gambar)
    area = result["bbox_area"]; bw = result["bbox_w"]; bh = result["bbox_h"]
    rows = [
        ["total_bboxes", result["total_bboxes"]],
        ["avg_bbox_width_norm", round(_safe_stat(bw, np.mean), 5)],
        ["avg_bbox_height_norm", round(_safe_stat(bh, np.mean), 5)],
        ["avg_bbox_area_norm", round(_safe_stat(area, np.mean), 6)],
        ["min_bbox_area_norm", round(_safe_stat(area, np.min), 6)],
        ["max_bbox_area_norm", round(_safe_stat(area, np.max), 6)],
        ["median_bbox_area_norm", round(result["median_area"], 6)],
        ["frac_small_objects", round(result["frac_small"], 4)],
        ["frac_medium_objects", round(result["frac_medium"], 4)],
        ["frac_large_objects", round(result["frac_large"], 4)],
        ["small_area_threshold", round(SMALL_AREA_THR, 6)],
        ["medium_area_threshold", round(MEDIUM_AREA_THR, 6)],
    ]
    _csv("bbox_statistics.csv", ["metric", "value"], rows)

    # image_statistics.csv (pixel absolut)
    iw = result["img_w"]; ih = result["img_h"]
    rows = [
        ["n_images_measured", int(iw.size)],
        ["avg_width_px", round(_safe_stat(iw, np.mean), 1)],
        ["avg_height_px", round(_safe_stat(ih, np.mean), 1)],
        ["min_width_px", int(_safe_stat(iw, np.min))],
        ["min_height_px", int(_safe_stat(ih, np.min))],
        ["max_width_px", int(_safe_stat(iw, np.max))],
        ["max_height_px", int(_safe_stat(ih, np.max))],
        ["sampled", result["img_sampled"]],
    ]
    _csv("image_statistics.csv", ["metric", "value"], rows)


def build_report_text(result: dict) -> str:
    import numpy as np
    L: list[str] = []
    L.append(_line())
    L.append("LAPORAN EDA - DATASET YOLO (object detection)")
    L.append(_line())
    L.append(f"data.yaml    : {result['data_yaml']}")
    L.append(f"dataset root : {result['root']}")
    L.append(f"jumlah kelas : {result['nc']} -> {result['class_names']}")
    L.append("")

    L.append("RINGKASAN PER SPLIT")
    L.append("-" * 64)
    L.append(f"{'split':<8}{'images':>9}{'labels':>9}{'bboxes':>9}{'no_anno':>9}{'bbox/img':>10}")
    for s in result["splits"]:
        d = result["per_split"][s]
        L.append(f"{s:<8}{d['n_images']:>9}{d['n_labels']:>9}{d['n_bboxes']:>9}"
                 f"{d['n_images_no_anno']:>9}{d['avg_bboxes_per_image']:>10.2f}")
    L.append("")

    L.append("DISTRIBUSI KELAS (total bbox & persentase)")
    L.append("-" * 64)
    L.append(f"{'id':<4}{'class':<14}{'count':>10}{'percent':>10}")
    for cid in range(result["nc"]):
        L.append(f"{cid:<4}{result['class_names'][cid]:<14}"
                 f"{result['class_counts_total'][cid]:>10}{result['class_pct'][cid]:>9.2f}%")
    L.append("")

    L.append("STATISTIK UKURAN GAMBAR (pixel)")
    L.append("-" * 64)
    iw, ih = result["img_w"], result["img_h"]
    if iw.size:
        L.append(f"  width  : avg={iw.mean():.1f}  min={iw.min()}  max={iw.max()}")
        L.append(f"  height : avg={ih.mean():.1f}  min={ih.min()}  max={ih.max()}")
        if result["img_sampled"]:
            L.append("  (catatan: dihitung dari sampel gambar)")
    else:
        L.append("  (tidak ada ukuran gambar terbaca)")
    L.append("")

    L.append("STATISTIK BOUNDING BOX (normalized, relatif terhadap gambar)")
    L.append("-" * 64)
    area, bw, bh = result["bbox_area"], result["bbox_w"], result["bbox_h"]
    if area.size:
        L.append(f"  width  : avg={bw.mean():.4f}")
        L.append(f"  height : avg={bh.mean():.4f}")
        L.append(f"  area   : avg={area.mean():.5f}  median={result['median_area']:.5f}"
                 f"  min={area.min():.6f}  max={area.max():.5f}")
    else:
        L.append("  (tidak ada bbox)")
    L.append("")

    L.append("INTERPRETASI & POTENSI MASALAH")
    L.append("-" * 64)
    # class imbalance
    if result["imbalance_ratio"] >= 5:
        L.append(f"- CLASS IMBALANCE kuat: rasio maks/min ~{result['imbalance_ratio']:.1f}x. "
                 "Pertimbangkan augmentasi kelas minoritas / class weights.")
    elif result["imbalance_ratio"] >= 2:
        L.append(f"- Ada ketimpangan kelas sedang (rasio ~{result['imbalance_ratio']:.1f}x). Pantau metrik per-kelas.")
    else:
        L.append("- Distribusi antar-kelas relatif seimbang.")
    if result["empty_classes"]:
        L.append(f"- Kelas tanpa contoh sama sekali: {result['empty_classes']} (model tak akan belajar kelas ini).")
    # small object
    L.append(f"- Komposisi ukuran objek (area relatif): small={result['frac_small']*100:.1f}%  "
             f"medium={result['frac_medium']*100:.1f}%  large={result['frac_large']*100:.1f}%  "
             f"(small bila area < {SMALL_AREA_THR:.4f} ~ 32x32 px @640).")
    if result["small_object_dataset"]:
        L.append("- Dataset CENDERUNG OBJEK KECIL. imgsz=640 sudah sesuai; jangan turunkan imgsz. "
                 "Pertimbangkan mosaic/augmentasi yang menjaga objek kecil.")
    else:
        L.append("- Objek didominasi ukuran sedang/besar; imgsz=640 memadai.")
    # no anno
    total_no_anno = sum(result["per_split"][s]["n_images_no_anno"] for s in result["splits"])
    if total_no_anno:
        L.append(f"- Ada {total_no_anno} gambar tanpa anotasi (dianggap background oleh YOLO). Pastikan disengaja.")
    L.append("")
    L.append(_line())
    return "\n".join(L)


# --------------------------------------------------------------------------- #
# Visualisasi
# --------------------------------------------------------------------------- #
def make_figures(result: dict, fig_dir: Path) -> list[Path]:
    """Buat 6 figur EDA dan simpan sebagai PNG. Kembalikan daftar path."""
    import numpy as np
    import matplotlib.pyplot as plt
    try:
        import seaborn as sns
        sns.set_theme(style="whitegrid")
        palette = sns.color_palette("muted")
    except ImportError:
        palette = None

    fig_dir = Path(fig_dir)
    fig_dir.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []
    splits = result["splits"]
    class_names = result["class_names"]

    def _save(fig, name):
        path = fig_dir / name
        fig.tight_layout()
        fig.savefig(path, dpi=120, bbox_inches="tight")
        plt.close(fig)
        saved.append(path)

    # 1) Bar: jumlah gambar per split
    fig, ax = plt.subplots(figsize=(6, 4))
    vals = [result["per_split"][s]["n_images"] for s in splits]
    ax.bar(splits, vals, color=palette[:len(splits)] if palette else None)
    ax.set_title("Jumlah Gambar per Split")
    ax.set_ylabel("Jumlah gambar")
    for i, v in enumerate(vals):
        ax.text(i, v, f"{v}", ha="center", va="bottom", fontsize=9)
    _save(fig, "images_per_split.png")

    # 2) Bar: jumlah bbox per kelas
    fig, ax = plt.subplots(figsize=(6, 4))
    counts = [result["class_counts_total"][c] for c in range(result["nc"])]
    ax.bar(class_names, counts, color=palette[:result["nc"]] if palette else None)
    ax.set_title("Jumlah Bounding Box per Kelas")
    ax.set_ylabel("Jumlah bbox")
    for i, v in enumerate(counts):
        ax.text(i, v, f"{v}", ha="center", va="bottom", fontsize=9)
    _save(fig, "bboxes_per_class.png")

    # 3) Histogram: bbox per gambar
    fig, ax = plt.subplots(figsize=(6, 4))
    bpi = result["bboxes_per_image"]
    if bpi.size:
        upper = int(np.percentile(bpi, 99)) + 1  # potong ekor agar tidak ramai
        bins = range(0, max(upper, 2) + 1)
        ax.hist(np.clip(bpi, 0, upper), bins=bins, color=(palette[2] if palette else None), edgecolor="white")
    ax.set_title("Distribusi Jumlah Bounding Box per Gambar")
    ax.set_xlabel("bbox per gambar (dipotong di persentil-99)")
    ax.set_ylabel("Jumlah gambar")
    _save(fig, "bboxes_per_image_hist.png")

    # 4) Scatter: width vs height bbox (disampling agar tidak ramai)
    fig, ax = plt.subplots(figsize=(5, 5))
    bw, bh = result["bbox_w"], result["bbox_h"]
    if bw.size:
        n = bw.size
        if n > 20000:
            idx = np.random.default_rng(42).choice(n, 20000, replace=False)
            bw, bh = bw[idx], bh[idx]
        ax.scatter(bw, bh, s=6, alpha=0.2, color=(palette[0] if palette else None))
    ax.set_title("Sebaran Ukuran BBox (width vs height, normalized)")
    ax.set_xlabel("width (norm)")
    ax.set_ylabel("height (norm)")
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    _save(fig, "bbox_wh_scatter.png")

    # 5) Histogram: area bbox
    fig, ax = plt.subplots(figsize=(6, 4))
    area = result["bbox_area"]
    if area.size:
        ax.hist(np.clip(area, 0, np.percentile(area, 99)), bins=50,
                color=(palette[3] if palette else None), edgecolor="white")
        ax.axvline(SMALL_AREA_THR, color="red", linestyle="--", linewidth=1, label="ambang small (~32x32@640)")
        ax.legend(fontsize=8)
    ax.set_title("Distribusi Area BBox (normalized)")
    ax.set_xlabel("area relatif (dipotong di persentil-99)")
    ax.set_ylabel("Jumlah bbox")
    _save(fig, "bbox_area_hist.png")

    # 6) Pie: proporsi split (berdasar jumlah gambar)
    fig, ax = plt.subplots(figsize=(5, 5))
    sizes = [result["per_split"][s]["n_images"] for s in splits]
    ax.pie(sizes, labels=splits, autopct="%1.1f%%", startangle=90,
           colors=palette[:len(splits)] if palette else None,
           wedgeprops={"edgecolor": "white"})
    ax.set_title("Proporsi Split Dataset")
    ax.axis("equal")
    _save(fig, "split_proportion_pie.png")

    return saved


# --------------------------------------------------------------------------- #
# Orkestrasi
# --------------------------------------------------------------------------- #
def run_eda(data_yaml, out_dir="runs/eda", img_sample: int | None = None,
            make_plots: bool = True) -> dict:
    """Analisis + tulis CSV + report + figur. Kembalikan dict hasil."""
    result = analyze(data_yaml, img_sample=img_sample)
    out_dir = Path(out_dir)
    write_outputs(result, out_dir)
    report = build_report_text(result)
    (out_dir / "eda_report.txt").write_text(report, encoding="utf-8")
    if make_plots:
        make_figures(result, out_dir / "figures")
    result["report_text"] = report
    return result


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="EDA dataset YOLO (object detection).")
    p.add_argument("--data", default="dataset/data.yaml", help="Path ke data.yaml (default: dataset/data.yaml).")
    p.add_argument("--output", "-o", default="runs/eda", help="Folder output (default: runs/eda).")
    p.add_argument("--img-sample", type=int, default=None,
                   help="Baca ukuran hanya N gambar acak/split untuk percepatan (default: semua).")
    p.add_argument("--no-plots", action="store_true", help="Lewati pembuatan figur PNG.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    # Backend non-interaktif untuk eksekusi via script (hindari butuh display).
    import matplotlib
    matplotlib.use("Agg")

    args = parse_args(argv)
    print(_line())
    print("EXPLORATORY DATA ANALYSIS (YOLO detection)")
    print(_line())
    try:
        result = run_eda(args.data, out_dir=args.output, img_sample=args.img_sample,
                         make_plots=not args.no_plots)
    except (FileNotFoundError, RuntimeError) as exc:
        print(f"[ERROR] {exc}")
        return 2
    except KeyboardInterrupt:
        print("\n[INFO] Dibatalkan oleh pengguna.")
        return 130
    except Exception as exc:  # pragma: no cover
        print(f"[ERROR] Gagal menjalankan EDA: {exc}")
        return 2

    print()
    print(result["report_text"])
    print(f"\nCSV & figur tersimpan di: {Path(args.output)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
