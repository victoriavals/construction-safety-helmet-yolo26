# SafetyAI — Frontend Deteksi Helm Konstruksi (YOLO26s)

Frontend React + Vite + TypeScript (bilingual ID/EN, responsif penuh) untuk
sistem **deteksi helm keselamatan** berbasis YOLO26s. Semua inference dilakukan
di **backend FastAPI** (lihat `../backend-huggingface/`); frontend ini hanya
mengirim gambar/video ke API dan menampilkan hasilnya.

Halaman: **Home**, **Detect** (inti), **Dashboard** (riwayat + statistik), **About**.
Kelas deteksi: `Helmet` (biru `#4C72B0`), `No-Helmet` (merah `#C44E52`), `Person` (hijau `#55A868`).

## Konfigurasi URL backend

Pilih salah satu (keduanya didukung; `public/config.js` menang bila diisi):

1. **Runtime — `public/config.js`** (bisa diubah TANPA build ulang):
   ```js
   window.API_BASE = "https://namauser-deteksi-helm-api.hf.space";
   ```
2. **Build-time — variabel lingkungan** `VITE_API_BASE` (mis. di dashboard
   Vercel, atau di `.env.local` untuk lokal):
   ```
   VITE_API_BASE=https://namauser-deteksi-helm-api.hf.space
   ```

Jika belum diisi, halaman Detect menampilkan status **"Atur URL backend…"**.

## Jalankan lokal

**Prasyarat:** Node.js 18+.

```bash
npm install
# (opsional) salin .env.example -> .env.local lalu isi VITE_API_BASE
npm run dev      # http://localhost:3000
```

## Build & deploy

```bash
npm run build    # output ke dist/
npm run preview  # pratinjau hasil build
```

- **Deploy ke Vercel / hosting statis:** publish folder `dist/`. Set
  `VITE_API_BASE` di Environment Variables, atau edit `dist/config.js` setelah
  build.
- **Deploy ke VPS (nginx/Caddy):** sajikan `dist/` sebagai situs statis; arahkan
  semua rute ke `index.html` (SPA fallback).

Backend (FastAPI) berjalan terpisah di Hugging Face Space — pastikan CORS-nya
mengizinkan domain frontend (default backend: `allow_origins=["*"]`).

## Fitur yang terhubung ke backend

- `GET /` — health check → status server (Terhubung / Menghubungi / Error).
- `POST /predict/image?conf=&iou=` — upload/contoh gambar → gambar beranotasi
  + hitungan per kelas + total + waktu inferensi + peringatan K3.
- `POST /predict/video?conf=&iou=` — upload video → MP4 beranotasi.
- Slider **Confidence** (0.05–0.95) & **IoU** (0.1–0.9); mengubahnya menjalankan
  ulang deteksi gambar terakhir secara otomatis.
