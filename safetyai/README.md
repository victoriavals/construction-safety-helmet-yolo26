# SafetyAI — Workspace Keselamatan

Frontend **Next.js App Router + React + TypeScript**, Tailwind CSS v4, shadcn/Radix, dan Motion. Bahasa Indonesia/Inggris, navigasi desktop/mobile, deteksi gambar/video, unduhan hasil, serta riwayat ringkasan pada browser.

Inference tetap dijalankan oleh FastAPI di `../backend-huggingface/`. Dataset dan pipeline Python tidak berubah.

## Jalankan

Prasyarat: Node.js >=20.9 (diverifikasi pada Node 24.12.0), npm, dan akses backend inferensi.

```powershell
cd safetyai
npm ci
npm run dev
# http://localhost:3000
```

## Backend dan konfigurasi

Urutan URL backend:

1. `window.API_BASE` pada `public/config.js` (runtime).
2. `NEXT_PUBLIC_API_BASE` pada `.env.local` (disertakan saat build Next.js).
3. Tidak dikonfigurasi.

Repository memakai URL Hugging Face yang sudah ada pada `public/config.js`. Untuk memakai variabel env, kosongkan override runtime tersebut terlebih dahulu:

```js
// public/config.js
window.API_BASE = "";
```

```dotenv
# .env.local
NEXT_PUBLIC_API_BASE=http://localhost:7860
```

Gunakan `.env.example` sebagai template. Variabel lama `VITE_API_BASE` perlu diganti. Untuk backend pada host lain, CSP di `src/proxy.ts` juga harus mengizinkan host tersebut; env `NEXT_PUBLIC_API_BASE` menambahkan origin-nya otomatis. Domain Hugging Face diizinkan secara default. Backend lokal localhost/127.0.0.1:7860 diizinkan pada development. Override runtime tidak melewati CSP.

Endpoint yang dipertahankan:

- `GET /`: health check, warm-up singleton/retry sampai sekitar 120 detik.
- `POST /predict/image?conf=&iou=`: gambar JPEG beranotasi, hitungan kelas, waktu inferensi.
- `POST /predict/video?conf=&iou=`: video MP4 beranotasi; tidak ada agregat hitungan video pada kontrak API saat ini.

Batas frontend mengikuti default backend: JPG/PNG/WebP 10 MB dan MP4/MOV/AVI/MKV/WebM 40 MB. Parameter baru hanya diterapkan saat analisis dijalankan. Request dapat dibatalkan; gambar/video memiliki batas request masing-masing 120/300 detik setelah warm-up.

## Rute dan data

| Rute | Fungsi |
| --- | --- |
| `/` | Ringkasan, sumber data nyata/demo, grafik, filter, detail, ekspor CSV |
| `/detect` | Pilih file/contoh, atur parameter, analisis, tinjau, unduh, simpan ringkasan gambar |
| `/about` | Panduan, metrik eksperimen, batasan model, privasi, konfigurasi |

Data demo terpisah dan tidak masuk riwayat nyata. localStorage `safetyai.scans.v2` menyimpan maksimal 100 ringkasan tanpa gambar/video. Pilihan bahasa tersimpan pada `safetyai.language.v1`. Riwayat hanya berlaku pada browser ini; belum ada database atau sinkronisasi akun.

“Tanpa temuan” bukan jaminan keselamatan. Kelas Person dapat tumpang tindih dengan Helmet/No-Helmet dan tidak boleh dijumlah sebagai jumlah pekerja unik.

## Verifikasi

```powershell
npm run lint       # pemeriksaan TypeScript
npm run build      # build Next.js produksi
npm run test:e2e   # 11 skenario × 2 viewport, membutuhkan Microsoft Edge
npm audit
```

Test Playwright menjalankan server produksi terpisah di port 3100. Jika Microsoft Edge belum tersedia, instal Edge atau ubah `channel` pada `playwright.config.ts` ke browser Playwright yang tersedia. Pengujian UI memakai respons API terkontrol; pemeriksaan inferensi gambar nyata juga dilakukan terpisah. Test axe bukan audit WCAG lengkap.

## Produksi

```powershell
npm run build
npm run start
```

Gunakan deployment Next.js pada Vercel atau server Node. Hasil build berada di `.next/`; **bukan lagi bundle Vite `dist/` yang dapat disajikan langsung sebagai file statis**. SSR/dynamic rendering diperlukan agar CSP nonce dapat ditambahkan pada script Next.js. Header keamanan dikelola `next.config.ts` dan `src/proxy.ts`, termasuk CSP produksi tanpa `unsafe-inline`/`unsafe-eval` pada script. `unsafe-eval` hanya ditambahkan saat development. Style inline tetap diizinkan untuk kebutuhan komponen.

Untuk Vercel, tetapkan Root Directory `safetyai`, Framework Preset Next.js, dan Build Command `npm run build`; jangan memakai Output Directory `dist` lama. Tidak ada deployment yang dilakukan pada pekerjaan redesign ini.

Font di-bundle lokal. Komponen React Bits dapat ditambahkan melalui registry `@react-bits` pada `components.json`. GSAP/Lottie/Rive tersedia sebagai tooling global namun tidak dimuat dalam aplikasi tanpa kebutuhan fitur.

- [Audit UI/UX dan bukti screenshot](../docs/uiux/AUDIT.md)
- [Instalasi global dan rekomendasi skill/MCP](../docs/uiux/GLOBAL-TOOLING.md)
- [Token dan aturan UI](DESIGN.md)
