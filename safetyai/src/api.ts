/**
 * Klien API ke backend FastAPI (Hugging Face) untuk Deteksi Helm Konstruksi (YOLO26s).
 * TIDAK ada inference di browser — semua gambar/video dikirim ke server.
 *
 * URL backend ditentukan dengan urutan:
 *   1. window.API_BASE   -> override runtime via public/config.js (bisa diubah TANPA build ulang)
 *   2. VITE_API_BASE     -> variabel build-time (mis. di-set pada dashboard Vercel)
 */

const RAW_BASE =
  (typeof window !== "undefined" && window.API_BASE) ||
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  "";

/** URL backend tanpa garis miring di akhir. */
export const API_BASE = RAW_BASE.replace(/\/$/, "");

export const CLASSES = ["Helmet", "No-Helmet", "Person"] as const;

/** True bila URL backend sudah diisi (dan bukan placeholder "GANTI..."). */
export function isApiConfigured(): boolean {
  return !!API_BASE && !API_BASE.includes("GANTI");
}

export interface DetectionBox {
  cls: number;
  name: string;
  conf: number;
  box: number[]; // [x1, y1, x2, y2] piksel
}

/** Bentuk respons POST /predict/image (lihat backend-huggingface/app.py). */
export interface PredictImageResult {
  annotated: string; // data URL JPEG (kotak deteksi sudah digambar oleh server)
  detections: DetectionBox[];
  counts: Record<string, number>; // { Helmet, "No-Helmet", Person }
  no_helmet: number;
  total: number;
  time_ms: number;
}

/** Health check: GET / -> true bila server merespons OK. */
export async function checkHealth(): Promise<boolean> {
  if (!isApiConfigured()) return false;
  try {
    const r = await fetch(API_BASE + "/", { method: "GET" });
    return r.ok;
  } catch {
    return false;
  }
}

/** Deteksi pada satu gambar. Mengembalikan gambar beranotasi + ringkasan hitungan. */
export async function predictImage(
  blob: Blob,
  conf: number,
  iou: number,
): Promise<PredictImageResult> {
  const fd = new FormData();
  fd.append("file", blob, "image.jpg");
  const r = await fetch(`${API_BASE}/predict/image?conf=${conf}&iou=${iou}`, {
    method: "POST",
    body: fd,
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return (await r.json()) as PredictImageResult;
}

/** Deteksi pada video. Mengembalikan MP4 (H.264) beranotasi sebagai Blob. */
export async function predictVideo(
  file: File,
  conf: number,
  iou: number,
): Promise<Blob> {
  const fd = new FormData();
  fd.append("file", file, file.name || "video.mp4");
  const r = await fetch(`${API_BASE}/predict/video?conf=${conf}&iou=${iou}`, {
    method: "POST",
    body: fd,
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.blob();
}
