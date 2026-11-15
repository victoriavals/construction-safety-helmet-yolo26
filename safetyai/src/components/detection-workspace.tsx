"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileImage,
  HardHat,
  ImagePlus,
  Info,
  LoaderCircle,
  Maximize2,
  Save,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  Users,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspace } from "./workspace-provider";
import { BackendIndicator } from "./app-shell";
import { ScanStatusBadge } from "./dashboard";
import { EXAMPLES, type ScanLog } from "@/lib/model";
import {
  predictImage,
  predictVideo,
  isApiConfigured,
  markBackendReady,
  type PredictImageResult,
} from "@/api";

type Result =
  | { kind: "image"; data: PredictImageResult; log: ScanLog }
  | { kind: "video"; url: string };
export default function DetectionWorkspace() {
  const { text, language, backendStatus, saveLog } = useWorkspace();
  const [mode, setMode] = useState("image");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState("annotated");
  const [confidence, setConfidence] = useState(0.25);
  const [iou, setIou] = useState(0.45);
  const [expandedImage, setExpandedImage] = useState<{
    src: string;
    title: string;
    description: string;
  } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const request = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const busy = analyzing || loadingExample;
  const imageResult = result?.kind === "image" ? result : null;
  const displayedImage =
    imageResult && view === "annotated"
      ? imageResult.data.annotated
      : mode === "image"
        ? preview
        : "";
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    const url = result?.kind === "video" ? result.url : null;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [result]);
  useEffect(
    () => () => {
      request.current?.abort();
      requestId.current++;
    },
    [],
  );

  function chooseFile(candidate: File) {
    setResult(null);
    setSaved(false);
    setError("");
    setView("annotated");
    const validImage = ["image/jpeg", "image/png", "image/webp"].includes(
      candidate.type,
    );
    const validVideo =
      /^video\//.test(candidate.type) &&
      /\.(mp4|avi|mkv|mov|webm)$/i.test(candidate.name);
    if (mode === "image" ? !validImage : !validVideo) {
      setFile(null);
      setError(
        mode === "image"
          ? text(
              "Format belum didukung. Pilih gambar JPG, PNG, atau WebP.",
              "Unsupported format. Choose a JPG, PNG, or WebP image.",
            )
          : text(
              "Pilih video MP4, MOV, AVI, MKV, atau WebM.",
              "Choose an MP4, MOV, AVI, MKV, or WebM video.",
            ),
      );
      return;
    }
    if (
      candidate.size > (mode === "image" ? 10 : 40) * 1024 * 1024 ||
      candidate.size === 0
    ) {
      setFile(null);
      setError(
        candidate.size === 0
          ? text(
              "File kosong. Pilih file lain.",
              "This file is empty. Choose another file.",
            )
          : text(
              `File terlalu besar. Batas ${mode === "image" ? 10 : 40} MB.`,
              `File is too large. The limit is ${mode === "image" ? 10 : 40} MB.`,
            ),
      );
      return;
    }
    setFile(candidate);
    requestAnimationFrame(() => {
      previewHeading.current?.focus({ preventScroll: true });
      previewHeading.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    });
  }
  function switchMode(value: string) {
    if (busy) return;
    setMode(value);
    setFile(null);
    setResult(null);
    setError("");
    setSaved(false);
  }
  function cancel() {
    request.current?.abort();
    requestId.current++;
    setAnalyzing(false);
    setLoadingExample(false);
    toast(
      text(
        "Proses dibatalkan. Anda dapat mencoba kembali.",
        "Cancelled. You can try again.",
      ),
    );
  }
  async function selectExample(example: (typeof EXAMPLES)[number]) {
    const id = ++requestId.current;
    const controller = new AbortController();
    request.current = controller;
    setLoadingExample(true);
    setError("");
    setResult(null);
    setSaved(false);
    try {
      const response = await fetch(example.url, { signal: controller.signal });
      if (!response.ok) throw new Error("EXAMPLE_FAILED");
      const blob = await response.blob();
      if (requestId.current === id)
        chooseFile(new File([blob], example.filename, { type: "image/jpeg" }));
    } catch {
      if (requestId.current === id)
        setError(
          text(
            "Gambar contoh tidak dapat dimuat. Pilih file Anda atau coba lagi.",
            "Could not load the sample. Choose your own file or try again.",
          ),
        );
    } finally {
      if (requestId.current === id) setLoadingExample(false);
    }
  }
  function errorMessage(value: unknown) {
    const message = value instanceof Error ? value.message : "";
    if (message.includes("413"))
      return text(
        "File ditolak karena terlalu besar. Gunakan file yang lebih kecil.",
        "The server rejected this file as too large. Choose a smaller file.",
      );
    if (message.includes("429"))
      return text(
        "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
        "Too many requests. Wait a moment and try again.",
      );
    if (message === "BACKEND_ASLEEP")
      return text(
        "Backend belum merespons. Coba hubungkan ulang atau kembali beberapa saat lagi.",
        "The backend has not responded. Reconnect or try again shortly.",
      );
    if (message === "INVALID_RESPONSE")
      return text(
        "Respons server tidak sesuai. Hasil belum dapat ditampilkan. Coba lagi.",
        "The server returned an unexpected response. No results are available. Try again.",
      );
    if (value instanceof DOMException && value.name === "TimeoutError")
      return text(
        "Waktu pemrosesan habis. Coba file lebih kecil atau ulangi nanti.",
        "Processing timed out. Try a smaller file or retry later.",
      );
    return text(
      "Analisis gagal. Periksa koneksi dan ketersediaan backend, lalu coba lagi.",
      "Analysis failed. Check your connection and backend availability, then try again.",
    );
  }
  async function analyze() {
    if (!file || busy) return;
    if (!isApiConfigured()) {
      setError(
        text(
          "URL backend belum diatur. Lihat panduan konfigurasi untuk melanjutkan.",
          "The backend URL is not configured. See the setup guide to continue.",
        ),
      );
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    const id = ++requestId.current;
    setAnalyzing(true);
    setResult(null);
    setSaved(false);
    setError("");
    setView("annotated");
    try {
      if (mode === "image") {
        const data = await predictImage(
          file,
          confidence,
          iou,
          controller.signal,
        );
        if (requestId.current !== id) return;
        setResult({
          kind: "image",
          data,
          log: {
            id: `SCN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            filename: file.name,
            createdAt: new Date().toISOString(),
            helmet: data.counts.Helmet,
            noHelmet: data.counts["No-Helmet"],
            person: data.counts.Person,
            timeMs: data.time_ms,
            confidence,
            iou,
            snapshot: data.annotated,
          },
        });
      } else {
        const blob = await predictVideo(
          file,
          confidence,
          iou,
          controller.signal,
        );
        if (requestId.current !== id) return;
        setResult({ kind: "video", url: URL.createObjectURL(blob) });
      }
      markBackendReady();
    } catch (value) {
      if (requestId.current === id && !controller.signal.aborted)
        setError(errorMessage(value));
    } finally {
      if (requestId.current === id) setAnalyzing(false);
    }
  }
  function download() {
    if (!result) return;
    const anchor = document.createElement("a");
    anchor.href = result.kind === "image" ? result.data.annotated : result.url;
    anchor.download =
      result.kind === "image" ? "safetyai-result.jpg" : "safetyai-result.mp4";
    anchor.click();
  }
  function save() {
    if (!imageResult || saved) return;
    if (saveLog(imageResult.log)) {
      setSaved(true);
      toast.success(
        text(
          "Ringkasan disimpan ke riwayat browser ini.",
          "Summary saved to this browser's history.",
        ),
      );
    }
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    if (event.dataTransfer.files.length !== 1) {
      setError(
        text(
          "Pilih satu file untuk setiap pemeriksaan.",
          "Choose one file per inspection.",
        ),
      );
      return;
    }
    chooseFile(event.dataTransfer.files[0]);
  }
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <Link href="/" className="back-link">
            <ArrowLeft />
            {text("Kembali ke ringkasan", "Back to overview")}
          </Link>
          <h1>
            {text("Periksa. Kenali. Lindungi", "Inspect. Understand. Protect")}
            <span className="heading-period">.</span>
          </h1>
          <p>
            {text(
              "Unggah gambar atau video untuk memeriksa penggunaan helm keselamatan.",
              "Upload an image or video to inspect safety helmet use.",
            )}
          </p>
        </div>
        <Badge variant="outline" className="model-badge">
          <ScanLine />
          YOLO26s · 640 px
        </Badge>
      </div>
      <ol
        className="workflow-steps"
        aria-label={text("Tahapan pemeriksaan", "Inspection steps")}
      >
        {[
          text("Pilih sumber", "Choose a source"),
          text("Jalankan analisis", "Run analysis"),
          text("Tinjau & simpan", "Review & save"),
        ].map((label, index) => (
          <li
            key={label}
            className={index === (result ? 2 : file ? 1 : 0) ? "current" : ""}
          >
            <span>{index + 1}</span>
            {label}
            {index < 2 ? <ChevronStep /> : null}
          </li>
        ))}
      </ol>
      <div className="detection-grid">
        <div className="detection-main">
          <section className="panel upload-panel">
            <Tabs value={mode} onValueChange={switchMode}>
              <div className="panel-header">
                <h2>{text("Sumber pemeriksaan", "Inspection source")}</h2>
                <TabsList aria-label={text("Jenis media", "Media type")}>
                  <TabsTrigger value="image" disabled={busy}>
                    <FileImage />
                    {text("Gambar", "Image")}
                  </TabsTrigger>
                  <TabsTrigger value="video" disabled={busy}>
                    <Video />
                    Video
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value={mode} className="upload-content">
                <div
                  className={`upload-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!busy) setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={drop}
                >
                  <input
                    ref={input}
                    type="file"
                    className="sr-only"
                    tabIndex={-1}
                    aria-label={text("File pemeriksaan", "Inspection file")}
                    accept={
                      mode === "image"
                        ? "image/jpeg,image/png,image/webp"
                        : "video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
                    }
                    disabled={busy}
                    onChange={(e) => {
                      const selected = e.currentTarget.files?.[0];
                      if (selected) chooseFile(selected);
                      e.currentTarget.value = "";
                    }}
                  />
                  <div className="upload-icon">
                    {file ? <Check /> : <UploadCloud />}
                  </div>
                  <h3>
                    {file
                      ? file.name
                      : text("Tarik file ke sini", "Drop your file here")}
                  </h3>
                  <p>
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${text("Siap dianalisis", "Ready to analyze")}`
                      : mode === "image"
                        ? text(
                            "JPG, PNG, atau WebP · Maksimum 10 MB",
                            "JPG, PNG, or WebP · Up to 10 MB",
                          )
                        : text(
                            "MP4, MOV, AVI, MKV, WebM · Maksimum 40 MB",
                            "MP4, MOV, AVI, MKV, WebM · Up to 40 MB",
                          )}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => input.current?.click()}
                    disabled={busy}
                  >
                    <ImagePlus data-icon="inline-start" />
                    {file
                      ? text("Ganti file", "Change file")
                      : text("Pilih file", "Choose file")}
                  </Button>
                </div>
                {mode === "image" ? (
                  <div className="examples-section">
                    <div>
                      <span>
                        {text(
                          "Pilih foto pekerja untuk dianalisis, atau perbesar untuk melihat detailnya.",
                          "Choose a worker photo to analyze, or enlarge it to inspect the details.",
                        )}
                      </span>
                      {loadingExample ? (
                        <LoaderCircle className="spinner-icon" />
                      ) : null}
                    </div>
                    <div className="example-grid">
                      {EXAMPLES.map((example, index) => (
                        <article
                          key={example.id}
                          className="example-card"
                          data-selected={file?.name === example.filename}
                        >
                          <button
                            className="example-pick"
                            disabled={busy}
                            onClick={() => void selectExample(example)}
                            aria-label={`${text("Pilih contoh", "Choose sample")} ${index + 1}`}
                            aria-describedby={`example-title-${example.id} example-description-${example.id}`}
                            aria-pressed={file?.name === example.filename}
                          >
                            <img
                              src={example.url}
                              alt=""
                              loading="lazy"
                              width={640}
                              height={640}
                            />
                            <div className="example-caption">
                              <span className="example-number">
                                {text("Contoh", "Sample")} 0{index + 1}
                              </span>
                              <strong id={`example-title-${example.id}`}>
                                {example.title[language]}
                              </strong>
                              <p id={`example-description-${example.id}`}>
                                {example.description[language]}
                              </p>
                              <span className="example-action">
                                {file?.name === example.filename
                                  ? text("Gambar dipilih", "Image selected")
                                  : text("Pilih gambar", "Choose image")}
                                <ArrowRight />
                              </span>
                            </div>
                          </button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="example-expand"
                            disabled={busy}
                            aria-label={`${text("Perbesar contoh", "Enlarge sample")} ${index + 1}`}
                            aria-describedby={`example-title-${example.id}`}
                            onClick={(event) => {
                              previewTrigger.current = event.currentTarget;
                              setExpandedImage({
                                src: example.url,
                                title: example.title[language],
                                description: example.description[language],
                              });
                            }}
                          >
                            <Maximize2 />
                          </Button>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="video-hint">
                    <Info />
                    {text(
                      "Video diproses per frame dan memerlukan waktu lebih lama. Setelah selesai, unduh video beranotasi.",
                      "Videos are processed frame by frame and take longer. Download the annotated video when ready.",
                    )}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </section>

          {error ? (
            <Alert variant="destructive" role="alert">
              <ShieldAlert />
              <AlertTitle>
                {text(
                  "Pemeriksaan belum berhasil",
                  "Inspection could not be completed",
                )}
              </AlertTitle>
              <AlertDescription>
                {error}
                <Link href="/about#setup" className="text-link">
                  {text("Lihat panduan koneksi", "View connection guide")}
                  <ArrowUpRight />
                </Link>
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="panel viewer-panel" aria-busy={analyzing}>
            <div className="panel-header">
              <div>
                <h2
                  ref={previewHeading}
                  tabIndex={-1}
                  className="preview-heading"
                >
                  {result
                    ? text("Hasil analisis", "Analysis result")
                    : text("Pratinjau sumber", "Source preview")}
                </h2>
                <p>
                  {analyzing
                    ? text("Analisis sedang berjalan…", "Analysis in progress…")
                    : result
                      ? text(
                          "Tinjau hasil sebelum menyimpannya",
                          "Review the result before saving",
                        )
                      : text(
                          "File tetap dapat diganti sebelum analisis",
                          "You can change the file before analysis",
                        )}
                </p>
              </div>
              <div className="viewer-tools">
                {imageResult ? (
                  <ToggleGroup
                    type="single"
                    value={view}
                    onValueChange={(value) => {
                      if (value) setView(value);
                    }}
                    className="source-switch"
                    aria-label={text("Tampilan gambar", "Image view")}
                  >
                    <ToggleGroupItem value="original">
                      {text("Asli", "Original")}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="annotated">
                      {text("Hasil AI", "AI result")}
                    </ToggleGroupItem>
                  </ToggleGroup>
                ) : null}
                {displayedImage ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={(event) => {
                      previewTrigger.current = event.currentTarget;
                      setExpandedImage({
                        src: displayedImage,
                        title: text("Pratinjau gambar", "Image preview"),
                        description: file?.name ?? "",
                      });
                    }}
                    aria-label={text("Perbesar pratinjau", "Enlarge preview")}
                  >
                    <Maximize2 data-icon="inline-start" />
                    {text("Perbesar", "Enlarge")}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className={`media-viewer ${file ? "with-media" : ""}`}>
              {result?.kind === "video" ? (
                <video
                  src={result.url}
                  controls
                  aria-label={text(
                    "Video hasil deteksi",
                    "Detection result video",
                  )}
                />
              ) : file && mode === "video" ? (
                <video
                  src={preview}
                  controls
                  aria-label={text("Pratinjau video", "Video preview")}
                />
              ) : file && preview ? (
                <img
                  src={displayedImage}
                  alt={
                    imageResult && view === "annotated"
                      ? text(
                          "Gambar dengan kotak hasil deteksi helm",
                          "Image with helmet detection boxes",
                        )
                      : text(
                          "Pratinjau gambar yang dipilih",
                          "Selected image preview",
                        )
                  }
                />
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ScanLine />
                    </EmptyMedia>
                    <EmptyTitle>
                      {text(
                        "Satu gambar, langkah pertama.",
                        "One image. A first step.",
                      )}
                    </EmptyTitle>
                    <EmptyDescription>
                      {text(
                        "Pilih file atau gambar contoh. Pratinjaunya akan muncul di sini.",
                        "Choose a file or sample image. Its preview will appear here.",
                      )}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              {analyzing ? (
                <div className="analysis-overlay" role="status">
                  <LoaderCircle className="spinner-icon" />
                  <strong>
                    {backendStatus === "waking"
                      ? text("Menyiapkan backend…", "Preparing the backend…")
                      : mode === "video"
                        ? text("Memproses video…", "Processing video…")
                        : text("Menganalisis gambar…", "Analyzing image…")}
                  </strong>
                  <p>
                    {backendStatus === "waking"
                      ? text(
                          "Server mungkin sedang bangun. Ini dapat memerlukan hingga 2 menit.",
                          "The server may be waking up. This can take up to 2 minutes.",
                        )
                      : text(
                          "Anda dapat membatalkan permintaan kapan saja.",
                          "You can cancel the request at any time.",
                        )}
                  </p>
                  <Button variant="outline" onClick={cancel}>
                    {text("Batalkan", "Cancel")}
                  </Button>
                </div>
              ) : null}
            </div>
            {result ? (
              <div className="viewer-footer">
                <span>
                  <Check />
                  {text("Analisis selesai", "Analysis complete")}
                </span>
                <Button variant="outline" onClick={download}>
                  <ArrowDownToLine data-icon="inline-start" />
                  {text("Unduh hasil", "Download result")}
                </Button>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="detection-aside">
          <section className="panel settings-panel">
            <div className="panel-header">
              <h2>
                <SlidersHorizontal />
                {text("Atur pemeriksaan", "Inspection settings")}
              </h2>
            </div>
            <div className="panel-body">
              <BackendIndicator expanded />
              <p className="connection-note">
                {text(
                  "File dikirim ke server inferensi untuk dianalisis.",
                  "Files are sent to the inference server for analysis.",
                )}
              </p>
              <FieldGroup>
                <Field>
                  <div className="range-label">
                    <FieldLabel htmlFor="confidence">
                      {text("Ambang keyakinan", "Confidence threshold")}
                    </FieldLabel>
                    <output htmlFor="confidence">
                      {Math.round(confidence * 100)}%
                    </output>
                  </div>
                  <input
                    id="confidence"
                    type="range"
                    min=".05"
                    max=".95"
                    step=".05"
                    value={confidence}
                    disabled={busy}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    aria-describedby="confidence-help"
                  />
                  <FieldDescription id="confidence-help">
                    {text(
                      "Nilai lebih rendah menampilkan lebih banyak prediksi, termasuk yang kurang pasti.",
                      "A lower value shows more predictions, including less certain ones.",
                    )}
                  </FieldDescription>
                </Field>
              </FieldGroup>
              <details className="advanced-settings">
                <summary>
                  {text("Pengaturan lanjutan", "Advanced settings")}
                </summary>
                <FieldGroup>
                  <Field>
                    <div className="range-label">
                      <FieldLabel htmlFor="iou">IoU threshold</FieldLabel>
                      <output htmlFor="iou">{Math.round(iou * 100)}%</output>
                    </div>
                    <input
                      id="iou"
                      type="range"
                      min=".1"
                      max=".9"
                      step=".05"
                      value={iou}
                      disabled={busy}
                      onChange={(e) => setIou(Number(e.target.value))}
                      aria-describedby="iou-help"
                    />
                    <FieldDescription id="iou-help">
                      {text(
                        "Mengatur tumpang tindih kotak pada proses deteksi.",
                        "Controls box overlap during detection.",
                      )}
                    </FieldDescription>
                  </Field>
                </FieldGroup>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setConfidence(0.25);
                    setIou(0.45);
                  }}
                >
                  {text("Kembalikan nilai awal", "Reset defaults")}
                </Button>
              </details>
              <Button
                className="analyze-button"
                size="lg"
                disabled={!file || busy}
                onClick={() => void analyze()}
              >
                {analyzing ? (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="spinner-icon"
                  />
                ) : (
                  <ScanLine data-icon="inline-start" />
                )}
                {analyzing
                  ? text("Menganalisis…", "Analyzing…")
                  : result
                    ? text("Analisis ulang", "Analyze again")
                    : text("Jalankan analisis", "Run analysis")}
                <ArrowRight data-icon="inline-end" />
              </Button>
              {busy ? (
                <Button variant="outline" onClick={cancel}>
                  {text("Batalkan proses", "Cancel processing")}
                </Button>
              ) : null}
              <p className="panel-note">
                {text(
                  "Pengaturan baru diterapkan saat Anda menjalankan analisis.",
                  "Settings apply when you run the analysis.",
                )}
              </p>
            </div>
          </section>

          <section className="panel results-panel" aria-live="polite">
            <div className="panel-header">
              <h2>{text("Ringkasan temuan", "Findings summary")}</h2>
              {imageResult ? (
                <Badge variant="secondary">
                  {Math.round(imageResult.data.time_ms)} ms
                </Badge>
              ) : null}
            </div>
            <div className="panel-body">
              {imageResult ? (
                <>
                  <ScanStatusBadge scan={imageResult.log} />
                  <p className="result-description">
                    {imageResult.data.no_helmet > 0
                      ? text(
                          "Ada prediksi tanpa helm. Periksa kotak deteksi dan kondisi di lapangan sebelum bertindak.",
                          "No-helmet predictions were found. Check detection boxes and site conditions before acting.",
                        )
                      : imageResult.data.total === 0
                        ? text(
                            "Tidak ada objek yang terdeteksi. Coba gambar lebih jelas atau turunkan ambang keyakinan.",
                            "No objects were detected. Try a clearer image or lower the confidence threshold.",
                          )
                        : text(
                            "Tidak ada prediksi tanpa helm. Hasil ini tetap perlu diverifikasi dan bukan jaminan area aman.",
                            "No no-helmet predictions were found. Verify the result; it does not guarantee site safety.",
                          )}
                  </p>
                  <dl className="result-counts">
                    {[
                      {
                        name: text("Helm", "Helmet"),
                        value: imageResult.log.helmet,
                        icon: HardHat,
                      },
                      {
                        name: text("Tanpa helm", "No helmet"),
                        value: imageResult.log.noHelmet,
                        icon: ShieldAlert,
                      },
                      {
                        name: text("Orang", "Person"),
                        value: imageResult.log.person,
                        icon: Users,
                      },
                    ].map((item, index) => (
                      <div key={item.name}>
                        <span className={`class-dot class-${index}`} />
                        <item.icon />
                        <dt>{item.name}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="panel-note">
                    {text(
                      "Hitungan kelas dapat tumpang tindih dan bukan jumlah pekerja unik.",
                      "Class counts can overlap and are not unique worker counts.",
                    )}
                  </p>
                  <Button variant="outline" disabled={saved} onClick={save}>
                    {saved ? (
                      <Check data-icon="inline-start" />
                    ) : (
                      <Save data-icon="inline-start" />
                    )}
                    {saved
                      ? text("Ringkasan tersimpan", "Summary saved")
                      : text("Simpan ke riwayat", "Save to history")}
                  </Button>
                  {saved ? (
                    <Link href="/#history" className="text-link">
                      {text(
                        "Buka riwayat pemeriksaan",
                        "View inspection history",
                      )}
                      <ArrowRight />
                    </Link>
                  ) : null}
                </>
              ) : result?.kind === "video" ? (
                <div className="neutral-result">
                  <Video />
                  <strong>
                    {text(
                      "Video selesai diproses",
                      "Video processing complete",
                    )}
                  </strong>
                  <p>
                    {text(
                      "Kotak deteksi tersedia di video. API belum menyediakan ringkasan hitungan untuk video; unduh hasil di panel pratinjau.",
                      "Detection boxes are shown in the video. The API does not provide aggregate video counts yet. Download the result from the preview panel.",
                    )}
                  </p>
                </div>
              ) : (
                <div className="neutral-result">
                  <ScanLine />
                  <strong>
                    {text("Menunggu analisis", "Waiting for analysis")}
                  </strong>
                  <p>
                    {text(
                      "Jumlah objek dan status peninjauan akan tersedia setelah analisis selesai.",
                      "Object counts and review status will appear after analysis completes.",
                    )}
                  </p>
                </div>
              )}
            </div>
          </section>
          <div className="aside-note">
            <ShieldCheck />
            <p>
              {text(
                "Hanya ringkasan disimpan di browser. Unduh gambar atau video untuk menyimpan hasil visual.",
                "Only summaries are saved in your browser. Download the image or video to keep the visual result.",
              )}
            </p>
          </div>
        </aside>
      </div>
      {file && !result ? (
        <div className="mobile-analysis-bar">
          <div>
            <strong>{file.name}</strong>
            <span>
              {text("Ambang keyakinan", "Confidence")}{" "}
              {Math.round(confidence * 100)}%
            </span>
          </div>
          <Button
            disabled={loadingExample}
            onClick={() => {
              if (analyzing) cancel();
              else void analyze();
            }}
          >
            {analyzing ? (
              <X data-icon="inline-start" />
            ) : (
              <ScanLine data-icon="inline-start" />
            )}
            {analyzing
              ? text("Batalkan", "Cancel")
              : text("Analisis file", "Analyze file")}
          </Button>
        </div>
      ) : null}
      <Dialog
        open={!!expandedImage}
        onOpenChange={(open) => {
          if (!open) setExpandedImage(null);
        }}
      >
        <DialogContent
          className="image-preview-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            previewTrigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {expandedImage?.title ??
                text("Pratinjau gambar", "Image preview")}
            </DialogTitle>
            <DialogDescription>{expandedImage?.description}</DialogDescription>
          </DialogHeader>
          {expandedImage ? (
            <div className="expanded-image">
              <img
                src={expandedImage.src}
                alt={expandedImage.description || expandedImage.title}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function ChevronStep() {
  return <ArrowRight aria-hidden="true" />;
}
