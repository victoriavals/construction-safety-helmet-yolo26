# Audit dan redesign UI/UX SafetyAI

Tanggal: 15 November 2026 (WIB). Cakupan: frontend aktif `safetyai/`, kontrak API FastAPI, konfigurasi build, perilaku desktop/mobile, aksesibilitas dasar, dan tooling global. `webdemo/` adalah demo lama. Dataset, model, notebook, dan pipeline training tidak diubah.

## Tujuan pengguna

Pengguna utama diasumsikan petugas K3, pengawas lapangan, dan peninjau hasil model. Mereka perlu memilih gambar/video, menjalankan pemeriksaan, memahami prediksi dan ketidakpastiannya, mengunduh hasil, serta menemukan kembali ringkasan pemeriksaan. Asumsi ini berasal dari fungsi repository, bukan wawancara pengguna.

## Bukti sebelum redesign

- [Dashboard desktop](screenshots/before-dashboard-desktop.png).
- [Deteksi desktop](screenshots/before-detect-desktop.png).
- [Deteksi mobile 390 px](screenshots/before-detect-mobile.png).
- Source awal: `git show HEAD:safetyai/src/App.tsx`, `DashboardView.tsx`, `DetectView.tsx`, dan `HomeView.tsx` di direktori komponen versi awal.

## Temuan dan penyelesaiannya

Prioritas P0 = berpotensi menyesatkan keputusan; P1 = menghambat tugas atau kepercayaan; P2 = konsistensi, keterbacaan, dan pemeliharaan.

