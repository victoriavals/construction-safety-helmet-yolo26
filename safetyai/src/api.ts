/**
 * Klien API ke backend FastAPI (Hugging Face) untuk Deteksi Helm Konstruksi (YOLO26s).
 * TIDAK ada inference di browser — semua gambar/video dikirim ke server.
 *
 * URL backend ditentukan dengan urutan:
 *   1. window.API_BASE   -> override runtime via public/config.js (bisa diubah TANPA build ulang)
 *   2. NEXT_PUBLIC_API_BASE -> variabel build-time Next.js
 */

const RAW_BASE =
  (typeof window !== "undefined" && window.API_BASE) ||
  process.env.NEXT_PUBLIC_API_BASE ||
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

// ---------------------------------------------------------------------------
// Warm-up backend (Hugging Face Space bisa TERTIDUR)
//
// Space gratis tidur setelah ~48 jam tanpa aktivitas dan bangun otomatis begitu
// ada HTTP request masuk — tetapi cold start butuh puluhan detik (boot container
// + load model YOLO). Satu `fetch` biasa akan gagal/timeout di masa itu dan
// membuat UI salah lapor "server error" padahal server sedang bangun.
//
// Karena itu health check di sini SABAR: percobaan berulang dengan backoff
// sampai Space siap, dan statusnya bisa diikuti (subscribe) oleh komponen mana
// pun. Warm-up bersifat SINGLETON — dipicu WorkspaceProvider saat app dibuka.
// ---------------------------------------------------------------------------

/** Status backend: belum diatur | sedang dibangunkan | siap | gagal. */
export type BackendStatus = "unconfigured" | "waking" | "ready" | "error";

const HEALTH_TIMEOUT_MS = 8_000; // batas satu kali ping
const WAKE_MAX_WAIT_MS = 120_000; // total kesabaran menunggu Space bangun
const WAKE_BACKOFF_MS = [1_000, 2_000, 3_000, 5_000, 5_000, 8_000];

let backendStatus: BackendStatus = "unconfigured";
let warmUpPromise: Promise<boolean> | null = null;
const listeners = new Set<(s: BackendStatus) => void>();

function setStatus(next: BackendStatus): void {
  if (backendStatus === next) return;
  backendStatus = next;
  listeners.forEach((fn) => fn(next));
}

/** Status backend saat ini (untuk nilai awal useState). */
export function getBackendStatus(): BackendStatus {
  return backendStatus;
}

/**
 * Ikuti perubahan status backend. Callback langsung dipanggil dengan status
 * terkini. Mengembalikan fungsi unsubscribe.
 */
export function subscribeBackendStatus(
  fn: (s: BackendStatus) => void,
): () => void {
  listeners.add(fn);
  fn(backendStatus);
  return () => {
    listeners.delete(fn);
  };
}

