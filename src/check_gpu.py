"""
check_gpu.py
============
Cek kesiapan environment untuk training YOLO26 dengan GPU.

Menampilkan:
  - versi Python, PyTorch, dan CUDA (dari PyTorch)
  - ketersediaan CUDA, jumlah GPU, nama GPU, dan total VRAM
  - rekomendasi konfigurasi training untuk RTX 4060 Laptop 8 GB

Jalankan dari ROOT project (Windows):
    python src/check_gpu.py
    python src/check_gpu.py --quiet     # ringkas (tanpa rekomendasi)

Exit code:
    0 = CUDA tersedia (siap training GPU)
    1 = CUDA tidak tersedia
    2 = PyTorch belum terinstal / error tak terduga
"""

from __future__ import annotations

import argparse
import platform
import sys

# Rekomendasi tetap untuk RTX 4060 Laptop 8 GB (dipakai di --quiet maupun normal).
RECOMMENDATION = {
    "model": "yolo26s.pt",
    "imgsz": 640,
    "batch_awal": 8,
    "fallback_batch": [4, 2],
    "epochs_baseline": 50,
}


def _line(char: str = "=", width: int = 60) -> str:
    return char * width


def print_recommendation() -> None:
    """Tampilkan rekomendasi konfigurasi untuk RTX 4060 Laptop 8 GB."""
    print(_line())
    print("REKOMENDASI KONFIGURASI (RTX 4060 Laptop, 8 GB VRAM)")
    print(_line())
    print(f"  model           : {RECOMMENDATION['model']}")
    print(f"  imgsz           : {RECOMMENDATION['imgsz']}")
    print(f"  batch awal      : {RECOMMENDATION['batch_awal']}")
    print(
        "  fallback batch  : "
        f"{' -> '.join(str(b) for b in RECOMMENDATION['fallback_batch'])} "
        "(jika CUDA out of memory)"
    )
    print(f"  epochs baseline : {RECOMMENDATION['epochs_baseline']}")
    print("  amp             : True (mixed precision, hemat VRAM)")
    print(_line())


def check_gpu(quiet: bool = False) -> int:
    """Cek PyTorch + CUDA dan cetak ringkasan environment.

    Returns exit code (0 = CUDA ready, 1 = no CUDA, 2 = torch missing/error).
    """
    print(_line())
    print("ENVIRONMENT CHECK - Construction Safety Helmet (YOLO26)")
    print(_line())
    print(f"  OS              : {platform.system()} {platform.release()}")
    print(f"  Python          : {platform.python_version()}")

    # 1) Pastikan PyTorch terinstal.
    try:
        import torch
    except ImportError:
        print("  PyTorch         : TIDAK TERINSTAL")
        print(_line())
        print("[ERROR] PyTorch belum terinstal.")
        print("        Instal PyTorch CUDA dari perintah resmi pytorch.org,")
        print("        sesuaikan dengan driver NVIDIA & versi CUDA Anda:")
        print("            https://pytorch.org/get-started/locally/")
        return 2
    except Exception as exc:  # pragma: no cover - keadaan tak terduga
        print(f"[ERROR] Gagal mengimpor PyTorch: {exc}")
        return 2

    print(f"  PyTorch         : {torch.__version__}")

    # 2) Cek ketersediaan CUDA.
    try:
        cuda_available = torch.cuda.is_available()
    except Exception as exc:  # pragma: no cover
        print(f"[ERROR] Gagal memeriksa CUDA: {exc}")
        return 2

    cuda_build = getattr(torch.version, "cuda", None)
    print(f"  CUDA (build)    : {cuda_build if cuda_build else 'CPU-only build'}")
    print(f"  CUDA tersedia   : {'YA' if cuda_available else 'TIDAK'}")

    if not cuda_available:
        print(_line())
        print("[PERINGATAN] CUDA TIDAK TERSEDIA - training GPU tidak dapat dilakukan.")
        print("Periksa hal berikut:")
        print("  1. Instalasi PyTorch CUDA (bukan versi CPU-only).")
        print("     -> Ikuti perintah resmi: https://pytorch.org/get-started/locally/")
        print("  2. Driver NVIDIA terbaru sudah terpasang.")
        print("     -> Cek dengan perintah: nvidia-smi")
        print("  3. Environment Python yang aktif sudah benar (virtual env benar).")
        print("Untuk sementara training hanya bisa di CPU (device='cpu'), jauh lebih lambat.")
        print(_line())
        return 1

    # 3) CUDA tersedia -> tampilkan detail GPU.
    try:
        gpu_count = torch.cuda.device_count()
        print(f"  Jumlah GPU      : {gpu_count}")
        for idx in range(gpu_count):
            props = torch.cuda.get_device_properties(idx)
            vram_gb = props.total_memory / (1024 ** 3)
            print(f"  GPU [{idx}]        : {props.name}")
            print(f"  VRAM [{idx}]       : {vram_gb:.2f} GB")
    except Exception as exc:  # pragma: no cover
        print(f"[ERROR] Gagal membaca properti GPU: {exc}")
        return 2

    print(_line())
    print("[OK] CUDA siap. Training GPU dapat dilakukan (device=0).")

    if not quiet:
        print()
        print_recommendation()

    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Cek PyTorch, CUDA, dan GPU untuk training YOLO26.",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Tampilkan ringkas saja (tanpa blok rekomendasi).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        return check_gpu(quiet=args.quiet)
    except KeyboardInterrupt:
        print("\n[INFO] Dibatalkan oleh pengguna.")
        return 130


if __name__ == "__main__":
    sys.exit(main())
