"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Cpu,
  Database,
  LockKeyhole,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useWorkspace } from "./workspace-provider";

export default function ModelGuide() {
  const { text } = useWorkspace();
  return (
    <div className="page-stack guide-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">BEHIND THE INTELLIGENCE</span>
          <h1>
            {text("Kenali alat Anda", "Know your tools")}
            <span className="heading-period">.</span>
          </h1>
          <p>
            {text(
              "Cara kerja, kemampuan, dan batasan yang perlu Anda ketahui.",
              "How it works, what it can do, and the limits you should know.",
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/detect">
            {text("Mulai deteksi", "Start detection")}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
      <section className="guide-intro panel">
        <div>
          <Badge variant="secondary">YOLO26s</Badge>
          <h2>
            {text(
              "Asisten untuk pemeriksaan helm di lapangan.",
              "An assistant for on-site helmet inspections.",
            )}
          </h2>
          <p>
            {text(
              "SafetyAI mengirim gambar atau video ke model deteksi objek. Model memprediksi kelas Helm, Tanpa Helm, dan Orang, lalu menggambar kotak deteksi untuk ditinjau manusia.",
              "SafetyAI sends images or video to an object detection model. The model predicts Helmet, No-Helmet, and Person classes, then draws detection boxes for human review.",
            )}
          </p>
        </div>
        <div className="model-illustration">
          <ScanLine />
          <span>
            YOLO26<span>s</span>
          </span>
          <small>640 × 640 px · 3 {text("kelas", "classes")}</small>
        </div>
      </section>
      <section>
        <div className="section-heading">
          <h2>
            {text(
              "Tiga langkah, satu alur yang jelas",
              "Three steps. One clear workflow.",
            )}
          </h2>
        </div>
        <div className="guide-steps">
          {[
            {
              icon: UploadCloud,
              title: text("Pilih sumber", "Choose a source"),
              description: text(
                "Unggah gambar hingga 10 MB atau video hingga 40 MB. Contoh gambar tersedia untuk mencoba alurnya.",
                "Upload an image up to 10 MB or a video up to 40 MB. Sample images are available to try the workflow.",
              ),
            },
            {
              icon: Cpu,
              title: text("Jalankan analisis", "Run analysis"),
              description: text(
                "Atur ambang keyakinan, lalu mulai analisis. Gambar dan video diproses pada server FastAPI.",
                "Set the confidence threshold, then start analysis. Images and videos are processed on the FastAPI server.",
              ),
            },
            {
              icon: ShieldCheck,
              title: text("Tinjau dan simpan", "Review and save"),
              description: text(
                "Periksa prediksi, unduh hasil visual, dan simpan ringkasan gambar ke riwayat browser.",
                "Review predictions, download visual results, and save image summaries to browser history.",
              ),
            },
          ].map((step, index) => (
            <article className="panel guide-step" key={step.title}>
              <div>
                <step.icon />
                <span>0{index + 1}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              {text(
                "Performa model yang terukur",
                "Measured model performance",
              )}
            </h2>
            <p>
              {text(
                "Set validasi · best.pt · ukuran inferensi 640 px",
                "Validation set · best.pt · inference size 640 px",
              )}
            </p>
          </div>
          <Badge variant="outline">
            {text("Hasil eksperimen", "Experiment results")}
          </Badge>
        </div>
        <div className="model-metrics">
          {[
            {
              name: "Precision",
              value: "84.7%",
              description: text(
                "Ketepatan prediksi positif",
                "Correctness of positive predictions",
              ),
            },
            {
              name: "Recall",
              value: "70.8%",
              description: text(
                "Kemampuan menemukan objek",
                "Ability to find objects",
              ),
            },
            {
              name: "mAP@50",
              value: "78.6%",
              description: text(
                "Rata-rata presisi pada IoU 0,50",
                "Mean average precision at IoU 0.50",
              ),
            },
            {
              name: "mAP@50–95",
              value: "50.8%",
              description: text(
                "Evaluasi lokalisasi lebih ketat",
                "Stricter localization evaluation",
              ),
            },
          ].map((metric) => (
            <div key={metric.name}>
              <span>{metric.name}</span>
              <strong>{metric.value}</strong>
              <p>{metric.description}</p>
            </div>
          ))}
        </div>
        <div className="panel-bottom-note">
          {text(
            "Set uji: mAP@50 64,8% · mAP@50–95 40,5%. Angka berasal dari catatan eksperimen di repository, bukan pengukuran langsung sesi ini.",
            "Test set: mAP@50 64.8% · mAP@50–95 40.5%. Values come from the repository's experiment records, not a live measurement in this session.",
          )}
        </div>
      </section>
      <Alert className="model-limitations">
        <ShieldAlert />
        <AlertTitle>
          {text(
            "Prediksi bukan keputusan keselamatan",
            "A prediction is not a safety decision",
          )}
        </AlertTitle>
        <AlertDescription>
          {text(
            "Recall 70,8% berarti model masih dapat melewatkan objek. Sudut kamera, pencahayaan, oklusi, dan ukuran objek dapat memengaruhi hasil. “Tanpa temuan” hanya berarti model tidak memprediksi kelas Tanpa Helm. Selalu verifikasi kondisi di lapangan.",
            "A recall of 70.8% means the model can miss objects. Camera angle, lighting, occlusion, and object size can affect results. “No flags” only means the model did not predict No-Helmet. Always verify conditions on site.",
          )}
        </AlertDescription>
      </Alert>
      <div className="guide-columns">
        <section className="panel" id="privacy">
          <div className="panel-header">
            <h2>
              <LockKeyhole />
              {text("Privasi & penyimpanan", "Privacy & storage")}
            </h2>
          </div>
          <div className="panel-body guide-prose">
            <p>
              {text(
                "File dikirim ke backend inferensi yang dikonfigurasi. Jangan mengunggah materi yang tidak Anda izinkan untuk diproses di server tersebut.",
                "Files are sent to the configured inference backend. Only upload material you are authorized to process on that server.",
              )}
            </p>
            <p>
              {text(
                "Browser menyimpan maksimal 100 ringkasan: nama file, waktu, hitungan kelas, pengaturan, dan waktu inferensi. Gambar dan video tidak disimpan permanen di localStorage. Riwayat tidak tersinkron ke akun atau perangkat lain.",
                "The browser stores up to 100 summaries: filename, timestamp, class counts, settings, and inference time. Images and videos are not persisted in localStorage. History does not sync across accounts or devices.",
              )}
            </p>
            <p>
              {text(
                "Hapus data situs pada pengaturan browser untuk menghapus riwayat. Ekspor CSV terlebih dahulu jika diperlukan. Backend menggunakan berkas sementara untuk pemrosesan video; kebijakan hosting mengikuti operator backend.",
                "Clear site data in browser settings to remove history. Export a CSV first if needed. The backend uses temporary files for video processing; hosting policies depend on the backend operator.",
              )}
            </p>
          </div>
        </section>
        <section className="panel" id="setup">
          <div className="panel-header">
            <h2>
              <Database />
              {text("Koneksi & sumber data", "Connection & data sources")}
            </h2>
          </div>
          <div className="panel-body guide-prose">
            <p>
              {text(
                "Status koneksi berasal dari health check backend. Jika server Hugging Face sedang tidur, aplikasi mencoba menghubungkan ulang hingga 2 menit. Tombol Coba lagi tersedia saat koneksi gagal.",
                "Connection status comes from the backend health check. If the Hugging Face server is asleep, the app retries for up to 2 minutes. A retry button is available after connection failure.",
              )}
            </p>
            <p>
              {text(
                "Untuk pengembang: atur NEXT_PUBLIC_API_BASE di .env.local. public/config.js dapat memberi override runtime. Host backend tambahan juga harus diizinkan oleh CSP di src/proxy.ts.",
                "For developers: set NEXT_PUBLIC_API_BASE in .env.local. public/config.js can supply a runtime override. Additional backend hosts must also be allowed by the CSP in src/proxy.ts.",
              )}
            </p>
            <p>
              {text(
                "Dataset: Roboflow Construction Safety Helmet · lisensi CC BY 4.0. Kelas Person dapat tumpang tindih dengan Helmet atau No-Helmet; jangan menjumlahkannya sebagai pekerja unik.",
                "Dataset: Roboflow Construction Safety Helmet · CC BY 4.0 license. Person can overlap with Helmet or No-Helmet; do not sum the classes as unique workers.",
              )}
            </p>
            <a
              href="https://universe.roboflow.com/naufalfirdaus/construction-safety-helmet-lnit7"
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              {text("Lihat sumber dataset", "View dataset source")}
              <ArrowUpRight />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
