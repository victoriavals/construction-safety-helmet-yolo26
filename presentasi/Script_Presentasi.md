# Script Presentasi — Deteksi Helm Konstruksi (YOLO26s)

Narasi per slide untuk sidang/akademik (data nyata terkini).


## Slide 1: Deteksi Keselamatan Helm Konstruksi

**Poin di layar:**

- [Nama Anda]  •  [NIM]
- [Program Studi / Instansi]
- [Tanggal Sidang]

**Narasi:**

Pembuka: perkenalkan diri & judul. Proyek: pipeline lengkap deteksi helm K3 (Helmet/No-Helmet/Person) dengan YOLO26s, dari analisis data hingga model siap deploy + demo web.


## Slide 2: Latar Belakang & Masalah

**Poin di layar:**

- K3 konstruksi: helm wajib, tapi kepatuhan sulit dipantau manual.
- Pelanggaran 'tidak memakai helm' berisiko cedera kepala fatal.
- Pengawasan CCTV manual: lelah, lambat, tidak konsisten.
- Solusi: deteksi otomatis berbasis computer vision (object detection).
  - 3 kelas: Helmet (pakai) · No-Helmet (tidak pakai) · Person.

**Narasi:**

Konteks K3: helm krusial tapi pengawasan manual tak efektif. Computer vision memantau otomatis & real-time. Kelas No-Helmet paling penting (menandai pelanggaran).


## Slide 3: Tujuan & Kontribusi

**Poin di layar:**

- Membangun pipeline deteksi helm 3 kelas yang lengkap & reproducible.
- Tahap: EDA → pre-processing → training → tuning → evaluasi → inference → export.
- Efisien di GPU terbatas (RTX 4060 Ti, 8 GB VRAM).
- Model siap-deploy (ONNX) + demo web + tiap keputusan dijustifikasi data.

**Narasi:**

Tujuan: pipeline utuh & terdokumentasi, bukan sekadar melatih model. Tantangan: GPU 8 GB. Setiap keputusan teknis berbasis data.


## Slide 4: Dataset

**Poin di layar:**

- Sumber: Roboflow 'construction-safety-helmet' (CC BY 4.0).
- Total 19.456 gambar — train 15.555 / valid 1.945 / test 1.945.
- Format YOLO: satu .txt per gambar (class cx cy w h ternormalisasi).
- 3 kelas: 0=Helmet, 1=No-Helmet, 2=Person.
  - Roboflow: 'No pre-processing or augmentation applied' → data MENTAH.

**Narasi:**

Sumber, ukuran, format YOLO, 3 kelas. Penting: data mentah (ukuran beragam, tanpa augmentasi Roboflow) — relevan untuk slide pre-processing.


## Slide 5: Metodologi — Pipeline

**Poin di layar:**

- 8 tahap modular (script src/ + notebook visual):
  - Cek GPU → EDA → Pre-processing (runtime) → Training
  - → Tuning → Evaluasi → Inference → Export (ONNX)
- Konfigurasi terpusat (config.yaml); output ke runs/.
- Ketahanan: fallback OOM otomatis batch 8→4→2, logging, exit-code.

**Narasi:**

Pipeline sebagai metodologi: tiap tahap = script + notebook. Fitur rekayasa: konfigurasi terpusat & fallback OOM agar tetap jalan di 8 GB.


## Slide 6: Mengapa YOLO26s?

**Poin di layar:**

- YOLO = detektor satu-tahap: cepat, cocok real-time/CCTV.
- Varian 'small' (yolo26s): ~9,4 juta parameter, ~20,5 GFLOPs.
- Seimbang akurasi vs beban komputasi; muat di VRAM 8 GB.
- Kecepatan inferensi ~2,8 ms/gambar di GPU (~350+ FPS).

**Narasi:**

Justifikasi model: one-stage cepat (real-time), varian small agar muat 8 GB & tetap cepat. Sebutkan jumlah parameter & kecepatan.


## Slide 7: EDA — Distribusi Kelas

**Poin di layar:**

