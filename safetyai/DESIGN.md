# SafetyAI — UI system

Tujuan: membantu petugas meninjau prediksi penggunaan helm secara cepat dan jujur. Tampilan tidak boleh menyatakan lokasi aman hanya dari ketiadaan prediksi.

## Fondasi

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| Sidebar | `#13253b` | Navigasi dan identitas workspace |
| Primary | `#172d46` | Tindakan utama |
| Brand amber | `#efbb66` | Logo, aksen pada latar gelap |
| Background | `#f7f8fa` | Latar halaman |
| Card | `#ffffff` | Permukaan konten |
| Foreground | `#1a2c42` | Teks utama |
| Secondary text | `#586b82` | Label/penjelasan, diperiksa kontrasnya |
| Helmet | `#5074c8` | Label kelas Helm |
| No-Helmet | `#d18a30` | Label kelas Tanpa Helm |
| Person | `#61a99c` | Label kelas Orang |
| Destructive | `#ad3946` | Error yang membutuhkan pemulihan |

Font lokal: Plus Jakarta Sans Variable, IBM Plex Mono untuk ID/parameter. Ukuran heading responsif 25–36 px. Teks penjelasan utama 12–13 px dengan line height 1,8–2. Label ringkas dapat lebih kecil; hindari teks panjang dalam ukuran mikro. Kontrol utama minimal 44 px. Radius komponen 6/9/12/14 px. Jarak utama 8/16/22/26/32 px.

## Tata letak dan interaksi

- Desktop: sidebar tetap 236 px, toolbar 74 px, konten lebar maksimum 1550 px.
- Di bawah 800 px: navigasi Sheet; konten tanpa margin sidebar.
- Di bawah 600 px: kartu statistik dua kolom, analitik satu kolom; tabel mempunyai scroll region sendiri.
- Sumber nyata dan demo harus terlihat berbeda. Jangan gabungkan fixture ke riwayat pengguna.
- Upload tidak langsung menjalankan inference. Parameter baru diterapkan hanya ketika tombol analisis ditekan.
- Bedakan belum dianalisis, menganalisis, gagal, tanpa objek, perlu ditinjau, dan tanpa temuan.
- Gunakan komponen shadcn/Radix yang sudah ada sebelum menambah komponen interaktif.
- Animasi singkat (sekitar 200 ms), dominan opacity/transform; dukung reduced motion.
- Jangan menambahkan GSAP, Lottie, Rive, atau efek WebGL ke bundle tanpa fungsi yang jelas untuk pengguna.
- Label kelas selalu memakai teks; hitungan kelas bukan estimasi pekerja unik.

## Logo

Gunakan simbol PNG transparan `public/brand/safetyai-mark-v1.png` melalui komponen `BrandLogo`. Simbol menggabungkan helm konstruksi dan perisai. Wordmark tetap berupa teks Plus Jakarta Sans; tersedia susunan sidebar, header mobile, dan footer. Favicon memakai simbol yang sama. Panduan dan prompt sumber ada di [logo SafetyAI](../docs/brand/safetyai-logo.md).

## Aksesibilitas dan privasi

Skip link, label input, fokus terlihat, tombol berikon bernama, judul dialog, Escape/focus restore, `aria-current`, status live, `aria-busy`, dan tabel grafik menjadi bagian sistem. Lakukan axe serta pengecekan keyboard setelah perubahan kontrol.

Riwayat menyimpan hanya ringkasan maksimal 100 entri pada browser. Jangan menaruh gambar/video dalam localStorage. Beri tahu bahwa file dikirim ke server yang dikonfigurasi. Jangan menyebut penyimpanan lokal sebagai enkripsi atau jaminan privasi backend.