| Prioritas | Kekurangan awal | Dampak | Perubahan yang diterapkan |
| --- | --- | --- | --- |
| P0 | Deteksi awal menampilkan **STATUS PATUH** sebelum ada gambar dianalisis. | Ketiadaan hasil dianggap bukti keselamatan. | Status awal netral “Menunggu analisis”; nol objek menjadi “Tanpa objek”; prediksi tanpa kelas No-Helmet menjadi “Tanpa temuan”, disertai kewajiban verifikasi. |
| P0 | Statistik memakai basis 1.240/142/42 ms dan persentase kepatuhan campuran, lalu bertambah dengan unggahan nyata. | Angka demo terlihat seperti performa operasional. | “Data saya” dan “Lihat demo” terpisah. Statistik dihitung sepenuhnya dari sumber dan filter aktif. Demo memiliki banner, ID DEMO, dan periode eksplisit. |
| P0 | Beranda mengklaim live feed, monitoring berkelanjutan, dan waktu inferensi <45 ms tanpa implementasi pendukung. | Ekspektasi kemampuan dan latensi tidak sesuai. | Gambar ditandai contoh, bukan live feed. Tidak ada klaim CCTV/live monitoring; latensi berasal dari respons API. |
| P1 | Kelas Person dapat tumpang tindih dengan Helmet/No-Helmet. | Penjumlahan kelas dapat disalahartikan sebagai jumlah pekerja. | Semua ringkasan menjelaskan overlap; tidak membuat estimasi pekerja unik atau tingkat kepatuhan pekerja. |
| P1 | Navigasi hanya state `activeTab`, tanpa URL berbeda. | Refresh, deep link, dan tombol Back tidak mempertahankan konteks yang diharapkan. | Next.js App Router: `/`, `/detect`, `/about`; navigasi melalui Link dan `aria-current`. |
| P1 | Riwayat hanya state React dan berisi sample saat awal. | Riwayat nyata hilang setelah reload; sumber data kabur. | Maksimal 100 ringkasan di localStorage versi v2; validasi data saat dibaca; sinkronisasi antartab; tidak menyimpan gambar/video permanen. |
| P1 | Error memakai `alert()` dan menghilangkan konteks pemulihan. | Sulit memahami tahap yang gagal dan langkah selanjutnya. | Error inline dengan panduan koneksi; toast untuk simpan/batal; data lama dibersihkan sebelum analisis baru. |
| P1 | Tidak ada pembatalan request dan perlindungan respons terlambat. | Pengguna terjebak menunggu atau melihat hasil dari sumber lama. | AbortController, batas waktu request, identitas request, cleanup saat keluar halaman, dan tombol pembatalan. |
| P1 | Janji batas 10 MB hanya teks; tipe unggahan terlalu umum. | File tidak valid dikirim ke backend dan gagal terlambat. | Validasi sebelum request: gambar JPG/PNG/WebP 10 MB, video MP4/MOV/AVI/MKV/WebM 40 MB, file kosong ditolak. |
| P1 | Slider memicu inferensi ulang otomatis. | Request tidak disengaja, waktu tunggu, dan parameter hasil sulit dilacak. | Slider hanya mengatur analisis berikutnya; satu tombol eksplisit menjalankan analisis; parameter hasil disimpan di ringkasan. |
| P1 | Hasil video tidak memiliki ringkasan hitungan tetapi UI gambar tetap tersedia. | Nol hitungan dapat dianggap hasil penilaian video. | Hasil video memiliki pemutar dan unduhan; API yang belum menyediakan agregat dijelaskan; tidak membuat riwayat atau status gambar palsu. |
| P1 | Area upload/gambar contoh dan beberapa ikon berupa elemen klik tanpa dukungan keyboard/nama. | Pengguna keyboard dan pembaca layar kehilangan akses. | Tombol native, label file/range, alt gambar, fokus terlihat, skip link, Radix Tabs/Sheet/Dialog, judul dialog, Escape dan pengembalian fokus. |
| P1 | Hierarki teks kecil dan kontras sekunder rendah. | Informasi sulit dipindai, khususnya pada layar kecil. | Plus Jakarta Sans lokal, skala ukuran konsisten, teks penjelas diperbesar, warna sekunder diperkuat berdasarkan pemeriksaan axe. |
| P2 | Grafik tren terlihat hampir rata di screenshot awal dan tidak mempunyai alternatif data yang jelas. | Pola data sulit dibaca atau diakses tanpa visual. | Grafik SVG dari jumlah pemeriksaan sumber aktif; sumbu, legenda, dan tabel data yang dapat dibuka. Donut dihitung dari hitungan kelas aktual. |
| P2 | Tombol profil tanpa fungsi serta tautan footer `href="#"`. | Terlihat ada kemampuan yang sebenarnya tidak tersedia. | Kontrol tanpa fungsi dihapus; panduan, dataset, dan penjelasan privasi memiliki tujuan yang nyata. |
| P2 | Pilihan bahasa hilang saat reload; teks campur bahasa. | Pengalaman tidak konsisten. | Pilihan ID/EN tersimpan; `html.lang` menyesuaikan; narasi utama dan label tindakan menggunakan bahasa aktif. |
| P2 | Animasi belum mengikuti preferensi pengguna. | Gerakan mengganggu sebagian pengguna. | MotionConfig reducedMotion=user; CSS prefers-reduced-motion; transisi pendek; tidak mengaktifkan semua runtime animasi sekaligus. |
| P2 | Dokumentasi build Vite dan klaim metadata tidak lagi cocok. | Pengembang salah menjalankan/deploy aplikasi. | Dokumentasi Next.js, env NEXT_PUBLIC_API_BASE, deployment server, metadata akurat, serta CSP nonce untuk script Next.js. |

## Struktur pengalaman baru

1. **Ringkasan:** tindakan deteksi utama, penjelasan singkat, pemilih sumber nyata/demo, statistik, distribusi kelas, aktivitas tujuh hari WIB, riwayat, filter, detail, dan ekspor CSV sesuai filter.
2. **Deteksi baru:** sumber gambar/video, file/contoh, pratinjau, confidence dengan penjelasan, IoU dalam pengaturan lanjutan, analisis eksplisit, progress berbasis status, batal, hasil asli/AI, unduhan, dan simpan ringkasan gambar.
3. **Panduan & model:** alur, metrik eksperimen sebenarnya dari catatan repository, batasan recall, privasi lokal/server, dan konfigurasi koneksi.
4. **Mobile:** sidebar menjadi Sheet dengan fokus terkunci; tabel dapat digulir dalam region sendiri; tindakan analisis tersedia di bar bawah setelah file dipilih.

