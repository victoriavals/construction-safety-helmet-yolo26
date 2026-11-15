# Logo SafetyAI

Konsep rekomendasi: helm konstruksi di dalam perisai, dengan ruang geometris di bagian bawah untuk memberi karakter khas. Helm menjelaskan konteks K3; perisai menyampaikan perlindungan. Bentuk besar dan sederhana dipilih agar dapat dibaca saat diperkecil.

Warna acuan mengikuti website: navy `#13253B` dan amber `#EFBB66`. Tulisan **SafetyAI** menggunakan font aplikasi, dengan penekanan pada **AI**, agar tetap tajam dan responsif.

## Aset dan penerapan

- Master PNG transparan: `safetyai/public/brand/safetyai-mark-v1.png` (1254 × 1254 px).
- Komponen: `safetyai/src/components/brand-logo.tsx`.
- Tiga susunan: sidebar berlatar gelap, header mobile, dan footer berlatar terang.
- Favicon: `safetyai/src/app/icon.tsx`, dirender dari master yang sama pada ukuran 64 × 64 px.
- Fallback browser: `safetyai/src/app/favicon.ico`, berisi bitmap logo 64 × 64 yang sama.
- Ikon layar utama iPhone/iPad: `safetyai/src/app/apple-icon.tsx`, ukuran 180 × 180 px dengan latar navy penuh.
- PNG master tetap utuh; Next Image mengoptimalkan ukuran yang dikirim ke browser.

Gunakan bentuk asli dengan rasio 1:1. Pertahankan ruang kosong bawaan aset. Hindari meregangkan, memotong, memutar, atau menambahkan efek pada gambar. Wordmark cukup ditampilkan pada ukuran yang terbaca; favicon menggunakan simbol saja.

## Pratinjau dan verifikasi

- [Logo di sidebar](logo-sidebar.png), [header mobile](logo-mobile-header.png), dan [footer](logo-footer.png).
- [Website desktop](logo-website-desktop.png) dan [mobile](logo-website-mobile.png).
- Build Next.js dan pemeriksaan TypeScript berhasil.
- Empat pengujian navigasi/bahasa dan aksesibilitas desktop/mobile lulus.
- Tidak ada overflow halaman pada lebar 320/390/768/1024/1440 px ketika diperiksa.
- Logo tampil melalui optimasi Next Image; favicon mengembalikan PNG 64 × 64, HTTP 200, sekitar 3 KB. Tidak ada error console pada pemeriksaan browser.

## Proses

Dibuat memakai built-in **imagegen**; satu generasi awal dan satu penyempurnaan. Tidak memakai fallback CLI atau API key. Aset asli hasil generasi tetap berada pada direktori generated_images Codex, dan salinan final disimpan dalam repository.

### Prompt awal

```text
Use case: logo-brand.
Asset type: final icon-only brand mark for SafetyAI, a construction safety helmet inspection web application.
Create ONE original, polished, professional flat geometric logo, not a presentation or a sheet of options. The mark must feel like a custom identity rather than a stock icon.
Concept: fuse a construction hard hat and a protective shield into one coherent, bold silhouette. Use a substantial amber shield with a simple navy hard-hat dome and brim integrated into the upper center through crisp negative-space geometry; a restrained angular opening toward the lower right may suggest a check or the letter S without becoming a separate symbol. The helmet must read immediately, and the shield must have a distinctive softly chamfered outline. Keep the silhouette balanced and the interior geometry very simple. This is an industrial computer-vision product for safety supervisors, so the feeling is dependable, precise, contemporary, and calm.
Color palette: only solid construction amber #EFBB66 and deep navy #13253B. The exterior mark is predominantly amber so it reads on a navy sidebar; navy interior geometry supplies definition on white backgrounds. No white fills; use true transparent negative space where appropriate.
Composition: square 1:1 canvas, single centered mark occupying about 88 percent of the canvas with consistent transparent padding and no clipping. Design for legibility at 32–48 pixels, with broad solid shapes and generous gaps. Clean hard edges, flat vector-like graphic appearance.
Background: genuinely transparent alpha, with no simulated checkerboard.
Text: NONE. Do not include SafetyAI or any letters, slogan, labels, watermark, registration symbol, or decorative text. The wordmark will be typeset separately in the application.
Avoid: gradients, 3D, mockups, shadows, metallic effects, textures, photorealism, thin hairlines, tiny circuit patterns, crowded details, enclosing square tiles, multiple separate badges, existing company logos.
```

### Prompt penyempurnaan

```text
Use case: precise-object-edit / logo-brand.
Edit this SafetyAI logo into its final flat-color web-production version.
Preserve the recognizable concept and all main proportions: one shield silhouette, the helmet inside it, and the lower angular navy opening. Do not add text or any new motif.
CHANGE ONLY surface treatment and edge cleanup. Replace ALL shading, gradients, texture, and uneven coloring with exactly two perfectly uniform solid fills: amber #EFBB66 and navy #13253B. The shield should look like clean flat vector artwork with no lighting at all.
CRITICAL edge cleanup: remove every stray red/yellow speckle, halo, fringe, isolated pixel, ghost mark, and residue OUTSIDE the shield. Everything outside the main shield shape must have alpha zero. The contour must be smooth with normal clean antialiasing only immediately along the contour. Use true transparent background. Do not simulate transparency with black, white, or a checkerboard.
Composition: keep one centered complete icon in a square canvas, with at least 8 percent entirely empty transparent margin on EACH side. No cropping. Broad simple helmet geometry readable at small sizes.
No shadows, no glow, no photorealism, no mockup, no 3D, no typography, no watermark, no extra logos.
```
