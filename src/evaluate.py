"""
evaluate.py
===========
Evaluasi model YOLO26 (object detection) terlatih pada validation & test set.

Alur:
  - muat best weights
  - evaluasi validation (model.val split='val')
  - evaluasi test bila tersedia (split='test')
  - bandingkan val vs test (indikasi overfitting / pergeseran distribusi)
  - prediksi beberapa sample gambar test -> simpan gambar beranotasi
  - tulis metrik + interpretasi otomatis

Jalankan dari ROOT project (Windows):
    python src/evaluate.py --weights runs/train/helmet_yolo26s_baseline/weights/best.pt --data dataset/data.yaml
    python src/evaluate.py --allow-cpu        # izinkan evaluasi di CPU bila CUDA tak ada

Output (runs/evaluate/):
  val_metrics.csv, test_metrics.csv, evaluation_summary.txt, predictions/

Catatan: metrik dihitung pada conf yang dipilih (default 0.25 = titik operasi).
Untuk mAP benchmark standar gunakan --conf 0.001. READ-ONLY terhadap dataset.
"""

from __future__ import annotations

import argparse
import csv
import sys
from datetime import datetime
from pathlib import Path

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

DEFAULTS = {
    "weights": "runs/train/helmet_yolo26s_baseline/weights/best.pt",
    "data": "dataset/data.yaml",
    "imgsz": 640,
    "conf": 0.25,
    "iou": 0.5,
    "device": "0",
    "output": "runs/evaluate",
    "num_samples": 12,
}


def _line(char: str = "=", width: int = 64) -> str:
    return char * width


# --------------------------------------------------------------------------- #
# Dataset config & resolusi path
# --------------------------------------------------------------------------- #
def load_yaml(path: Path) -> dict:
    import yaml
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def resolve_images_dir(root: Path, data: dict, key_cands: list[str],
                       folder_cands: list[str]) -> Path | None:
    """Resolusi folder images sebuah split (tahan '../' Roboflow & valid/val)."""
    raw = next((data.get(k) for k in key_cands if data.get(k)), None)
    if isinstance(raw, str) and raw.strip():
        cand = (root / raw).resolve()
        if cand.is_dir():
            return cand
        stripped = raw
        while stripped.startswith("../"):
            stripped = stripped[3:]
        cand2 = (root / stripped).resolve()
        if cand2.is_dir():
            return cand2
    for name in folder_cands:
        cand = root / name / "images"
        if cand.is_dir():
            return cand
    return None


def list_images(images_dir: Path) -> list[Path]:
    return sorted(p for p in images_dir.iterdir() if p.suffix.lower() in IMAGE_EXTS)


# --------------------------------------------------------------------------- #
# Device
# --------------------------------------------------------------------------- #
def resolve_device(device_arg, allow_cpu: bool) -> tuple[object, bool, str]:
    """Return (device, ok, label). ok=False bila GPU diminta tapi CUDA tak ada & tanpa --allow-cpu."""
    try:
        import torch
    except ImportError as exc:
        raise RuntimeError("PyTorch belum terinstal. Instal PyTorch CUDA dari pytorch.org.") from exc

    if str(device_arg).lower() == "cpu":
        return "cpu", True, "CPU (diminta)"

    if torch.cuda.is_available():
        idx = int(device_arg) if str(device_arg).isdigit() else 0
        try:
            name = torch.cuda.get_device_properties(idx).name
        except Exception:
            name = "GPU"
        return device_arg, True, name

    # CUDA tidak tersedia
    if allow_cpu:
        print("[PERINGATAN] CUDA tidak tersedia. Melanjutkan di CPU (--allow-cpu). Akan lebih lambat.")
        return "cpu", True, "CPU (fallback --allow-cpu)"
    return device_arg, False, ""


# --------------------------------------------------------------------------- #
# Ekstraksi metrik
# --------------------------------------------------------------------------- #
def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def extract_overall(metrics) -> dict:
    p = r = m50 = m95 = None
    box = getattr(metrics, "box", None)
    if box is not None:
        p, r = getattr(box, "mp", None), getattr(box, "mr", None)
        m50, m95 = getattr(box, "map50", None), getattr(box, "map", None)
    rd = getattr(metrics, "results_dict", None)
    if isinstance(rd, dict):
        p = p if p is not None else rd.get("metrics/precision(B)")
        r = r if r is not None else rd.get("metrics/recall(B)")
        m50 = m50 if m50 is not None else rd.get("metrics/mAP50(B)")
        m95 = m95 if m95 is not None else rd.get("metrics/mAP50-95(B)")
    return {"precision": _f(p), "recall": _f(r), "map50": _f(m50), "map5095": _f(m95)}


