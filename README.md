# Construction Safety Helmet Detection using YOLO26S

Proyek ini melatih model **YOLO26S** (`yolo26s.pt`) untuk mendeteksi objek
keselamatan konstruksi dari dataset berformat **YOLO detection**. Alur kerja
menggabungkan **Jupyter Notebook untuk EDA** dan **script Python modular** untuk
validasi dataset, training, evaluasi, tuning, inference, dan export model.

Dataset memiliki **3 kelas**:

| ID | Kelas       | Arti                     |
|----|-------------|--------------------------|
| 0  | `Helmet`    | Orang memakai helm       |
| 1  | `No-Helmet` | Orang tidak memakai helm |
| 2  | `Person`    | Orang (terdeteksi)       |

> **Catatan nama folder dataset.** Folder dataset di repo ini bernama **`dataset/`**
> (bukan `zatset/`). Seluruh script, config, dan perintah di README ini memakai
> **`dataset/data.yaml`**. Jika Anda menyalin perintah dari template lain yang
> menulis `zatset/`, ganti menjadi `dataset/`.

---

## Daftar Isi

1. [Deskripsi](#1-deskripsi)
2. [Spesifikasi Environment](#2-spesifikasi-environment)
3. [Struktur Proyek](#3-struktur-proyek)
4. [Struktur Dataset](#4-struktur-dataset)
5. [Setup Environment (Windows)](#5-setup-environment-windows)
6. [Alur Kerja Lengkap](#6-alur-kerja-lengkap)
7. [Penjelasan & Interpretasi Metrik](#7-penjelasan--interpretasi-metrik)
8. [Troubleshooting](#8-troubleshooting)
9. [Rekomendasi untuk RTX 4060 Laptop 8 GB](#9-rekomendasi-untuk-rtx-4060-laptop-8-gb)
10. [Ringkasan Output `runs/`](#10-ringkasan-output-runs)

---

## 1. Deskripsi

Proyek ini melatih model YOLO26S untuk mendeteksi objek keselamatan konstruksi
(helm / tanpa helm / orang) dari dataset berformat YOLO detection. Tujuannya
membangun pipeline reproducible: dari pemeriksaan environment, validasi & analisis
dataset, training baseline, evaluasi, tuning ringan, hingga inference dan export
model siap-deploy. **Training selalu dilakukan via script** (`src/train.py`),
sedangkan notebook hanya untuk EDA & visualisasi.

---

## 2. Spesifikasi Environment

| Komponen   | Versi / Detail                        |
|------------|----------------------------------------|
| OS         | Windows                                |
| Python     | 3.12.10                                |
| GPU        | NVIDIA RTX 4060 Laptop GPU, 8 GB VRAM  |
| Framework  | Ultralytics YOLO                       |
| Model      | `yolo26s.pt` (YOLO26 small)            |
| Task       | Object detection (`detect`)            |

---

## 3. Struktur Proyek

```
construction-safety-yolo26/
├── dataset/                  # dataset asli (JANGAN diubah / di-rename)
│   ├── train/{images,labels}
│   ├── valid/{images,labels}
│   ├── test/{images,labels}
│   ├── data.yaml
│   ├── README.dataset.txt
│   └── README.roboflow.txt
├── notebooks/
│   └── 01_eda.ipynb          # EDA & visualisasi (memanggil fungsi src/eda.py)
├── src/
│   ├── check_gpu.py          # cek PyTorch / CUDA / GPU
│   ├── validate_dataset.py   # validasi integritas dataset
│   ├── eda.py                # EDA versi script
│   ├── train.py              # training baseline (fallback batch 8→4→2)
│   ├── evaluate.py           # evaluasi val & test + sample prediksi
│   ├── tune.py               # tuning ringan (maks 4 eksperimen)
│   ├── infer.py              # inference gambar/folder/video
│   └── export_model.py       # export ONNX / TorchScript / TensorRT
├── runs/                     # SEMUA hasil eksperimen tersimpan di sini
├── requirements.txt
├── config.yaml               # konfigurasi terpusat (default semua script)
└── README.md
```

Semua script dijalankan dari **root project**, memakai path relatif berbasis
`pathlib.Path` (kompatibel Windows), dan semua keluaran ditulis ke `runs/`.

---

## 4. Struktur Dataset

```
dataset/
├── train/images
├── train/labels
├── valid/images
├── valid/labels
├── test/images
├── test/labels
└── data.yaml
```

Isi pokok `dataset/data.yaml`:

```yaml
train: ../train/images
val:   ../valid/images
test:  ../test/images
nc: 3
names: ['Helmet', 'No-Helmet', 'Person']
```

**Folder validasi bernama `valid`, tetapi di `data.yaml` ditulis dengan key `val`**
(konvensi Ultralytics), mengarah ke folder `valid/images`, contoh:

```yaml
val: valid/images
```

Catatan resolusi path:

- Key untuk data validasi adalah **`val:`** (bukan `valid:`), dan menunjuk ke
  folder fisik **`valid/`**.
- `data.yaml` hasil ekspor Roboflow memakai prefiks `../` (mis. `../valid/images`).
  Ultralytics maupun script di proyek ini **otomatis menangani** prefiks `../`
  tersebut dan juga menerima nama folder `valid` maupun `val`, sehingga
  `dataset/data.yaml` bisa dipakai langsung tanpa diedit.

**Aturan penting:** jangan menyalin, menghapus, me-rename, atau mengubah file di
dalam `dataset/`. Saat training/evaluasi, Ultralytics akan membuat berkas
`dataset/*/labels.cache` secara otomatis — ini normal dan dibuat ulang bila dihapus.

---

## 5. Setup Environment (Windows)

Jalankan semua perintah dari **root project**.

### 5.1. Virtual environment

```bat
python -m venv .venv
.venv\Scripts\activate
```

### 5.2. Upgrade pip

```bat
python -m pip install --upgrade pip
```

### 5.3. Install PyTorch dengan dukungan CUDA

PyTorch **tidak** di-pin di `requirements.txt`. Instal lebih dulu mengikuti
perintah **resmi** dari situs PyTorch, sesuaikan dengan driver NVIDIA & versi CUDA
pada mesin Anda:

> https://pytorch.org/get-started/locally/

Contoh (CUDA 12.1 — **sesuaikan**, jangan disalin mentah):

```bat
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### 5.4. Install dependency proyek

```bat
pip install -r requirements.txt
```

### 5.5. Cek GPU & kesiapan CUDA

```bat
python src/check_gpu.py
```

Menampilkan versi Python, PyTorch, CUDA, nama GPU, total VRAM, jumlah GPU, serta
rekomendasi konfigurasi untuk RTX 4060 Laptop 8 GB. Bila CUDA tidak terdeteksi,
script memberi langkah pemeriksaan.

---

## 6. Alur Kerja Lengkap

Ringkasan perintah (urut dari awal sampai export):

| Langkah | Perintah |
|---------|----------|
| Cek GPU | `python src/check_gpu.py` |
| Validasi dataset | `python src/validate_dataset.py --data dataset/data.yaml` |
| EDA (script) | `python src/eda.py --data dataset/data.yaml` |
| EDA (notebook) | `jupyter notebook notebooks/01_eda.ipynb` |
| Training baseline | `python src/train.py --config config.yaml` |
| Evaluasi | `python src/evaluate.py --weights runs/train/helmet_yolo26s_baseline/weights/best.pt --data dataset/data.yaml` |
| Tuning ringan | `python src/tune.py --data dataset/data.yaml` |
| Inference | `python src/infer.py --weights runs/train/helmet_yolo26s_baseline/weights/best.pt --source path/to/image.jpg --conf 0.25` |
| Export ONNX | `python src/export_model.py --weights runs/train/helmet_yolo26s_baseline/weights/best.pt --format onnx` |

### 6.1. Validasi dataset

```bat
python src/validate_dataset.py --data dataset/data.yaml
python src/validate_dataset.py --data dataset/data.yaml --quick   :: lewati cek gambar rusak
```

Memeriksa keberadaan folder train/valid/test, pasangan gambar–label, gambar rusak
(PIL), label kosong, format label YOLO (5 kolom, koordinat 0–1, w/h > 0), dan
`class_id < nc`. Output ke `runs/dataset_validation/`: `summary.csv`,
`class_distribution.csv`, `missing_labels.csv`, `orphan_labels.csv`,
`empty_labels.csv`, `bad_labels.csv`, `corrupt_images.csv`, `validation_report.txt`.

### 6.2. EDA (Exploratory Data Analysis)

```bat
python src/eda.py --data dataset/data.yaml
python src/eda.py --data dataset/data.yaml --img-sample 4000      :: percepat baca ukuran gambar
```

Menghasilkan statistik split, distribusi kelas, ukuran gambar, statistik bbox,
indikasi class imbalance & objek kecil. Output ke `runs/eda/`: `eda_summary.csv`,
`class_distribution.csv`, `bbox_statistics.csv`, `image_statistics.csv`,
`eda_report.txt`, dan `figures/` (6 PNG).

Notebook (hanya EDA & visualisasi, **tanpa training**):

```bat
jupyter notebook notebooks/01_eda.ipynb
```

### 6.3. Training baseline

```bat
python src/train.py --config config.yaml
```

Dengan override parameter:

```bat
python src/train.py --config config.yaml --model yolo26s.pt --epochs 50 --batch 8 --imgsz 640
```

Membaca `config.yaml`, memvalidasi dataset & CUDA, lalu melatih `yolo26s.pt`.
Jika **CUDA Out Of Memory**, batch otomatis turun **8 → 4 → 2**. Hasil ke
`runs/train/helmet_yolo26s_baseline/` (bobot `best.pt`/`last.pt`, plot, `results.csv`)
dan ringkasan ke `runs/train/training_summary.txt`.

### 6.4. Evaluasi

```bat
python src/evaluate.py --weights runs/train/helmet_yolo26s_baseline/weights/best.pt --data dataset/data.yaml
python src/evaluate.py --weights ...best.pt --allow-cpu    :: bila tanpa GPU
```

Mengevaluasi validation set dan (bila tersedia) test set, membandingkan keduanya,
serta membuat sample prediksi. Output ke `runs/evaluate/`: `val_metrics.csv`,
`test_metrics.csv`, `evaluation_summary.txt`, dan `predictions/`.

### 6.5. Tuning ringan

```bat
python src/tune.py --data dataset/data.yaml
python src/tune.py --data dataset/data.yaml --dry-run      :: lihat rencana saja
python src/tune.py --data dataset/data.yaml --max-exp 2    :: jalankan 2 eksperimen pertama
```

Menjalankan **maksimal 4 eksperimen** terkurasi (variasi `lr0`, `weight_decay`,
`epochs`) dengan fallback OOM 8→4→2. Eksperimen yang gagal tidak menghentikan
proses (dicatat dan dilanjutkan). Output ke `runs/tune/`: folder tiap eksperimen,
`tuning_results.csv`, dan `best_model_summary.txt`. Model terbaik dipilih
berdasarkan **mAP50-95 → recall → (stabilitas & batch lebih besar)**.

### 6.6. Inference

```bat
python src/infer.py --weights runs/train/helmet_yolo26s_baseline/weights/best.pt --source path/to/image.jpg --conf 0.25
```

Mendukung **satu gambar, folder gambar, atau video**. Opsi tambahan:
`--save-txt`, `--save-conf`, `--show`, `--allow-cpu`. Menampilkan jumlah objek per
kelas dan menyimpan hasil beranotasi ke `runs/infer/predict/` serta ringkasan ke
`runs/infer/inference_summary.txt`.

### 6.7. Export model

```bat
python src/export_model.py --weights runs/train/helmet_yolo26s_baseline/weights/best.pt --format onnx
python src/export_model.py --weights ...best.pt --format torchscript
python src/export_model.py --weights ...best.pt --format onnx,torchscript   :: beberapa sekaligus
python src/export_model.py --weights ...best.pt --format tensorrt           :: dilewati bila env tak siap
```

Format: **ONNX** (`simplify=True` bila `onnxslim`/`onnxsim` terpasang, `opset=12`),
**TorchScript** (standar), dan **TensorRT** (opsional; otomatis dilewati bila tidak
ada GPU CUDA / paket `tensorrt`). Hasil dipindah ke `runs/export/` beserta
`export_summary.txt`.

---

## 7. Penjelasan & Interpretasi Metrik

### Penjelasan metrik

| Metrik       | Arti |
|--------------|------|
| **Precision** | TP / (TP + FP) — dari semua deteksi yang dibuat model, berapa proporsi yang benar. Tinggi = sedikit false positive. |
| **Recall**    | TP / (TP + FN) — dari semua objek yang seharusnya ada, berapa proporsi yang berhasil terdeteksi. Tinggi = sedikit objek terlewat. |
| **mAP50**     | mean Average Precision pada IoU = 0.50. Mengukur kemampuan mengenali objek dengan toleransi lokalisasi longgar. |
| **mAP50-95**  | rata-rata mAP pada IoU 0.50–0.95 (langkah 0.05). Metrik utama gaya COCO; sensitif terhadap **presisi lokalisasi** bounding box. |

### Interpretasi metrik

- **Precision tinggi & recall rendah** → model **konservatif**: deteksinya akurat
  tetapi banyak objek terlewat. Pertimbangkan menurunkan `conf`, menambah data, atau
  augmentasi.
- **Recall tinggi & precision rendah** → model menghasilkan banyak **false positive**:
  sering mendeteksi tetapi banyak yang salah. Pertimbangkan menaikkan `conf` atau
  memperbaiki kualitas anotasi.
- **mAP50 tinggi tetapi mAP50-95 rendah** → objek **sudah dikenali** namun
  **lokalisasi bounding box belum presisi** (kurang baik pada IoU ketat). Latih lebih
  lama atau gunakan augmentasi geometris.
- **Performa test jauh lebih rendah daripada validation** → indikasi **overfitting**
  atau **perbedaan distribusi** data train/test. Tambah regularisasi/augmentasi,
  periksa kebocoran data, dan pastikan split representatif.

---

## 8. Troubleshooting

| Masalah | Penyebab & Solusi |
|---------|-------------------|
| **CUDA tidak terdeteksi** | PyTorch versi CPU-only / driver bermasalah. Jalankan `python src/check_gpu.py`, instal ulang PyTorch CUDA dari pytorch.org, cek `nvidia-smi`, dan pastikan virtual environment yang benar aktif. |
| **CUDA out of memory** | `train.py`/`tune.py` otomatis menurunkan batch **8 → 4 → 2**. Bila masih OOM: turunkan `--imgsz` (mis. 512), pastikan `cache=false`, tutup aplikasi lain pemakai GPU, atau jalankan dengan `--device cpu` (lambat). |
| **`data.yaml` tidak terbaca** | Jalankan dari **root project** dengan path `dataset/data.yaml`; pastikan `PyYAML` terinstal (`pip install -r requirements.txt`) dan file tidak korup. |
| **Folder `valid` tidak terbaca** | Pastikan key di `data.yaml` adalah **`val:`** (menunjuk `valid/images`). Script menerima nama `valid`/`val` dan menangani prefiks `../` otomatis; periksa struktur `dataset/valid/{images,labels}`. |
| **Label YOLO tidak valid** | Jalankan `python src/validate_dataset.py --data dataset/data.yaml` lalu cek `runs/dataset_validation/bad_labels.csv`. Setiap baris harus `class_id x_center y_center width height` (koordinat 0–1, `w`/`h` > 0). Catatan: dataset ini punya sedikit label segmentasi nyasar yang otomatis dibuang Ultralytics saat training. |
| **`class_id` melebihi jumlah class** | `class_id` harus `0..nc-1` (di sini 0–2). `validate_dataset.py` menandainya di `bad_labels.csv`. Perbaiki label atau sesuaikan `nc`/`names` di `data.yaml`. |
| **Weights tidak ditemukan** | Latih model dulu (`python src/train.py --config config.yaml`) atau berikan `--weights` ke path `best.pt` yang benar (mis. `runs/train/helmet_yolo26s_baseline/weights/best.pt`). |
| **Ultralytics belum mengenali `yolo26s.pt`** | Perbarui Ultralytics (`pip install -U ultralytics`, butuh versi yang mendukung YOLO26, mis. 8.4.x). Saat pertama dipakai, bobot diunduh otomatis dari rilis aset Ultralytics; pastikan koneksi internet tersedia. |

> Catatan path keluaran: Ultralytics me-resolve `project` **relatif** ke
> `runs/<task>/...`. Script di proyek ini mengirim **path absolut** sehingga keluaran
> tetap mendarat tepat di `runs/train`, `runs/evaluate`, `runs/tune`, `runs/infer`,
> dan `runs/export`.

---

## 9. Rekomendasi untuk RTX 4060 Laptop 8 GB

- Gunakan model **`yolo26s.pt`** (small).
- Gunakan **`imgsz=640`**.
- Mulai dari **`batch=8`**.
- Sediakan **fallback ke `batch=4` atau `batch=2`** bila terjadi CUDA OOM
  (sudah otomatis di `train.py` dan `tune.py`).
- Baseline cukup **`epochs=50`** (dengan `patience` untuk early stopping).
- Tuning **maksimal 4 eksperimen** (ringan, terkurasi).
- **Jangan** memakai **YOLO26M / L / X** untuk eksperimen awal — terlalu berat untuk
  VRAM 8 GB (`tune.py` bahkan menolak model selain small).

---

## 10. Ringkasan Output `runs/`

```
runs/
├── dataset_validation/   # validate_dataset.py  (8 berkas CSV/TXT)
├── eda/                  # eda.py                (CSV, eda_report.txt, figures/)
├── train/                # train.py              (helmet_yolo26s_baseline/, training_summary.txt)
├── evaluate/             # evaluate.py           (val_metrics.csv, test_metrics.csv, evaluation_summary.txt, predictions/)
├── tune/                 # tune.py               ({exp}/, tuning_results.csv, best_model_summary.txt)
├── infer/                # infer.py              (predict/, inference_summary.txt)
└── export/               # export_model.py       (file model + export_summary.txt)
```

---

**Lisensi dataset:** CC BY 4.0 (Roboflow — `construction-safety-helmet-lnit7`).
Jangan menyertakan kredensial/API key apa pun di dalam kode atau commit.
