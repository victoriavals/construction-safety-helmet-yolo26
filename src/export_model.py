"""
export_model.py
===============
Export model YOLO26 (object detection) terlatih ke format deploy.

Format didukung:
  - onnx        (simplify=True bila onnxslim/onnxsim tersedia, opset aman)
  - torchscript (export standar)
  - tensorrt    (OPSIONAL; hanya bila GPU CUDA + paket tensorrt tersedia)

Catatan: Ultralytics menyimpan file export di samping weights sumber; script ini
MEMINDAHKAN hasilnya ke folder output (runs/export) agar rapi.

Jalankan dari ROOT project (Windows):
    python src/export_model.py --weights runs/train/helmet_yolo26s_baseline/weights/best.pt --format onnx
    python src/export_model.py --weights ...best.pt --format torchscript
    python src/export_model.py --weights ...best.pt --format onnx,torchscript   (beberapa sekaligus)
    python src/export_model.py --weights ...best.pt --format tensorrt           (dilewati bila env tak siap)

Output:
    runs/export/<file hasil export>
    runs/export/export_summary.txt
"""

from __future__ import annotations

import argparse
import shutil
import sys
from datetime import datetime
from pathlib import Path

# Pemetaan nama format pengguna -> nama format Ultralytics.
FORMAT_MAP = {
    "onnx": "onnx",
    "torchscript": "torchscript",
    "tensorrt": "engine",
    "engine": "engine",
}

DEFAULTS = {
    "weights": "runs/train/helmet_yolo26s_baseline/weights/best.pt",
    "imgsz": 640,
    "device": "0",
    "format": "onnx",
    "output": "runs/export",
    "opset": 12,  # opset ONNX yang aman & kompatibel luas
}


def _line(char: str = "=", width: int = 64) -> str:
    return char * width


# --------------------------------------------------------------------------- #
# Pemeriksaan ketersediaan
# --------------------------------------------------------------------------- #
def simplify_available() -> tuple[bool, str]:
    """Cek apakah penyederhana ONNX (onnxslim/onnxsim) tersedia."""
    for mod in ("onnxslim", "onnxsim"):
        try:
            __import__(mod)
            return True, mod
        except ImportError:
            continue
    return False, ""


def module_available(name: str) -> bool:
    try:
        __import__(name)
        return True
    except Exception:
        return False


def resolve_device(device) -> tuple[object, bool, str]:
    """Return (effective_device, cuda_available, gpu_name)."""
    try:
        import torch
    except ImportError as exc:
        raise RuntimeError("PyTorch belum terinstal. Instal PyTorch dari pytorch.org.") from exc

    cuda = torch.cuda.is_available()
    if str(device).lower() == "cpu":
        return "cpu", cuda, "CPU"
    if cuda:
        idx = int(device) if str(device).isdigit() else 0
        try:
            name = torch.cuda.get_device_properties(idx).name
        except Exception:
            name = "GPU"
        return device, True, name
    # Diminta GPU tapi CUDA tak ada -> fallback CPU untuk format yang bisa (onnx/torchscript).
    print("[PERINGATAN] CUDA tidak tersedia. ONNX/TorchScript akan diexport di CPU; "
          "TensorRT akan dilewati.")
    return "cpu", False, "CPU"


