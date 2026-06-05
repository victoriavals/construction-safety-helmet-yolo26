"""
validate_dataset.py
===================
Validasi integritas dataset YOLO (object detection) SEBELUM training.

Pemeriksaan:
  - keberadaan folder train/valid/test (+ images & labels)
  - mendukung folder validasi bernama `valid` maupun `val`
  - jumlah gambar & label per split
  - gambar tanpa label (missing labels) dan label tanpa gambar (orphan labels)
  - gambar rusak (PIL.verify)
  - file label kosong
  - format label YOLO (5 kolom, class_id int, koordinat float 0..1, w/h > 0)
  - class_id tidak melebihi jumlah kelas (nc) di data.yaml
  - distribusi bounding box per kelas & per split

Output (semua di bawah runs/dataset_validation/):
  summary.csv, class_distribution.csv, missing_labels.csv, orphan_labels.csv,
  empty_labels.csv, bad_labels.csv, corrupt_images.csv, validation_report.txt

Jalankan dari ROOT project (Windows):
    python src/validate_dataset.py --data dataset/data.yaml
    python src/validate_dataset.py --data dataset/data.yaml --quick   # tanpa cek gambar rusak

Catatan:
    Script ini READ-ONLY terhadap dataset. Tidak menghapus / mengubah file asli.
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

# Ekstensi gambar yang dianggap valid (case-insensitive).
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

# Definisi split: nama logis -> (kandidat folder, kandidat key di data.yaml).
SPLITS = [
    ("train", ["train"], ["train"]),
    ("valid", ["valid", "val"], ["val", "valid"]),
    ("test", ["test"], ["test"]),
]


# --------------------------------------------------------------------------- #
# Util & pembacaan data.yaml
# --------------------------------------------------------------------------- #
def _line(char: str = "=", width: int = 64) -> str:
    return char * width


def load_data_yaml(data_yaml: Path) -> dict:
    """Baca data.yaml. Hard-fail bila tidak ada / tidak bisa diparse."""
    if not data_yaml.is_file():
        raise FileNotFoundError(f"data.yaml tidak ditemukan: {data_yaml}")
    try:
        import yaml
    except ImportError as exc:
        raise RuntimeError(
            "Paket PyYAML belum terinstal. Jalankan: pip install -r requirements.txt"
        ) from exc
    try:
        with data_yaml.open("r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
    except Exception as exc:
        raise RuntimeError(f"Gagal membaca/parse data.yaml: {exc}") from exc
    if not isinstance(data, dict):
        raise RuntimeError("Isi data.yaml tidak valid (bukan mapping/dict).")
    return data


def get_class_names(data: dict) -> list[str]:
    """Ambil daftar class names dari data.yaml (mendukung list atau dict)."""
    names = data.get("names")
    if isinstance(names, dict):
        # format {0: 'Helmet', 1: 'No-Helmet', ...}
        return [str(names[k]) for k in sorted(names, key=lambda x: int(x))]
    if isinstance(names, (list, tuple)):
        return [str(n) for n in names]
    # fallback: pakai nc bila names tidak ada
    nc = data.get("nc")
    if isinstance(nc, int):
        return [f"class_{i}" for i in range(nc)]
    return []


def resolve_images_dir(root: Path, raw_value, folder_candidates: list[str]) -> Path | None:
    """Tentukan folder images sebuah split, tahan terhadap path '../' Roboflow.

    Urutan percobaan:
      1. nilai dari data.yaml (mis. '../train/images') diresolusi terhadap `root`
      2. fallback: root/<kandidat folder>/images
    """
    # 1) Hormati nilai data.yaml bila valid.
    if isinstance(raw_value, str) and raw_value.strip():
        candidate = (root / raw_value).resolve()
        if candidate.is_dir():
            return candidate
    # 2) Fallback ke konvensi root/<split>/images.
    for name in folder_candidates:
        candidate = root / name / "images"
        if candidate.is_dir():
            return candidate
    return None


def labels_dir_for(images_dir: Path) -> Path:
    """Konvensi Ultralytics: .../<split>/images -> .../<split>/labels."""
    return images_dir.parent / "labels"


def list_images(images_dir: Path) -> list[Path]:
    return sorted(p for p in images_dir.iterdir() if p.suffix.lower() in IMAGE_EXTS)


def list_labels(labels_dir: Path) -> list[Path]:
    return sorted(p for p in labels_dir.iterdir() if p.suffix.lower() == ".txt")


# --------------------------------------------------------------------------- #
# Validasi label & gambar
# --------------------------------------------------------------------------- #
def parse_label_file(path: Path, nc: int) -> tuple[list[int], list[dict], bool]:
    """Parse satu file label YOLO.

    Returns:
        class_ids    : daftar class_id valid (untuk distribusi)
        errors       : daftar dict {line, content, error}
        is_empty     : True bila file tidak punya baris anotasi
    """
    class_ids: list[int] = []
    errors: list[dict] = []
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception as exc:
        errors.append({"line": 0, "content": "", "error": f"gagal dibaca: {exc}"})
        return class_ids, errors, False

    lines = [ln.strip() for ln in text.splitlines()]
    non_empty = [ln for ln in lines if ln]
    if not non_empty:
        return class_ids, errors, True

    for i, raw in enumerate(lines, start=1):
        if not raw:
            continue
        parts = raw.split()
        if len(parts) != 5:
            errors.append(
                {"line": i, "content": raw, "error": f"jumlah kolom {len(parts)} (harus 5)"}
            )
            continue

        cid_raw, *coord_raw = parts

        # class_id wajib integer murni.
        try:
            class_id = int(cid_raw)
            if str(class_id) != cid_raw.lstrip("+"):
                raise ValueError
        except ValueError:
            errors.append({"line": i, "content": raw, "error": f"class_id bukan integer: '{cid_raw}'"})
            continue

        # koordinat wajib float.
        try:
            x, y, w, h = (float(v) for v in coord_raw)
        except ValueError:
            errors.append({"line": i, "content": raw, "error": "x/y/w/h bukan float"})
            continue

        problems = []
        for name, val in (("x_center", x), ("y_center", y), ("width", w), ("height", h)):
            if not (0.0 <= val <= 1.0):
                problems.append(f"{name}={val} di luar 0..1")
        if w <= 0:
            problems.append(f"width={w} harus > 0")
        if h <= 0:
            problems.append(f"height={h} harus > 0")
        if class_id < 0 or class_id >= nc:
            problems.append(f"class_id={class_id} di luar rentang 0..{nc - 1}")

        if problems:
            errors.append({"line": i, "content": raw, "error": "; ".join(problems)})
            # tetap hitung ke distribusi hanya bila class_id berada dalam rentang
            if 0 <= class_id < nc:
                class_ids.append(class_id)
            continue

        class_ids.append(class_id)

    return class_ids, errors, False


def is_image_corrupt(path: Path) -> str | None:
    """Cek gambar rusak via PIL. Return pesan error bila rusak, else None."""
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError(
            "Paket Pillow belum terinstal. Jalankan: pip install -r requirements.txt"
        ) from exc
    try:
        with Image.open(path) as im:
            im.verify()
        return None
    except Exception as exc:
        return str(exc)


# --------------------------------------------------------------------------- #
# Validasi per split
# --------------------------------------------------------------------------- #
def validate_split(
    split_name: str,
    images_dir: Path,
    labels_dir: Path,
    nc: int,
    check_corrupt: bool,
) -> dict:
    """Validasi satu split, kembalikan dict statistik & temuan."""
    result = {
        "split": split_name,
        "images_dir": images_dir,
        "labels_dir": labels_dir,
        "n_images": 0,
        "n_labels": 0,
        "missing_labels": [],   # gambar tanpa label
        "orphan_labels": [],    # label tanpa gambar
        "empty_labels": [],     # label kosong (background)
        "bad_labels": [],       # {label_path, line, content, error}
        "corrupt_images": [],   # {image_path, error}
        "class_counts": {c: 0 for c in range(nc)},
        "total_bboxes": 0,
    }

    images = list_images(images_dir)
    labels = list_labels(labels_dir)
    result["n_images"] = len(images)
    result["n_labels"] = len(labels)

    image_stems = {p.stem for p in images}
    label_stems = {p.stem for p in labels}

    # Gambar tanpa label & label tanpa gambar.
    for img in images:
        if img.stem not in label_stems:
            result["missing_labels"].append(img)
    for lbl in labels:
        if lbl.stem not in image_stems:
            result["orphan_labels"].append(lbl)

    # Progress bar opsional.
    try:
        from tqdm import tqdm
        label_iter = tqdm(labels, desc=f"[{split_name}] labels", unit="file", leave=False)
    except ImportError:
        label_iter = labels

    # Parse setiap label.
    for lbl in label_iter:
        class_ids, errors, is_empty = parse_label_file(lbl, nc)
        if is_empty:
            result["empty_labels"].append(lbl)
        for cid in class_ids:
            result["class_counts"][cid] += 1
            result["total_bboxes"] += 1
        for err in errors:
            result["bad_labels"].append(
                {"label_path": lbl, "line": err["line"], "content": err["content"], "error": err["error"]}
            )

    # Cek gambar rusak.
    if check_corrupt:
        try:
            from tqdm import tqdm
            img_iter = tqdm(images, desc=f"[{split_name}] images", unit="img", leave=False)
        except ImportError:
            img_iter = images
        for img in img_iter:
            err = is_image_corrupt(img)
            if err is not None:
                result["corrupt_images"].append({"image_path": img, "error": err})

    return result


# --------------------------------------------------------------------------- #
# Penulisan output
# --------------------------------------------------------------------------- #
def _write_csv(path: Path, header: list[str], rows: list[list]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(header)
        writer.writerows(rows)


def write_outputs(out_dir: Path, results: list[dict], class_names: list[str], root: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    nc = len(class_names)

    def rel(p: Path) -> str:
        try:
            return str(p.relative_to(root))
        except ValueError:
            return str(p)

    # summary.csv
    summary_rows = []
    totals = {k: 0 for k in
              ["n_images", "n_labels", "missing_labels", "orphan_labels",
               "empty_labels", "bad_labels", "corrupt_images", "total_bboxes"]}
    for r in results:
        row = [
            r["split"], r["n_images"], r["n_labels"],
            len(r["missing_labels"]), len(r["orphan_labels"]),
            len(r["empty_labels"]), len(r["bad_labels"]),
            len(r["corrupt_images"]), r["total_bboxes"],
        ]
        summary_rows.append(row)
        totals["n_images"] += r["n_images"]
        totals["n_labels"] += r["n_labels"]
        totals["missing_labels"] += len(r["missing_labels"])
        totals["orphan_labels"] += len(r["orphan_labels"])
        totals["empty_labels"] += len(r["empty_labels"])
        totals["bad_labels"] += len(r["bad_labels"])
        totals["corrupt_images"] += len(r["corrupt_images"])
        totals["total_bboxes"] += r["total_bboxes"]
    summary_rows.append([
        "TOTAL", totals["n_images"], totals["n_labels"], totals["missing_labels"],
        totals["orphan_labels"], totals["empty_labels"], totals["bad_labels"],
        totals["corrupt_images"], totals["total_bboxes"],
    ])
    _write_csv(
        out_dir / "summary.csv",
        ["split", "images", "labels", "missing_labels", "orphan_labels",
         "empty_labels", "bad_label_lines", "corrupt_images", "total_bboxes"],
        summary_rows,
    )

    # class_distribution.csv
    by_split = {r["split"]: r["class_counts"] for r in results}
    split_order = [r["split"] for r in results]
    dist_rows = []
    for cid in range(nc):
        per_split = [by_split.get(s, {}).get(cid, 0) for s in split_order]
        dist_rows.append([cid, class_names[cid], *per_split, sum(per_split)])
    _write_csv(
        out_dir / "class_distribution.csv",
        ["class_id", "class_name", *split_order, "total"],
        dist_rows,
    )

    # missing_labels.csv
    _write_csv(
        out_dir / "missing_labels.csv",
        ["split", "image_path"],
        [[r["split"], rel(p)] for r in results for p in r["missing_labels"]],
    )

    # orphan_labels.csv
    _write_csv(
        out_dir / "orphan_labels.csv",
        ["split", "label_path"],
        [[r["split"], rel(p)] for r in results for p in r["orphan_labels"]],
    )

    # empty_labels.csv
    _write_csv(
        out_dir / "empty_labels.csv",
        ["split", "label_path"],
        [[r["split"], rel(p)] for r in results for p in r["empty_labels"]],
    )

    # bad_labels.csv
    _write_csv(
        out_dir / "bad_labels.csv",
        ["split", "label_path", "line", "content", "error"],
        [[r["split"], rel(b["label_path"]), b["line"], b["content"], b["error"]]
         for r in results for b in r["bad_labels"]],
    )

    # corrupt_images.csv
    _write_csv(
        out_dir / "corrupt_images.csv",
        ["split", "image_path", "error"],
        [[r["split"], rel(c["image_path"]), c["error"]]
         for r in results for c in r["corrupt_images"]],
    )


def build_recommendations(results: list[dict], folder_issues: list[str]) -> list[str]:
    recs: list[str] = []
    if folder_issues:
        recs.append(
            "Folder berikut tidak ditemukan / kosong, split terkait dilewati: "
            + "; ".join(folder_issues)
        )
    tot = lambda key: sum(len(r[key]) for r in results)  # noqa: E731

    if tot("bad_labels") > 0:
        recs.append(
            "Ada baris label berformat salah (lihat bad_labels.csv). WAJIB diperbaiki: "
            "pastikan tiap baris 'class_id x y w h', class_id integer, koordinat 0..1, w/h > 0, "
            "dan class_id < jumlah kelas."
        )
    if tot("corrupt_images") > 0:
        recs.append(
            "Ada gambar rusak (lihat corrupt_images.csv). Ganti/hapus dari salinan kerja "
            "(jangan ubah dataset asli) sebelum training."
        )
    if tot("orphan_labels") > 0:
        recs.append(
            "Ada file label tanpa gambar pasangan (orphan_labels.csv). Label ini tidak terpakai; "
            "periksa apakah ada gambar yang hilang."
        )
    if tot("missing_labels") > 0:
        recs.append(
            "Ada gambar tanpa file label (missing_labels.csv). YOLO memperlakukannya sebagai "
            "background/negatif. Pastikan ini disengaja; bila tidak, lengkapi anotasinya."
        )
    if tot("empty_labels") > 0:
        recs.append(
            "Ada file label kosong (empty_labels.csv). Ini sah sebagai gambar background di YOLO, "
            "namun pastikan jumlahnya wajar."
        )

    # Cek imbalance kelas pada train.
    train = next((r for r in results if r["split"] == "train"), None)
    if train and train["total_bboxes"] > 0:
        counts = train["class_counts"]
        nonzero = {c: v for c, v in counts.items() if v > 0}
        if nonzero:
            mx, mn = max(nonzero.values()), min(nonzero.values())
            if mn > 0 and mx / mn >= 5:
                recs.append(
                    f"Distribusi kelas pada train timpang (rasio maks/min ~{mx / mn:.1f}x). "
                    "Pertimbangkan augmentasi/penyeimbangan atau bobot kelas."
                )
        if len(nonzero) < len([c for c in counts]):
            empty_cls = [c for c, v in counts.items() if v == 0]
            recs.append(
                f"Kelas tanpa contoh di train: {empty_cls}. Model tidak akan belajar kelas tersebut."
            )

    if not recs:
        recs.append("Tidak ada masalah kritis terdeteksi. Dataset siap untuk training.")
    return recs


def write_report(
    out_dir: Path,
    data_yaml: Path,
    root: Path,
    class_names: list[str],
    results: list[dict],
    folder_issues: list[str],
    recommendations: list[str],
) -> str:
    lines: list[str] = []
    lines.append(_line())
    lines.append("LAPORAN VALIDASI DATASET YOLO (object detection)")
    lines.append(_line())
    lines.append(f"data.yaml     : {data_yaml}")
    lines.append(f"dataset root  : {root}")
    lines.append(f"jumlah kelas  : {len(class_names)}")
    lines.append(f"nama kelas    : {class_names}")
    lines.append("")

    lines.append("RINGKASAN PER SPLIT")
    lines.append("-" * 64)
    header = f"{'split':<7}{'images':>8}{'labels':>8}{'miss':>7}{'orphan':>8}{'empty':>7}{'bad':>6}{'corrupt':>9}{'bboxes':>9}"
    lines.append(header)
    for r in results:
        lines.append(
            f"{r['split']:<7}{r['n_images']:>8}{r['n_labels']:>8}"
            f"{len(r['missing_labels']):>7}{len(r['orphan_labels']):>8}"
            f"{len(r['empty_labels']):>7}{len(r['bad_labels']):>6}"
            f"{len(r['corrupt_images']):>9}{r['total_bboxes']:>9}"
        )
    lines.append("")

    lines.append("DISTRIBUSI BOUNDING BOX PER KELAS")
    lines.append("-" * 64)
    split_order = [r["split"] for r in results]
    lines.append(f"{'id':<4}{'class':<14}" + "".join(f"{s:>9}" for s in split_order) + f"{'total':>9}")
    for cid, cname in enumerate(class_names):
        per_split = [next((r["class_counts"].get(cid, 0) for r in results if r["split"] == s), 0) for s in split_order]
        lines.append(f"{cid:<4}{cname:<14}" + "".join(f"{v:>9}" for v in per_split) + f"{sum(per_split):>9}")
    lines.append("")

    lines.append("REKOMENDASI")
    lines.append("-" * 64)
    for i, rec in enumerate(recommendations, 1):
        lines.append(f"{i}. {rec}")
    lines.append("")
    lines.append(f"Detail lengkap tersimpan di: {out_dir}")
    lines.append(_line())

    report = "\n".join(lines)
    (out_dir / "validation_report.txt").write_text(report, encoding="utf-8")
    return report


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validasi integritas dataset YOLO (object detection).",
    )
    parser.add_argument(
        "--data", default="dataset/data.yaml",
        help="Path ke data.yaml (default: dataset/data.yaml).",
    )
    parser.add_argument(
        "--output", "-o", default="runs/dataset_validation",
        help="Folder output laporan (default: runs/dataset_validation).",
    )
    parser.add_argument(
        "--quick", action="store_true",
        help="Lewati pengecekan gambar rusak (lebih cepat).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    data_yaml = Path(args.data)
    out_dir = Path(args.output)

    print(_line())
    print("VALIDASI DATASET YOLO")
    print(_line())

    # --- Hard-fail: data.yaml ---
    try:
        data = load_data_yaml(data_yaml)
    except (FileNotFoundError, RuntimeError) as exc:
        print(f"[ERROR] {exc}")
        return 2

    class_names = get_class_names(data)
    nc = data.get("nc", len(class_names))
    if not isinstance(nc, int) or nc <= 0:
        nc = len(class_names)
    if nc <= 0:
        print("[ERROR] Jumlah kelas (nc/names) tidak valid di data.yaml.")
        return 2
    if len(class_names) != nc:
        print(f"[PERINGATAN] nc={nc} tapi jumlah names={len(class_names)}. Memakai names yang ada.")
        # selaraskan panjang names dengan nc
        if len(class_names) < nc:
            class_names += [f"class_{i}" for i in range(len(class_names), nc)]
        else:
            class_names = class_names[:nc]

    # --- Hard-fail: dataset root ---
    root = data_yaml.parent.resolve()
    if not root.is_dir():
        print(f"[ERROR] Folder utama dataset tidak ditemukan: {root}")
        return 2

    print(f"data.yaml : {data_yaml}")
    print(f"root      : {root}")
    print(f"kelas     : {nc} -> {class_names}")
    if args.quick:
        print("mode      : --quick (cek gambar rusak DILEWATI)")
    print()

    # --- Validasi tiap split (tidak stop bila ada folder hilang) ---
    results: list[dict] = []
    folder_issues: list[str] = []
    for split_name, folder_cands, key_cands in SPLITS:
        raw_value = next((data.get(k) for k in key_cands if data.get(k)), None)
        images_dir = resolve_images_dir(root, raw_value, folder_cands)
        if images_dir is None:
            folder_issues.append(f"{split_name}/images")
            print(f"[LEWATI] {split_name}: folder images tidak ditemukan.")
            continue
        labels_dir = labels_dir_for(images_dir)
        if not labels_dir.is_dir():
            folder_issues.append(f"{split_name}/labels")
            print(f"[LEWATI] {split_name}: folder labels tidak ditemukan ({labels_dir}).")
            continue

        print(f"[CEK] {split_name}: {images_dir}")
        try:
            res = validate_split(split_name, images_dir, labels_dir, nc, check_corrupt=not args.quick)
        except RuntimeError as exc:
            print(f"[ERROR] {exc}")
            return 2
        except KeyboardInterrupt:
            print("\n[INFO] Dibatalkan oleh pengguna.")
            return 130
        results.append(res)

    if not results:
        print("[ERROR] Tidak ada split yang bisa divalidasi. Periksa struktur folder dataset.")
        return 2

    # --- Tulis output & rekomendasi ---
    recommendations = build_recommendations(results, folder_issues)
    try:
        write_outputs(out_dir, results, class_names, root)
        report = write_report(out_dir, data_yaml, root, class_names, results, folder_issues, recommendations)
    except Exception as exc:
        print(f"[ERROR] Gagal menulis output ke {out_dir}: {exc}")
        return 2

    # --- Ringkasan ke terminal ---
    print()
    print(report)

    # Exit code: 1 bila ada masalah serius (bad labels / corrupt / missing folder), else 0.
    serious = (
        any(r["bad_labels"] for r in results)
        or any(r["corrupt_images"] for r in results)
        or bool(folder_issues)
    )
    return 1 if serious else 0


if __name__ == "__main__":
    sys.exit(main())