/** Satu kali ping `GET /` dengan timeout (AbortController). */
async function pingHealth(timeoutMs: number): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(API_BASE + "/", {
      method: "GET",
      signal: ctrl.signal,
    });
    return r.ok;
  } catch {
    return false; // termasuk abort/timeout & network error saat Space masih boot
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Bangunkan backend dan tunggu sampai siap. Aman dipanggil berkali-kali:
 * pemanggilan berikutnya menumpang promise yang sama (tidak menghujani Space).
 */
export function warmUpBackend(): Promise<boolean> {
  if (!isApiConfigured()) {
    setStatus("unconfigured");
    return Promise.resolve(false);
  }
  if (warmUpPromise) return warmUpPromise;

  setStatus("waking");
  warmUpPromise = (async () => {
    const started = Date.now();
    for (let attempt = 0; ; attempt++) {
      if (await pingHealth(HEALTH_TIMEOUT_MS)) {
        setStatus("ready");
        return true;
      }
      if (Date.now() - started >= WAKE_MAX_WAIT_MS) {
        setStatus("error");
        return false; // benar-benar tidak merespons (mis. Space "paused")
      }
      const wait =
        WAKE_BACKOFF_MS[Math.min(attempt, WAKE_BACKOFF_MS.length - 1)];
      await new Promise((res) => setTimeout(res, wait));
    }
  })();
  return warmUpPromise;
}

/** Ulangi warm-up dari nol (untuk tombol "Coba lagi" setelah gagal). */
export function retryWarmUp(): Promise<boolean> {
  if (backendStatus === "waking" && warmUpPromise) return warmUpPromise;
  warmUpPromise = null;
  return warmUpBackend();
}

/** Tandai backend siap — dipakai setelah sebuah request inference berhasil. */
export function markBackendReady(): void {
  setStatus("ready");
}

/** Health check sekali jalan (tanpa retry). */
export async function checkHealth(): Promise<boolean> {
  if (!isApiConfigured()) return false;
  return pingHealth(HEALTH_TIMEOUT_MS);
}

/** Penanda error saat backend tidak berhasil dibangunkan (dipetakan ke teks UI). */
export const ERR_BACKEND_ASLEEP = "BACKEND_ASLEEP";

/**
 * Pastikan backend siap sebelum mengirim inference. Bila Space sedang tidur,
 * request akan MENUNGGU sampai bangun alih-alih langsung gagal.
 */
async function ensureAwake(signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  if (backendStatus === "ready") return;
  const pending = warmUpBackend();
  const ok = await new Promise<boolean>((resolve, reject) => {
    const abort = () => reject(new DOMException("Cancelled", "AbortError"));
    signal?.addEventListener("abort", abort, { once: true });
    pending
      .then(resolve, reject)
      .finally(() => signal?.removeEventListener("abort", abort));
  });
  if (!ok) throw new Error(ERR_BACKEND_ASLEEP);
}

/** Deteksi pada satu gambar. Mengembalikan gambar beranotasi + ringkasan hitungan. */
export async function predictImage(
  blob: Blob,
  conf: number,
  iou: number,
  signal?: AbortSignal,
): Promise<PredictImageResult> {
  await ensureAwake(signal);
  const fd = new FormData();
  fd.append("file", blob, "image.jpg");
  const r = await fetch(`${API_BASE}/predict/image?conf=${conf}&iou=${iou}`, {
    method: "POST",
    body: fd,
    signal: AbortSignal.any([
      AbortSignal.timeout(120_000),
      ...(signal ? [signal] : []),
    ]),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const data = (await r.json()) as PredictImageResult;
  const counts = CLASSES.map((name) => data.counts?.[name]);
  if (
    typeof data.annotated !== "string" ||
    !/^data:image\/(jpeg|png);base64,/.test(data.annotated) ||
    !counts.every((n) => Number.isInteger(n) && n >= 0) ||
    !Number.isFinite(data.time_ms) ||
    data.time_ms < 0 ||
    !Number.isInteger(data.total) ||
    data.total < 0 ||
    !Number.isInteger(data.no_helmet) ||
    data.no_helmet < 0
  ) {
    throw new Error("INVALID_RESPONSE");
  }
  return data;
}

/** Deteksi pada video. Mengembalikan MP4 (H.264) beranotasi sebagai Blob. */
export async function predictVideo(
  file: File,
  conf: number,
  iou: number,
  signal?: AbortSignal,
): Promise<Blob> {
  await ensureAwake(signal);
  const fd = new FormData();
  fd.append("file", file, file.name || "video.mp4");
  const r = await fetch(`${API_BASE}/predict/video?conf=${conf}&iou=${iou}`, {
    method: "POST",
    body: fd,
    signal: AbortSignal.any([
      AbortSignal.timeout(300_000),
      ...(signal ? [signal] : []),
    ]),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  if (!r.headers.get("content-type")?.includes("video/"))
    throw new Error("INVALID_RESPONSE");
  return r.blob();
}