# --------------------------------------------------------------------------- #
# Export satu format
# --------------------------------------------------------------------------- #
def export_one(weights: Path, fmt_user: str, imgsz: int, device, cuda_available: bool,
               out_dir: Path, opset: int, do_simplify: bool, half: bool) -> dict:
    """Export ke satu format. Selalu kembalikan dict hasil (tidak melempar)."""
    result = {"format": fmt_user, "status": "failed", "path": "", "size_mb": None, "note": ""}
    ul_fmt = FORMAT_MAP[fmt_user]

    # 7-8) TensorRT: jangan dipaksa bila environment belum siap.
    if ul_fmt == "engine":
        if not cuda_available:
            result.update(status="skipped", note="TensorRT butuh GPU CUDA; CUDA tidak tersedia.")
            print(f"  [SKIP] TensorRT dilewati: {result['note']}")
            return result
        if not module_available("tensorrt"):
            result.update(status="skipped",
                          note="Paket 'tensorrt' tidak terpasang. Instal TensorRT (sesuai versi CUDA) lalu ulangi.")
            print(f"  [SKIP] TensorRT dilewati: {result['note']}")
            return result

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        result.update(status="failed", note=f"Ultralytics tak terimpor: {exc}")
        return result

    # Bangun argumen export.
    kwargs = {"format": ul_fmt, "imgsz": imgsz, "device": device}
    notes = []
    if ul_fmt == "onnx":
        if opset and opset > 0:
            kwargs["opset"] = opset
            notes.append(f"opset={opset}")
        kwargs["simplify"] = bool(do_simplify)
        notes.append(f"simplify={bool(do_simplify)}")
    if half and ul_fmt in ("onnx", "engine"):
        kwargs["half"] = True
        notes.append("half=True")

    print(f"  Export -> {fmt_user} ({', '.join(notes) if notes else 'standar'}) ...")
    try:
        model = YOLO(str(weights), task="detect")
        exported = Path(model.export(**kwargs))
    except Exception as exc:
        result.update(status="failed", note=f"{type(exc).__name__}: {exc}")
        print(f"  [ERROR] export {fmt_user} gagal: {exc}")
        return result

    # Pindahkan hasil ke out_dir agar rapi (export Ultralytics tersimpan di samping weights).
    dest = exported
    try:
        if exported.is_file():
            target = out_dir / exported.name
            if exported.resolve() != target.resolve():
                if target.exists():
                    target.unlink()
                shutil.move(str(exported), str(target))
                dest = target
    except Exception as exc:
        notes.append(f"gagal memindah ke output ({exc}); file tetap di {exported}")
        dest = exported

    size_mb = round(dest.stat().st_size / (1024 ** 2), 2) if dest.is_file() else None
    result.update(status="success", path=str(dest), size_mb=size_mb,
                  note="; ".join(notes))
    print(f"  [OK] {fmt_user} -> {dest}  ({size_mb} MB)")
    return result


