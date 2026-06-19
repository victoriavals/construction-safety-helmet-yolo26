// ============================================================================
// Konfigurasi RUNTIME URL backend (dapat diubah TANPA build ulang).
// File ini disalin apa adanya ke hasil build (folder public/).
//
// PRODUKSI: ganti baris di bawah dengan URL tetap Hugging Face Space Anda
//   (tanpa garis miring di akhir), contoh:
//     window.API_BASE = "https://namauser-deteksi-helm-api.hf.space";
//
// PENGEMBANGAN LOKAL/LAN: secara otomatis mengikuti host halaman saat ini
//   pada port 7860 — sehingga berfungsi baik dibuka via localhost maupun
//   alamat IP jaringan (mis. http://100.70.248.50:3000 -> backend di
//   http://100.70.248.50:7860). Pastikan backend dijalankan dengan
//   `--host 0.0.0.0` agar dapat diakses dari perangkat lain.
//
// Alternatif build-time: set variabel VITE_API_BASE (akan dipakai bila
// window.API_BASE dibiarkan kosong).
// ============================================================================
window.API_BASE = location.protocol + "//" + location.hostname + ":7860";