- No-Helmet adalah kelas MINORITAS.
- Imbalance → recall kelas minoritas berisiko rendah.
- Padahal No-Helmet paling penting (pelanggaran K3).
- [GAMBAR: Distribusi bounding box per kelas]

**Narasi:**

Ketimpangan kelas: No-Helmet paling sedikit, padahal terpenting untuk K3 → benang merah ke recall rendah di evaluasi.


## Slide 8: EDA — Ukuran Objek (kenapa imgsz=640)

**Poin di layar:**

- Porsi objek KECIL signifikan (small < 32²px @640).
- Objek kecil → resolusi rendah menghapus detail.
- Justifikasi: pertahankan imgsz=640.
- [GAMBAR: Distribusi area bbox & komposisi small/medium/large]

**Narasi:**

Justifikasi data untuk imgsz=640: banyak objek kecil; menurunkan resolusi menghilangkan mereka.


## Slide 9: EDA — Posisi Objek (Heatmap)

**Poin di layar:**

- Objek terkonsentrasi di area tertentu (helm di atas).
- Model mempelajari bias posisi ini.
- Memandu augmentasi yang aman (crop/flip).
- [GAMBAR: Peta panas posisi objek (overall & per kelas)]

**Narasi:**

Bias spasial: helm di atas, orang di tengah. Memandu pilihan augmentasi (mis. tak flip vertikal).


## Slide 10: EDA — Kepadatan Objek

**Poin di layar:**

- Sebagian gambar padat → kotak bertumpuk.
- → ambang NMS (iou) berpengaruh.
- Gambar tanpa anotasi = contoh background.
- [GAMBAR: Distribusi jumlah objek per gambar]

**Narasi:**

Gambar padat → ambang NMS penting. Gambar background menekan false positive.


## Slide 11: EDA — Kualitas Anotasi

**Poin di layar:**

- Label nyasar, objek sangat kecil, objek terpotong, dugaan duplikat.
- Noise anotasi menambah kesulitan; sebagian dibuang pipeline.
- [GAMBAR: Diagnostik kualitas anotasi]

**Narasi:**

Kejujuran data: ada label nyasar/terpotong/duplikat. Pipeline membuang yang invalid. Menjelaskan sebagian error.


## Slide 12: EDA — Kebocoran Data antar-Split

**Poin di layar:**

- Uji near-duplicate (perceptual hash + Hamming).
- Kebocoran → metrik val/test terlalu optimis.
- Diagnostik penting untuk validitas evaluasi.
- [GAMBAR: Jarak Hamming minimum val/test ke train]

**Narasi:**

Cek kebocoran data antar-split untuk validitas evaluasi — menunjukkan kesadaran metodologis.


## Slide 13: Pre-processing (Otomatis, Runtime)

**Poin di layar:**

- Dataset mentah → TIDAK ada script pre-processing terpisah (sengaja).
- Ditangani OTOMATIS oleh Ultralytics saat training/inferensi:
  - 1. Letterbox: resize jaga rasio + padding ke 640×640.
  - 2. Normalisasi piksel 0–255 → 0–1.
  - 3. Augmentasi (saat training) — lihat slide berikut.
- Alasan: dataset read-only & Ultralytics menangani sendiri (manual = redundan/berisiko).

**Narasi:**

Pre-processing ada tapi otomatis di runtime (letterbox+normalisasi+augmentasi). Manual = redundan & berisiko merusak objek kecil.


## Slide 14: Training — Parameter & Alasan

**Poin di layar:**

- model: yolo26s.pt
- imgsz: 640
- epochs: 50
- patience: 15
- batch: 8
- amp: True
- optimizer: auto
- lr0 / lrf: 0.01 / 0.01
- momentum / weight_decay: 0.937 / 0.0005
- warmup_epochs: 3
- seed: 42

**Narasi:**

Jelaskan tiap parameter & alasannya. Tekankan: imgsz 640 (objek kecil), batch 8 + fallback OOM (VRAM 8 GB), patience 15 (anti-overfit), AMP (efisiensi). optimizer='auto' penting — akan dibahas di tuning.


## Slide 15: Training — Augmentasi & Alasan

**Poin di layar:**