def extract_per_class(metrics, names) -> list[tuple]:
    """Return list (class_name, precision, recall, map50, map50-95)."""
    out: list[tuple] = []
    box = getattr(metrics, "box", None)
    if box is None:
        return out
    try:
        idxs = list(getattr(box, "ap_class_index", []) or [])
        for i, cid in enumerate(idxs):
            cid = int(cid)
            if isinstance(names, dict):
                cname = names.get(cid, str(cid))
            elif isinstance(names, (list, tuple)) and cid < len(names):
                cname = names[cid]
            else:
                cname = str(cid)
            out.append((cname, _f(box.p[i]), _f(box.r[i]), _f(box.ap50[i]), _f(box.ap[i])))
    except Exception:
        pass
    return out


def write_metrics_csv(path: Path, overall: dict, per_class: list[tuple]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["scope", "precision", "recall", "mAP50", "mAP50-95"])
        w.writerow(["overall",
                    _round(overall["precision"]), _round(overall["recall"]),
                    _round(overall["map50"]), _round(overall["map5095"])])
        for cname, p, r, m50, m95 in per_class:
            w.writerow([cname, _round(p), _round(r), _round(m50), _round(m95)])


def _round(v, nd=4):
    return round(v, nd) if isinstance(v, (int, float)) else "N/A"


# --------------------------------------------------------------------------- #
# Interpretasi otomatis
# --------------------------------------------------------------------------- #
def interpret_split(label: str, m: dict) -> list[str]:
    notes = []
    p, r, m50, m95 = m["precision"], m["recall"], m["map50"], m["map5095"]
    if None not in (p, r):
        if p - r >= 0.15:
            notes.append(f"[{label}] Precision ({p:.3f}) >> Recall ({r:.3f}): model cenderung "
                         "MELEWATKAN sebagian objek (konservatif).")
        elif r - p >= 0.15:
            notes.append(f"[{label}] Recall ({r:.3f}) >> Precision ({p:.3f}): model cenderung "
                         "menghasilkan FALSE POSITIVE.")
        else:
            notes.append(f"[{label}] Precision ({p:.3f}) & Recall ({r:.3f}) relatif seimbang.")
    if None not in (m50, m95):
        if m50 >= 0.5 and (m50 - m95) >= 0.20:
            notes.append(f"[{label}] mAP50 ({m50:.3f}) >> mAP50-95 ({m95:.3f}): objek dikenali "
                         "namun BOUNDING BOX belum cukup presisi.")
        else:
            notes.append(f"[{label}] Selisih mAP50 ({m50:.3f}) vs mAP50-95 ({m95:.3f}) wajar.")
    return notes


def interpret_gap(val_m: dict, test_m: dict) -> list[str]:
    vm, tm = val_m["map5095"], test_m["map5095"]
    if None in (vm, tm):
        return ["[val vs test] mAP50-95 tidak lengkap; perbandingan dilewati."]
    gap = vm - tm
    if gap >= 0.10:
        return [f"[val vs test] Test (mAP50-95={tm:.3f}) JAUH lebih rendah dari val ({vm:.3f}, "
                f"selisih {gap:.3f}): indikasi OVERFITTING atau perbedaan distribusi data train/test."]
    if gap <= -0.05:
        return [f"[val vs test] Test ({tm:.3f}) lebih TINGGI dari val ({vm:.3f}); "
                "tidak biasa, cek apakah val lebih sulit / lebih padat objek."]
    return [f"[val vs test] Performa konsisten (selisih mAP50-95 {gap:.3f}); generalisasi baik."]


# --------------------------------------------------------------------------- #
# Summary
# --------------------------------------------------------------------------- #
def fmt_metrics(m: dict) -> str:
    def g(k):
        v = m[k]
        return f"{v:.4f}" if isinstance(v, (int, float)) else "N/A"
    return (f"precision={g('precision')}  recall={g('recall')}  "
            f"mAP50={g('map50')}  mAP50-95={g('map5095')}")


