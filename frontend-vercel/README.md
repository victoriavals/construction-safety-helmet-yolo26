# Frontend — Deteksi Helm Konstruksi (Vercel)

Frontend **statis** (HTML/CSS/JS, tanpa build) untuk demo deteksi helm.
Memanggil backend FastAPI (Hugging Face Space) untuk inference.
Fitur: **upload gambar**, **upload video**, **contoh bawaan**.

> Repo ini di-deploy ke **Vercel**. Backend-nya terpisah (lihat repo/Space backend).

## Isi
```
frontend-vercel/
├── index.html      # UI
├── styles.css
├── app.js          # panggil API backend, tampilkan hasil + hitungan + peringatan K3
├── config.js       # ← SET URL backend di sini
└── examples/       # gambar contoh
```

## Langkah 1 — Arahkan ke backend
Edit `config.js`:
```js
window.API_BASE = "https://NAMAUSER-NAMASPACE.hf.space";   // URL HF Space backend kamu
```

## Langkah 2 — Deploy ke Vercel
1. Push folder ini sebagai **repo GitHub tersendiri** (isi folder = root repo).
2. Vercel → **Add New → Project** → impor repo tersebut.
3. Setelan:
   - **Framework Preset: Other** (situs statis, tanpa build).
   - **Root Directory: `.`** (root repo; bukan subfolder).
   - Build Command / Output: kosongkan (default).
4. **Deploy** → dapat URL `https://namamu.vercel.app`.

> Alternatif tanpa GitHub: install `vercel` CLI lalu `vercel` di folder ini, atau
> drag-and-drop folder ke dashboard Vercel.

## Uji lokal
```powershell
# set config.js -> API_BASE = "http://localhost:8000" (atau URL backend lokalmu)
python -m http.server 5173      # buka http://localhost:5173
```
Jangan dibuka via double-click (`file://`) — gunakan server kecil agar `fetch` & contoh bekerja.

## Catatan
- Backend gratis (HF CPU) bisa **cold-start** (request pertama lambat) — UI sudah menampilkan
  status koneksi & pesan ramah.
- Untuk **webcam**: tidak disertakan (sesuai kebutuhan). Bila perlu realtime, gunakan
  varian in-browser ONNX yang terpisah.
- Pastikan domain Vercel-mu diizinkan oleh **CORS** backend (default backend membuka `*`).