- mosaic: 1.0
- close_mosaic: 10
- hsv_h/s/v: 0.015/0.7/0.4
- fliplr: 0.5
- flipud / degrees: 0 / 0
- scale / translate: 0.5 / 0.1
- erasing: 0.4
- mixup: 0.0

**Narasi:**

Augmentasi dijustifikasi konteks: mosaic & scale untuk objek kecil/variasi; HSV untuk low-light; flip horizontal aman tapi vertikal/rotasi dimatikan (tak realistis); erasing untuk oklusi.


## Slide 16: Training — Preview Augmentasi

**Poin di layar:**

- Batch nyata yang 'dilihat' model setelah letterbox + mosaic.
- Gabungan 4 gambar, jitter warna, flip — bukan gambar asli.
- Memperkaya variasi data tanpa menambah anotasi.
- [GAMBAR: train_batch0.jpg — batch training ter-augmentasi]

**Narasi:**

Tunjukkan wujud nyata data setelah augmentasi (mosaic). Inilah yang masuk ke model, menjelaskan slide augmentasi sebelumnya.


## Slide 17: Training — Kurva Proses (per Epoch)

**Poin di layar:**

- Loss (box/cls/dfl) train & val turun → model belajar.
- Metrik (P/R/mAP) naik & stabil menjelang akhir.
- Best model di epoch 40 (early-stopping patience=15).
- [GAMBAR: results.png — kurva loss & metrik per epoch]

**Narasi:**

Dashboard Ultralytics: loss menurun, metrik meningkat. Best di epoch 40 → early stopping bekerja. Tunjukkan tidak ada divergensi (training sehat).


## Slide 18: Training — Hasil & Confusion Matrix

**Poin di layar:**

- Precision 0.848 · Recall 0.708
- mAP50 0.786 · mAP50-95 0.508
- Pola: Precision ≫ Recall → model KONSERVATIF.
  - Deteksi akurat, sebagian objek terlewat (recall).
- Confusion: kelas mana paling tertukar/terlewat.
- [GAMBAR: Confusion matrix (ternormalisasi) — validasi training]

**Narasi:**

Metrik final (best@40). Precision tinggi, recall moderat = konservatif. Confusion matrix menunjukkan kelas mana tertukar (mis. No-Helmet ↔ Helmet/Person). Kaitkan ke imbalance EDA.


## Slide 19: Training — Prediksi pada Batch Validasi

**Poin di layar:**

- Kiri-kanan: ground-truth vs prediksi model.
- Kualitatif: model mengenali helm & orang dengan baik.
- Objek kecil/oklusi: kadang terlewat (recall).
- [GAMBAR: val_batch0_pred.jpg — prediksi model pada validasi]

**Narasi:**

Bukti kualitatif model belajar: prediksi pada batch validasi. Bandingkan dengan val_batch0_labels.jpg (GT). Soroti objek yang terlewat = kasus sulit.


## Slide 20: Tuning — Rancangan & Alasan

**Poin di layar:**

- Jumlah eksperimen: maks 4 (terkurasi)
- Variasi lr0: 0.01 / 0.005 / 0.003
- Variasi epochs: 50 / 40 / 30
- Variasi weight_decay: 0.0005 / 0.0001
- Model: hanya small
- Fallback OOM: batch 8→4→2
- Kriteria pemenang: mAP50-95 → recall → stabilitas

**Narasi:**

Tuning sengaja ringan & terkurasi (4 eksperimen) demi VRAM 8 GB. Variasi pada lr0, epochs, weight_decay. Pemenang dipilih berlapis: mAP50-95 dulu, lalu recall, lalu stabilitas.


## Slide 21: Tuning — Hasil 4 Eksperimen

**Poin di layar:**

- exp_01 (lr0.01, 50ep): mAP50-95 0,508 ← PEMENANG
- exp_02 (lr0.005, 50ep): 0,508
- exp_03 (lr0.003, 40ep): 0,473
- exp_04 (lr0.005, 30ep): 0,469
- Pemenang = konfigurasi baseline → tuning MENGONFIRMASI baseline optimal.
- [GAMBAR: Perbandingan mAP50-95 antar eksperimen (pemenang disorot)]

