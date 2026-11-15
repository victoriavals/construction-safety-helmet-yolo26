// ============================================================================
// Konfigurasi RUNTIME URL backend (dapat diubah TANPA build ulang).
// File ini disalin apa adanya ke hasil build (folder public/).
//
// PRODUKSI: ganti baris di bawah dengan URL tetap Hugging Face Space Anda
//   (tanpa garis miring di akhir), contoh:
//     window.API_BASE = "https://namauser-deteksi-helm-api.hf.space";
//
// LOKAL: isi "http://localhost:7860" untuk memakai backend lokal.
// Untuk akses LAN, gunakan alamat backend yang dapat dijangkau perangkat Anda.
//
// Alternatif build-time: set variabel NEXT_PUBLIC_API_BASE (akan dipakai bila
// window.API_BASE dibiarkan kosong).
// CSP di src/proxy.ts juga harus mengizinkan host backend tersebut.
// ============================================================================
window.API_BASE = "https://naufalfirdaus-deteksi-helm-api.hf.space";