# --------------------------------------------------------------------------- #
# Summary
# --------------------------------------------------------------------------- #
def build_summary(args, gpu_name, cuda_available, results: list[dict],
                  simplify_ok: bool, simplify_mod: str) -> str:
    L: list[str] = []
    L.append(_line())
    L.append("RINGKASAN EXPORT MODEL - YOLO26s (object detection)")
    L.append(_line())
    L.append(f"Waktu        : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    L.append(f"Weights      : {args.weights}")
    L.append(f"imgsz        : {args.imgsz}")
    L.append(f"Device       : {args.device} ({gpu_name}, CUDA={'ya' if cuda_available else 'tidak'})")
    L.append(f"ONNX simplify: {'tersedia (' + simplify_mod + ')' if simplify_ok else 'tidak tersedia -> simplify dinonaktifkan'}")
    L.append("")
    L.append("HASIL EXPORT")
    L.append("-" * 64)
    L.append(f"{'format':<14}{'status':<10}{'size(MB)':>10}  path / catatan")
    for r in results:
        size = f"{r['size_mb']}" if r["size_mb"] is not None else "-"
        detail = r["path"] if r["status"] == "success" else r["note"]
        L.append(f"{r['format']:<14}{r['status']:<10}{size:>10}  {detail}")
    L.append("")

    ok = [r for r in results if r["status"] == "success"]
    skipped = [r for r in results if r["status"] == "skipped"]
    failed = [r for r in results if r["status"] == "failed"]
    L.append(f"Ringkas: {len(ok)} sukses, {len(skipped)} dilewati, {len(failed)} gagal.")
    if ok:
        L.append("")
        L.append("Model hasil export:")
        for r in ok:
            L.append(f"  - [{r['format']}] {r['path']}")
    if any(r["format"] in ("tensorrt", "engine") and r["status"] == "skipped" for r in results):
        L.append("")
        L.append("Catatan TensorRT: dilewati karena environment belum siap (butuh GPU CUDA + "
                 "paket 'tensorrt'). Ini perilaku yang diharapkan, bukan error.")
    L.append(_line())
    return "\n".join(L)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def parse_formats(raw: str) -> tuple[list[str], list[str]]:
    """Parse string format (boleh dipisah koma). Return (valid, invalid)."""
    valid, invalid = [], []
    for tok in raw.split(","):
        t = tok.strip().lower()
        if not t:
            continue
        if t in FORMAT_MAP:
            if t not in valid:
                valid.append(t)
        else:
            invalid.append(t)
    return valid, invalid


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Export model YOLO26 ke ONNX/TorchScript/TensorRT.")
    p.add_argument("--weights", default=DEFAULTS["weights"], help="Path best.pt.")
    p.add_argument("--format", default=DEFAULTS["format"],
                   help="onnx | torchscript | tensorrt (boleh dipisah koma, mis. onnx,torchscript).")
    p.add_argument("--imgsz", type=int, default=DEFAULTS["imgsz"])
    p.add_argument("--device", default=DEFAULTS["device"], help="0 untuk GPU, 'cpu' untuk CPU.")
    p.add_argument("--output", "-o", default=DEFAULTS["output"], help="Folder output (default runs/export).")
    p.add_argument("--opset", type=int, default=DEFAULTS["opset"],
                   help="Opset ONNX (default 12; 0 = biarkan Ultralytics memilih).")
    p.add_argument("--no-simplify", action="store_true", help="Nonaktifkan simplify ONNX.")
    p.add_argument("--half", action="store_true", help="Export FP16 (untuk onnx/tensorrt).")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    out_dir = Path(args.output).resolve()

    print(_line())
    print("EXPORT MODEL YOLO26s - Construction Safety Helmet")
    print(_line())

    # 1) Validasi weights
    weights = Path(args.weights)
    if not weights.is_file():
        print(f"[ERROR] Weights tidak ditemukan: {weights}")
        print("        Latih model dulu (src/train.py) atau berikan --weights yang benar.")
        return 2

    # Parse format
    formats, invalid = parse_formats(args.format)
    if invalid:
        print(f"[PERINGATAN] format tidak dikenal diabaikan: {invalid} "
              f"(pilihan: {sorted(set(FORMAT_MAP))}).")
    if not formats:
        print("[ERROR] Tidak ada format valid. Gunakan: onnx, torchscript, tensorrt.")
        return 2

    # Device
    try:
        device, cuda_available, gpu_name = resolve_device(args.device)
    except RuntimeError as exc:
        print(f"[ERROR] {exc}")
        return 2

    # simplify availability (untuk ONNX)
    simplify_ok, simplify_mod = simplify_available()
    do_simplify = simplify_ok and not args.no_simplify

    print(f"Weights : {weights}")
    print(f"Device  : {args.device} ({gpu_name}, CUDA={'ya' if cuda_available else 'tidak'})")
    print(f"Format  : {formats}")
    if "onnx" in formats:
        print(f"ONNX    : simplify={'ya' if do_simplify else 'tidak'}"
              + ("" if simplify_ok else " (onnxslim/onnxsim tidak terpasang)")
              + f", opset={args.opset if args.opset > 0 else 'auto'}")
    print()

    out_dir.mkdir(parents=True, exist_ok=True)

    # 2-3) Export tiap format
    results: list[dict] = []
    for fmt in formats:
        print(_line("-"))
        print(f"FORMAT: {fmt}")
        print(_line("-"))
        try:
            res = export_one(weights, fmt, args.imgsz, device, cuda_available,
                             out_dir, args.opset, do_simplify, args.half)
        except KeyboardInterrupt:
            print("\n[INFO] Export dibatalkan oleh pengguna.")
            return 130
        except Exception as exc:  # safety net
            res = {"format": fmt, "status": "failed", "path": "", "size_mb": None,
                   "note": f"unexpected: {exc}"}
        results.append(res)

    # 4) Log summary
    summary = build_summary(args, gpu_name, cuda_available, results, simplify_ok, simplify_mod)
    summary_path = out_dir / "export_summary.txt"
    try:
        summary_path.write_text(summary, encoding="utf-8")
    except Exception as exc:
        print(f"[PERINGATAN] gagal menulis ringkasan: {exc}")

    print("\n")
    print(summary)
    print(f"\nRingkasan tersimpan di: {summary_path}")

    # 9) Exit code: 0 bila minimal satu sukses; 1 bila semua gagal (skip tidak dihitung gagal).
    n_ok = sum(1 for r in results if r["status"] == "success")
    n_failed = sum(1 for r in results if r["status"] == "failed")
    if n_ok == 0 and n_failed > 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