**Narasi:**

Pemenang = baseline. Poin akademik: tuning tak selalu menaikkan skor — di sini mengonfirmasi konfigurasi awal sudah optimal. Hasil yang valid & jujur.


## Slide 22: Tuning — Temuan: lr0 Diabaikan

**Poin di layar:**

- exp_01 (lr0.01) & exp_02 (lr0.005) IDENTIK sampai 5 desimal.
- Sebab: optimizer='auto' menentukan lr sendiri → MENGABAIKAN lr0.
- Jadi variasi lr0 tak berefek; faktor nyata = jumlah epoch.
- Pelajaran: pahami perilaku framework (bukan asumsi).
- [GAMBAR: Heatmap perbandingan metrik antar eksperimen]

**Narasi:**

Temuan analitis terkuat: dua lr berbeda hasil identik → lr0 diabaikan optimizer='auto'. Tunjukkan pemahaman mendalam framework — nilai plus untuk sidang.


## Slide 23: Tuning — Pengaruh Jumlah Epoch

**Poin di layar:**

- 50 epoch > 40 > 30 (mAP50-95 0,508 > 0,473 > 0,469).
- Menambah epoch membantu konvergensi (sampai titik tertentu).
- lr0 tidak berefek (optimizer='auto') → epoch yang menentukan.
- [GAMBAR: Metrik vs jumlah epoch]

**Narasi:**

Konfirmasi: yang berpengaruh adalah jumlah epoch, bukan lr0. Dasar saran: epoch lebih banyak / early-stopping.


## Slide 24: Evaluasi — Parameter & Alasan

**Poin di layar:**

- conf (threshold): 0.25
- iou (NMS): 0.5
- imgsz: 640
- split: val + test
- sample prediksi: 12 gambar

**Narasi:**

Evaluasi pada conf=0.25 (titik operasi) — ini sebabnya mAP eval lebih rendah dari mAP training (benchmark conf~0.001). iou=0.5 untuk NMS. Dievaluasi di val DAN test untuk cek generalisasi.


## Slide 25: Evaluasi — Val vs Test (Generalisasi)

**Poin di layar:**

- Precision: 0.845
- Recall: 0.711
- mAP50: 0.687
- mAP50-95: 0.453

**Narasi:**

Selisih mAP50-95 val vs test hanya ~0,047 (< 0,10) → generalisasi BAIK, tak ada overfitting parah (selaras EDA: split representatif). Catatan: test recall malah lebih tinggi, precision lebih rendah — model di test lebih 'berani'. mAP eval < mAP training karena conf=0.25 (titik operasi) vs benchmark.


## Slide 26: Evaluasi — Confusion Matrix

**Poin di layar:**

- Pola kesalahan antar kelas pada validation.
- Diagonal = benar; off-diagonal = tertukar.
- No-Helmet paling menantang (minoritas + objek kecil).
- [GAMBAR: Confusion matrix — evaluasi validation]

**Narasi:**

Per-kelas: kelas mana tertukar/terlewat. No-Helmet biasanya paling lemah (imbalance + objek kecil). Hubungkan ke EDA.


## Slide 27: Evaluasi — Kurva Precision-Recall

**Poin di layar:**

- Kurva PR per kelas: area di bawah = AP.
- Kelas dengan kurva lebih rendah = lebih sulit.
- Dasar memilih titik operasi (conf).
- [GAMBAR: Kurva Precision-Recall per kelas (validation)]

**Narasi:**

Kurva PR menunjukkan trade-off & AP per kelas. Kelas yang kurvanya 'jatuh' lebih cepat = lebih sulit (objek kecil/minoritas).


## Slide 28: Evaluasi — Contoh Prediksi

**Poin di layar:**

- Sample prediksi pada gambar validasi nyata.
- Kotak + label + confidence per objek.
- Verifikasi kualitatif kualitas deteksi.
- [GAMBAR: Contoh hasil prediksi (validation)]

**Narasi:**

Tunjukkan hasil deteksi nyata pada gambar. Diskusikan kasus benar & yang terlewat.