## Screenshot setelah redesign

- [Ringkasan desktop](screenshots/after-dashboard-desktop.png) dan [mobile](screenshots/after-dashboard-mobile.png).
- [Mode demo yang terpisah](screenshots/after-demo-desktop.png).
- [Deteksi desktop](screenshots/after-detect-desktop.png), [mobile](screenshots/after-detect-mobile.png), dan [aksi analisis mobile setelah file dipilih](screenshots/after-detect-selected-mobile.png).
- [Hasil inferensi nyata desktop](screenshots/after-detect-live-result-desktop.png) dan [mobile](screenshots/after-detect-result-mobile.png).
- [Panduan model desktop](screenshots/after-guide-desktop.png) dan [mobile](screenshots/after-guide-mobile.png).

## Arah visual

Workspace industri yang tenang: sidebar navy, konten terang, aksen amber untuk identitas/tindakan penting, permukaan putih dan garis halus. Warna kelas dilengkapi label/ikon sehingga makna tidak bergantung pada warna. Foto menggunakan aset contoh yang sudah ada dalam repository. Lihat [DESIGN.md](../../safetyai/DESIGN.md) untuk token dan aturan implementasi.

## Pemeriksaan dan batas cakupan

Hasil akhir: `npm run lint` dan `npm run build` berhasil; **22/22 test Playwright lulus** (11 skenario pada dua viewport); pemeriksaan axe pada `/`, `/detect`, dan `/about` tidak menemukan pelanggaran otomatis untuk tag WCAG yang diuji. `npm audit` melaporkan 0 kerentanan pada dependency project ketika diverifikasi. Screenshot final tersedia di direktori [screenshots](screenshots). Pemeriksaan tambahan pada riwayat terisi di lebar 390/768/1024/1440 px tidak menemukan overflow halaman; tabel tetap dapat digulir pada region-nya sendiri.

Pengujian dilakukan terhadap build produksi menggunakan Microsoft Edge/Chromium pada viewport 1440×1000 dan 390×844. Test mencakup isolasi demo, filter/CSV, file dan parameter request, penyimpanan/reload, detail/fokus, validasi upload, error server, hasil nol objek, respons tidak valid, pembatalan, kegagalan localStorage, bahasa/navigasi, hasil video, CSP, overflow, dan pemeriksaan axe pada tiga rute.

Dua inferensi gambar diuji langsung pada backend Hugging Face yang dikonfigurasi: contoh pertama mengembalikan 8 Helmet dan 8 Person pada kedua permintaan, dengan waktu model 1.501 ms dan 388 ms. Ini contoh hasil observasi, bukan benchmark atau janji performa. Test berulang menggunakan respons API terkontrol untuk menguji UI secara deterministik; fixture video memverifikasi cabang UI dan unduhan, bukan kualitas model maupun codec video nyata.

Pemeriksaan otomatis tidak membuktikan kepatuhan WCAG menyeluruh. Belum dilakukan wawancara petugas K3, uji screen reader lengkap, Safari/Firefox/perangkat fisik, pengujian GPU/training, dan benchmark jaringan. Model dapat melewatkan objek; keputusan keselamatan tetap membutuhkan pemeriksaan manusia. Riwayat belum menggunakan akun atau database bersama.

## Prioritas lanjutan

- Uji tugas dengan petugas K3: keberhasilan memilih sumber, memahami “Tanpa temuan”, dan menemukan laporan.
- Jika dibutuhkan bersama tim: autentikasi, database riwayat, kebijakan retensi, dan izin akses yang jelas.
- Uji video nyata dengan ffmpeg/backend serta perangkat/browser target sebelum peluncuran operasional.
- Tambahkan visual regression/CI jika rilis UI mulai rutin; perluas baseline setelah desain diterima.

Lihat juga [tooling global dan rekomendasi](GLOBAL-TOOLING.md).
