# Perbaikan preview dan foto contoh

Tanggal: 16 November 2026 (WIB). Halaman: `/detect` pada frontend aktif `safetyai/`.

## Masalah dan perubahan

Thumbnail lama hanya setinggi 60–66 px, memakai empat kolom dan `object-fit: cover`, sehingga foto terpotong. Contoh 2–4 juga berupa foto produk helm tanpa pekerja.

- Galeri menjadi dua kolom, dengan kotak gambar berasio 4:3 dan `object-fit: contain`. Seluruh isi foto tetap terlihat. Judul, deskripsi, dan tindakan pemilihan diperjelas.
- Tombol perbesar pada setiap contoh membuka foto di dialog besar tanpa memilih sumber atau mengirim permintaan inferensi. Escape menutup dialog dan mengembalikan fokus ke tombol pembukanya.
- Setelah file atau contoh dipilih, halaman mengarahkan fokus dan posisi gulir ke pratinjau sumber. Preferensi reduced motion dihormati.
- Area hasil/sumber diperbesar hingga 720 px pada desktop dan 620 px pada ponsel, dengan tombol perbesar untuk gambar asli maupun hasil anotasi yang sedang ditampilkan.
- Contoh 1 dipertahankan. Contoh 2–4 diganti dengan foto pekerja dan helm dari dataset repository. Berkas sumber tidak diubah. Sumber, lisensi CC BY 4.0, serta pemetaan berkas dicatat di [README aset](../../safetyai/public/examples/README.md). URL baru memakai versi `v2` agar tidak mengambil foto produk lama dari cache.

## Bukti visual

- [Galeri desktop](screenshots/examples-desktop-v2.png) dan [ponsel 390 px](screenshots/examples-mobile-v2.png).
- [Preview besar desktop](screenshots/preview-enlarged-desktop-v2.png) dan [ponsel](screenshots/preview-enlarged-mobile-v2.png).

## Verifikasi

`npm run lint` dan `npm run build` berhasil. `npm run test:e2e -- --workers=1` meluluskan **26/26 test**, tanpa retry, skip, atau kegagalan assertion. Run awal dengan dua worker mengalami dua kegagalan saat browser Edge mulai berjalan; seluruh suite kemudian dijalankan kembali dengan satu worker. Pengujian mencakup pemilihan keempat aset nyata, ukuran thumbnail, fokus pratinjau, dialog dan Escape, tidak adanya inferensi otomatis, regresi alur deteksi, CSP, overflow, dan pemeriksaan axe pada tiga rute. Pengujian UI menggunakan respons inferensi terkontrol.

Pemeriksaan inferensi terpisah pada backend Hugging Face yang dikonfigurasi memberikan HTTP 200 dan gambar beranotasi untuk keempat contoh, dengan confidence 0,25 dan IoU 0,45:

| Contoh | Helmet | No-Helmet | Person |
| --- | ---: | ---: | ---: |
| 1: Area konstruksi | 8 | 0 | 8 |
| 2: Tim dengan helm | 4 | 0 | 4 |
| 3: Variasi penggunaan helm | 1 | 4 | 5 |
| 4: Inspeksi pekerjaan | 2 | 0 | 3 |

Angka tersebut adalah observasi model, bukan label kebenaran. Kelas Person dapat tumpang tindih dengan kelas helm; pada contoh 4 model mengembalikan tiga Person meskipun foto memperlihatkan dua pekerja. Perubahan ini tidak mengubah model atau memperbaiki akurasi prediksinya.

Perubahan tersedia secara lokal dan belum di-push atau di-deploy ke Vercel.