def build_summary(args, device_label, val_m, test_m, test_available,
                  n_predictions, pred_dir) -> str:
    L: list[str] = []
    L.append(_line())
    L.append("RINGKASAN EVALUASI - YOLO26s (object detection)")
    L.append(_line())
    L.append(f"Waktu        : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    L.append(f"Weights      : {args.weights}")
    L.append(f"Data         : {args.data}")
    L.append(f"imgsz        : {args.imgsz}   conf: {args.conf}   iou: {args.iou}")
    L.append(f"Device       : {args.device} ({device_label})")
    L.append("")
    L.append("METRIK VALIDATION SET")
    L.append("-" * 64)
    L.append(f"  {fmt_metrics(val_m)}")
    L.append("")
    L.append("METRIK TEST SET")
    L.append("-" * 64)
    if test_available:
        L.append(f"  {fmt_metrics(test_m)}")
    else:
        L.append("  TEST SET TIDAK TERSEDIA di data.yaml (atau folder kosong) -> evaluasi test dilewati.")
    L.append("")

    if test_available:
        L.append("PERBANDINGAN VAL vs TEST")
        L.append("-" * 64)
        L.append(f"  {'metric':<12}{'val':>10}{'test':>10}{'delta(val-test)':>18}")
        for key, lbl in [("precision", "precision"), ("recall", "recall"),
                          ("map50", "mAP50"), ("map5095", "mAP50-95")]:
            v, t = val_m[key], test_m[key]
            d = (v - t) if None not in (v, t) else None
            L.append(f"  {lbl:<12}{_s(v):>10}{_s(t):>10}{_s(d):>18}")
        L.append("")

    L.append("INTERPRETASI OTOMATIS")
    L.append("-" * 64)
    notes = interpret_split("VAL", val_m)
    if test_available:
        notes += interpret_split("TEST", test_m)
        notes += interpret_gap(val_m, test_m)
    for n in notes:
        L.append(f"- {n}")
    L.append("")
    L.append("PEDOMAN INTERPRETASI")
    L.append("-" * 64)
    L.append("1. Precision tinggi & recall rendah  -> model melewatkan sebagian objek.")
    L.append("2. Recall tinggi & precision rendah  -> model menghasilkan banyak false positive.")
    L.append("3. mAP50 tinggi & mAP50-95 rendah    -> bounding box belum cukup presisi.")
    L.append("4. Test jauh < validation            -> indikasi overfitting / beda distribusi data.")
    L.append("")
    L.append(f"Sample prediksi : {n_predictions} gambar -> {pred_dir}")
    L.append(_line())
    return "\n".join(L)


def _s(v):
    return f"{v:.4f}" if isinstance(v, (int, float)) else "N/A"


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Evaluasi model YOLO26 (val & test) + sample prediksi.")
    p.add_argument("--weights", default=DEFAULTS["weights"], help="Path best.pt.")
    p.add_argument("--data", default=DEFAULTS["data"], help="Path data.yaml (default: dataset/data.yaml).")
    p.add_argument("--imgsz", type=int, default=DEFAULTS["imgsz"])
    p.add_argument("--conf", type=float, default=DEFAULTS["conf"], help="Confidence threshold (default 0.25).")
    p.add_argument("--iou", type=float, default=DEFAULTS["iou"], help="IoU threshold NMS (default 0.5).")
    p.add_argument("--device", default=DEFAULTS["device"], help="0 untuk GPU, 'cpu' untuk CPU.")
    p.add_argument("--output", "-o", default=DEFAULTS["output"], help="Folder output (default runs/evaluate).")
    p.add_argument("--num-samples", type=int, default=DEFAULTS["num_samples"],
                   help="Jumlah sample gambar untuk prediksi visual (default 12).")
    p.add_argument("--allow-cpu", action="store_true", help="Izinkan evaluasi di CPU bila CUDA tak ada.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    # Absolut: Ultralytics me-resolve project RELATIF ke RUNS_DIR/task/project (runs/detect/...).
    # Path absolut menjaga output tetap di runs/evaluate/ sesuai spesifikasi.
    out_dir = Path(args.output).resolve()
    pred_dir = out_dir / "predictions"

    print(_line())
    print("EVALUASI YOLO26s - Construction Safety Helmet")
    print(_line())

    # 4) Validasi weights
    weights = Path(args.weights)
    if not weights.is_file():
        print(f"[ERROR] Weights tidak ditemukan: {weights}")
        print("        Latih model dulu (src/train.py) atau berikan --weights yang benar.")
        return 2

    # Validasi data.yaml
    data_path = Path(args.data)
    if not data_path.is_file():
        print(f"[ERROR] data.yaml tidak ditemukan: {data_path}")
        return 2

    # 6) Device
    try:
        device, device_ok, device_label = resolve_device(args.device, args.allow_cpu)
    except RuntimeError as exc:
        print(f"[ERROR] {exc}")
        return 2
    if not device_ok:
        print(f"[ERROR] CUDA tidak tersedia (device={args.device}). "
              "Tambahkan --allow-cpu untuk evaluasi di CPU, atau perbaiki instalasi CUDA.")
        return 2
    print(f"Device: {args.device} ({device_label})")

    # Deteksi ketersediaan test set
    try:
        data = load_yaml(data_path)
    except Exception as exc:
        print(f"[ERROR] Gagal membaca data.yaml: {exc}")
        return 2
    root = data_path.parent.resolve()
    test_dir = resolve_images_dir(root, data, ["test"], ["test"])
    val_dir = resolve_images_dir(root, data, ["val", "valid"], ["valid", "val"])
    test_available = test_dir is not None and len(list_images(test_dir)) > 0

    # Muat model
    try:
        from ultralytics import YOLO
    except ImportError as exc:
        print(f"[ERROR] Ultralytics belum terinstal: {exc}")
        return 2
    print(f"\nMemuat model: {weights}")
    try:
        model = YOLO(str(weights), task="detect")
    except Exception as exc:
        print(f"[ERROR] Gagal memuat model: {exc}")
        return 2

    common = dict(data=str(data_path), imgsz=args.imgsz, conf=args.conf,
                  iou=args.iou, device=device, plots=True, exist_ok=True)

    # 2) Evaluasi validation
    print("\n" + _line("-"))
    print("Evaluasi VALIDATION set ...")
    print(_line("-"))
    try:
        val_metrics = model.val(split="val", project=str(out_dir), name="val", **common)
    except Exception as exc:
        print(f"[ERROR] Evaluasi validation gagal: {exc}")
        return 1
    val_m = extract_overall(val_metrics)
    val_pc = extract_per_class(val_metrics, model.names)
    out_dir.mkdir(parents=True, exist_ok=True)
    write_metrics_csv(out_dir / "val_metrics.csv", val_m, val_pc)
    print(f"  -> {fmt_metrics(val_m)}")

    # 3) Evaluasi test (bila ada)
    test_m = {"precision": None, "recall": None, "map50": None, "map5095": None}
    if test_available:
        print("\n" + _line("-"))
        print("Evaluasi TEST set ...")
        print(_line("-"))
        try:
            test_metrics = model.val(split="test", project=str(out_dir), name="test", **common)
            test_m = extract_overall(test_metrics)
            test_pc = extract_per_class(test_metrics, model.names)
            write_metrics_csv(out_dir / "test_metrics.csv", test_m, test_pc)
            print(f"  -> {fmt_metrics(test_m)}")
        except Exception as exc:
            print(f"[PERINGATAN] Evaluasi test gagal: {exc}")
            test_available = False
            write_metrics_csv(out_dir / "test_metrics.csv", test_m, [])
    else:
        print("\n[INFO] Test set tidak tersedia -> evaluasi test dilewati.")
        write_metrics_csv(out_dir / "test_metrics.csv", test_m, [])

    # 7-8) Prediksi sample gambar
    sample_src_dir = test_dir if test_available else val_dir
    n_predictions = 0
    if sample_src_dir is not None:
        images = list_images(sample_src_dir)
        if images:
            import random
            random.seed(42)
            k = min(args.num_samples, len(images))
            samples = random.sample(images, k)
            print("\n" + _line("-"))
            print(f"Prediksi {k} sample gambar dari: {sample_src_dir.name} ...")
            print(_line("-"))
            try:
                model.predict(source=[str(p) for p in samples], imgsz=args.imgsz,
                              conf=args.conf, iou=args.iou, device=device, save=True,
                              project=str(out_dir), name="predictions", exist_ok=True, verbose=False)
                n_predictions = k
            except Exception as exc:
                print(f"[PERINGATAN] Prediksi sample gagal: {exc}")
    else:
        print("[PERINGATAN] Tidak ada folder gambar untuk sampel prediksi.")

    # Summary
    summary = build_summary(args, device_label, val_m, test_m, test_available,
                            n_predictions, pred_dir)
    (out_dir / "evaluation_summary.txt").write_text(summary, encoding="utf-8")
    print("\n")
    print(summary)
    print(f"\nOutput tersimpan di: {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