## Slide 29: Inference & Peringatan K3

**Poin di layar:**

- Deteksi pada gambar uji: Helmet 8 · Person 7 · No-Helmet 1.
- Sistem memunculkan PERINGATAN K3 otomatis saat ada No-Helmet.
- Mendukung gambar / folder / video.
- [GAMBAR: Contoh inference + peringatan K3 (terdeteksi 1 No-Helmet)]

**Narasi:**

Sisi aplikatif: model mendeteksi & memberi peringatan K3 saat ada pelanggaran. Angka nyata dari ringkasan inference. Tekankan nilai praktis untuk keselamatan.


## Slide 30: Export & Deployment

**Poin di layar:**

- Model diekspor ke ONNX (runs/export/best.onnx) — siap deploy.
- Paritas PyTorch vs ONNX terjaga → akurasi sama.
- Demo web: frontend (Vercel) + backend FastAPI (Hugging Face).
- Alternatif in-browser ONNX (tanpa server).
- [GAMBAR: Ukuran model antar-format]

**Narasi:**

Export ke ONNX untuk deployment (lepas dari PyTorch), akurasi terjaga. Sebutkan demo web yang dibangun (Vercel + HF FastAPI).


## Slide 31: Diskusi & Keterbatasan

**Poin di layar:**

- Recall moderat (~0,71): objek kecil & No-Helmet paling terdampak.
- Kualitas data: blur/low-light, label nyasar, potensi kebocoran antar-split.
- Tuning lr0 tak efektif (optimizer='auto') → faktor nyata = epoch.
- Metrik eval (conf 0.25) lebih rendah dari benchmark training — wajar (titik operasi).

**Narasi:**

Jujur soal keterbatasan: recall belum tinggi, data menantang, tuning lr tak efektif karena framework. Penguji menghargai kesadaran kritis & pemahaman batas.


## Slide 32: Kesimpulan

**Poin di layar:**

- Pipeline deteksi helm 3 kelas yang LENGKAP & reproducible berhasil dibangun (8 tahap).
- Model baseline yolo26s — training mAP50-95 0.508 (best epoch 40);
  - evaluasi (conf 0.25): val 0.453 · test 0.405 → generalisasi baik (selisih ~0,047).
- Karakter: precision tinggi (~0,85), recall moderat (~0,71) → konservatif.
- Tantangan utama (objek kecil & No-Helmet) konsisten dari EDA hingga evaluasi.
- Tuning mengonfirmasi konfigurasi baseline optimal; temuan lr0 diabaikan optimizer='auto'.
- Setiap keputusan parameter dijustifikasi data; model diekspor (ONNX) + demo web siap pakai.

**Narasi:**

Kesimpulan menyeluruh: pipeline lengkap berhasil, model bekerja & menggeneralisasi, tiap keputusan berbasis data. Tekankan benang merah masalah (objek kecil/No-Helmet) dari EDA→evaluasi, dan kontribusi reproducibility + deployment.


## Slide 33: Saran & Pekerjaan Mendatang

**Poin di layar:**

- Naikkan recall: imgsz lebih tinggi (768) untuk objek kecil; tambah data No-Helmet.
- Augmentasi terarah untuk kelas minoritas / objek kecil.
- Set optimizer eksplisit (SGD/AdamW) agar tuning learning rate efektif.
- Bersihkan/periksa kebocoran data antar-split untuk evaluasi lebih jujur.
- Deploy nyata (HF Space + Vercel) & uji pada rekaman CCTV lapangan.

**Narasi:**

Arah perbaikan konkret berbasis temuan: resolusi lebih tinggi, lebih banyak data No-Helmet, optimizer eksplisit, atasi kebocoran data, lalu deployment & uji lapangan.


## Slide 34: Terima Kasih

**Poin di layar:**

- Siap menjawab: recall rendah · imbalance · optimizer='auto' · rencana deployment

**Narasi:**

Penutup & Q&A. Siapkan jawaban untuk pertanyaan umum: kenapa recall rendah, cara atasi imbalance, kenapa optimizer='auto' penting, rencana deployment.
