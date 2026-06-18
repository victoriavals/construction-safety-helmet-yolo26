# Web Demo — Deteksi Helm Konstruksi (YOLO26s, in-browser ONNX)

Demo deteksi keselamatan helm yang berjalan **100% di browser** memakai
**ONNX Runtime Web** — tanpa server, tanpa upload data. Mendukung:
**upload gambar · upload video · webcam realtime · contoh bawaan**.

```
webdemo/
├── index.html        # UI
├── styles.css
├── app.js            # preprocess (letterbox 640) + inference ONNX + NMS + render
├── model/
│   └── best.onnx     # ← LETAKKAN model ONNX di sini (lihat langkah 1)
└── examples/         # gambar contoh (sudah diisi beberapa dari test set)
```

## 1. Siapkan model ONNX (sekali saja)

Export model terlatih ke ONNX, lalu salin ke `webdemo/model/best.onnx`:

```powershell
# dari root project, pakai .venv (butuh model best.pt)
.venv\Scripts\python.exe src\export_model.py --weights runs\train\helmet_yolo26s_baseline\weights\best.pt --format onnx
copy runs\export\best.onnx webdemo\model\best.onnx
```

> Catatan: `export_model.py` mengekspor pada **imgsz 640, opset 12, batch 1** — sudah
> sesuai dengan yang diharapkan `app.js` (`INPUT = 640`). Jika kamu meng-export pada
> ukuran lain, ubah `INPUT` di `app.js`.

## 2. Jalankan lokal

Browser memblokir `fetch` model dari `file://`, jadi jalankan lewat server statis kecil:

```powershell
# opsi a: python
cd webdemo
python -m http.server 8080
# buka http://localhost:8080

# opsi b: VS Code "Live Server" extension -> Open with Live Server
```

## 3. Deploy publik (gratis)

Karena ini **statis murni**, tinggal unggah folder `webdemo/`:

- **GitHub Pages:** push folder ke repo → Settings → Pages → pilih branch/folder → selesai.
- **Netlify / Vercel:** drag-and-drop folder `webdemo/` (atau hubungkan repo). Tanpa build.
- **Hugging Face Spaces (Static):** buat Space tipe *Static*, unggah file.

Pastikan `model/best.onnx` (~30–40 MB) ikut ter-deploy. Semua hosting di atas
mendukung file statis sebesar itu.

## Cara kerja singkat (untuk penjelasan sidang)

1. **Pre-processing** — tiap gambar/frame di-*letterbox* ke 640×640 (resize jaga rasio +
   padding abu-abu 114) lalu dinormalisasi 0–1, NCHW RGB. Identik dengan training.
2. **Inference** — ONNX Runtime Web menjalankan `yolo26s.onnx` (WebGPU bila tersedia,
   jatuh ke WASM/CPU).
3. **Post-processing** — decode output `[1, 4+nc, anchors]`, ambil skor kelas tertinggi,
   filter `confidence`, kembalikan koordinat ke ruang gambar asli, lalu **NMS** (per kelas).
4. **Render** — kotak berwarna per kelas, hitungan per kelas, dan **peringatan K3** bila
   ada `No-Helmet`.

## Catatan teknis

- **Privasi:** semua proses di perangkat pengguna; gambar/video tidak dikirim ke mana pun.
- **Kecepatan:** WebGPU jauh lebih cepat dari WASM. Video/webcam memakai loop yang
  *melewati frame* bila inferensi sebelumnya belum selesai (anti-antri).
- **Threshold:** slider Confidence & IoU bisa diatur langsung di UI.
- Bila output model berbeda format, `decode()` di `app.js` sudah otomatis menangani
  layout `[1,ch,N]` maupun `[1,N,ch]`.
