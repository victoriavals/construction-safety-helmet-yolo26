import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import {
  Upload, Image as ImageIcon, Video, Layers,
  CheckCircle, Sliders, Download, Share2, AlertTriangle
} from "lucide-react";
import { Language } from "../types";
import { translations } from "../translations";
import { EXAMPLE_IMAGES, ExampleImage } from "../data";
import { motion, AnimatePresence } from "motion/react";
import {
  predictImage, predictVideo, isApiConfigured,
  warmUpBackend, retryWarmUp, subscribeBackendStatus, getBackendStatus,
  markBackendReady, ERR_BACKEND_ASLEEP, BackendStatus,
} from "../api";

interface DetectViewProps {
  language: Language;
  onAddLog: (newImgUrl: string, helmet: number, noHelmet: number, person: number) => void;
}

type ServerStatus = BackendStatus;

export default function DetectView({ language, onAddLog }: DetectViewProps) {
  const t = translations[language];

  // --- UI state ---
  const [activeTab, setActiveTab] = useState<"image" | "video" | "examples">("image");
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0.25);
  const [iou, setIou] = useState<number>(0.45);
  const [incidentSuccessMessage, setIncidentSuccessMessage] = useState<string>("");
  const [serverStatus, setServerStatus] = useState<ServerStatus>(getBackendStatus());

  // --- hasil deteksi (dari backend) ---
  const [resultImg, setResultImg] = useState<string>("");        // gambar beranotasi (data URL)
  const [resultVideoUrl, setResultVideoUrl] = useState<string>(""); // object URL video
  const [helmetCount, setHelmetCount] = useState<number>(0);
  const [noHelmetCount, setNoHelmetCount] = useState<number>(0);
  const [personCount, setPersonCount] = useState<number>(0);
  const [totalDetections, setTotalDetections] = useState<number>(0);
  const [timeMs, setTimeMs] = useState<number | null>(null);
  const [hasResult, setHasResult] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const lastImageBlob = useRef<Blob | null>(null); // untuk re-run saat slider diubah

  // --- Ikuti status warm-up backend (dipicu sekali dari App.tsx) ---
  useEffect(() => {
    const unsubscribe = subscribeBackendStatus(setServerStatus);
    warmUpBackend(); // no-op bila warm-up sudah jalan/selesai
    return unsubscribe;
  }, []);

  const resetCounts = () => {
    setHelmetCount(0); setNoHelmetCount(0); setPersonCount(0);
    setTotalDetections(0); setTimeMs(null);
  };

  // --- Jalankan deteksi GAMBAR lewat backend ---
  const runImage = async (blob: Blob) => {
    if (!isApiConfigured()) {
      alert(t.serverUnconfigured);
      return;
    }
    lastImageBlob.current = blob;
    setAnalyzing(true);
    setIncidentSuccessMessage("");
    setResultVideoUrl("");
    try {
      const data = await predictImage(blob, confidence, iou);
      setResultImg(data.annotated);
      setHelmetCount(data.counts["Helmet"] ?? 0);
      setNoHelmetCount(data.no_helmet ?? data.counts["No-Helmet"] ?? 0);
      setPersonCount(data.counts["Person"] ?? 0);
      setTotalDetections(data.total ?? 0);
      setTimeMs(data.time_ms ?? null);
      setHasResult(true);
      markBackendReady();
    } catch (e: any) {
      if (e?.message === ERR_BACKEND_ASLEEP) {
        alert(t.serverAsleep); // warm-up sudah men-set status "error" sendiri
      } else {
        alert(
          (language === "EN" ? "Failed to process image: " : "Gagal memproses gambar: ") +
          e.message
        );
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert(language === "EN" ? "Please upload an image file." : "Silakan unggah berkas gambar.");
      return;
    }
    runImage(file);
  };

  // --- Pilih contoh: ambil blob lokal lalu kirim ke backend (deteksi NYATA) ---
  const handleSelectExample = async (ex: ExampleImage) => {
    try {
      const blob = await (await fetch(ex.url)).blob();
      await runImage(blob);
    } catch {
      alert(language === "EN" ? "Failed to load example image." : "Gagal memuat gambar contoh.");
    }
  };

  // --- Jalankan deteksi VIDEO lewat backend ---
  const handleVideoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isApiConfigured()) { alert(t.serverUnconfigured); return; }
    setAnalyzing(true);
    setIncidentSuccessMessage("");
    setResultImg("");
    resetCounts();
    try {
      const blob = await predictVideo(file, confidence, iou);
      if (resultVideoUrl) URL.revokeObjectURL(resultVideoUrl);
      setResultVideoUrl(URL.createObjectURL(blob));
      setHasResult(true);
      markBackendReady();
    } catch (err: any) {
      if (err?.message === ERR_BACKEND_ASLEEP) {
        alert(t.serverAsleep); // warm-up sudah men-set status "error" sendiri
      } else {
        alert((language === "EN" ? "Failed to process video: " : "Gagal memproses video: ") + err.message);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // --- Drag & drop (tab gambar) ---
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) processFile(files[0]);
  };
  const handleManualSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) processFile(files[0]);
  };

  // --- Re-run deteksi gambar saat slider conf/iou dilepas ---
  const rerunIfImage = () => {
    if (analyzing) return;
    if (lastImageBlob.current && !resultVideoUrl) runImage(lastImageBlob.current);
  };

  // --- Unduh gambar beranotasi ---
  const handleSave = () => {
    if (!resultImg) return;
    const a = document.createElement("a");
    a.href = resultImg;
    a.download = "deteksi-helm.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- Catat ke log dashboard ---
  const triggerLogRecord = () => {
    if (!hasResult || !resultImg) return;
    onAddLog(resultImg, helmetCount, noHelmetCount, personCount);
    setIncidentSuccessMessage(t.incidentSuccess);
    setTimeout(() => setIncidentSuccessMessage(""), 4000);
  };

  // --- Konfigurasi tampilan status server ---
  const statusConfig: Record<ServerStatus, { cls: string; dot: string; text: string }> = {
    ready:        { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", text: t.serverConnected },
    waking:       { cls: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500",   text: t.serverWaking },
    error:        { cls: "bg-red-50 text-red-700 border-red-200",             dot: "bg-red-500",     text: t.serverError },
    unconfigured: { cls: "bg-red-50 text-red-700 border-red-200",             dot: "bg-red-500",     text: t.serverUnconfigured },
  };
  const status = statusConfig[serverStatus];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Status server (NYATA dari health check backend) */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border ${status.cls}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${status.dot} ${serverStatus === "ready" || serverStatus === "waking" ? "animate-pulse" : ""}`} />
          {status.text}
        </div>
        {serverStatus === "error" && (
          <button
            onClick={() => retryWarmUp()}
            className="px-3 py-1.5 rounded-full text-xs font-bold border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
          >
            {t.serverRetry}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN: Input & Viewport (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

            {/* Input Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                onClick={() => setActiveTab("image")}
                className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === "image"
                    ? "border-[#032448] text-[#032448]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <ImageIcon size={16} />
                {t.imageTab}
              </button>
              <button
                onClick={() => setActiveTab("video")}
                className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === "video"
                    ? "border-[#032448] text-[#032448]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Video size={16} />
                {t.videoTab}
              </button>
              <button
                onClick={() => setActiveTab("examples")}
                className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === "examples"
                    ? "border-[#032448] text-[#032448]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers size={16} />
                {t.examplesTab}
              </button>
            </div>

            {/* TAB: GAMBAR */}
            {activeTab === "image" && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-[#375e9b] bg-slate-50 scale-[0.99]"
                    : "border-slate-300 hover:border-[#032448] bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                <input type="file" ref={fileInputRef} onChange={handleManualSelect} accept="image/*" className="hidden" />
                <Upload size={32} className="text-slate-400 mb-3" />
                <p className="text-sm font-semibold text-slate-700 mb-1">{t.dragDropText}</p>
                <p className="text-xs text-slate-400 mb-4">{language === "EN" ? "Supports JPG, PNG up to 10MB" : "Mendukung JPG, PNG hingga 10MB"}</p>
                <button className="bg-[#1f3a5f] hover:bg-[#032448] text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition">
                  {t.chooseFile}
                </button>
              </div>
            )}

            {/* TAB: VIDEO (upload nyata -> backend) */}
            {activeTab === "video" && (
              <div
                onClick={() => videoInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#032448] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all"
              >
                <input type="file" ref={videoInputRef} onChange={handleVideoSelect} accept="video/*" className="hidden" />
                <Video size={32} className="text-slate-400 mb-3" />
                <p className="text-sm font-semibold text-slate-700 mb-1">{t.chooseVideo}</p>
                <p className="text-xs text-slate-400 mb-4">{t.videoHint}</p>
                <button className="bg-[#1f3a5f] hover:bg-[#032448] text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition">
                  {t.chooseVideo}
                </button>
              </div>
            )}

            {/* TAB: CONTOH (gambar lokal -> backend) */}
            {activeTab === "examples" && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers size={14} />
                  {t.clickToAnalyze}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {EXAMPLE_IMAGES.map((ex) => (
                    <div
                      key={ex.id}
                      onClick={() => handleSelectExample(ex)}
                      className="cursor-pointer border border-slate-200 rounded-lg overflow-hidden bg-white hover:border-[#032448] shadow-sm hover:shadow transition relative group"
                    >
                      <img src={ex.url} alt={ex.name} className="w-full aspect-square object-cover" />
                      <div className="p-2 bg-white border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-800 block truncate">{ex.name}</span>
                      </div>
                      <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <span className="bg-white/90 text-slate-900 text-[10px] font-bold px-2 py-1 rounded">{language === "EN" ? "Detect" : "Deteksi"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* VIEWER HASIL */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-[#032448] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                {t.analysisView}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!resultImg}
                  className="p-1 px-3 text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold rounded flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download size={12} /> {t.save}
                </button>
              </div>
            </div>

            {/* Area gambar/video beranotasi */}
            <div className="relative w-full aspect-video bg-neutral-900 flex items-center justify-center overflow-hidden">
              {resultVideoUrl ? (
                <video src={resultVideoUrl} controls className="w-full h-full object-contain" />
              ) : resultImg ? (
                <img
                  src={resultImg}
                  alt={t.analysisView}
                  className={`w-full h-full object-contain transition-opacity duration-300 ${analyzing ? "opacity-30 blur-[2px]" : "opacity-100"}`}
                />
              ) : (
                <div className="text-slate-500 text-sm font-medium px-6 text-center">{t.emptyViewer}</div>
              )}

              {/* Spinner saat memproses */}
              <AnimatePresence>
                {analyzing && (
                  <div className="absolute inset-0 bg-[#032448]/40 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3" />
                    <p className="text-white text-xs font-bold tracking-widest uppercase animate-pulse">
                      {resultVideoUrl || activeTab === "video" ? t.processingVideo : "Running YOLO26s Inference..."}
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Hasil & Pengaturan (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-[#032448] pb-3 border-b border-slate-100">
                {t.detectionResults}
              </h2>
            </div>

            {/* Banner peringatan / patuh */}
            {noHelmetCount > 0 ? (
              <div className="bg-[#C44E52] text-white p-4 rounded-xl flex items-start gap-3 shadow-sm border border-[#C44E52]/30">
                <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                <div>
                  <h4 className="text-xs font-black tracking-wider uppercase mb-0.5">{t.warningTitle}</h4>
                  <p className="text-xs font-semibold leading-relaxed opacity-90">
                    {t.warningDesc(noHelmetCount)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl flex items-start gap-3 shadow-sm border border-emerald-200">
                <CheckCircle className="mt-0.5 text-emerald-600 shrink-0" size={18} />
                <div>
                  <h4 className="text-xs font-black tracking-wider uppercase text-emerald-800 mb-0.5">
                    {language === "EN" ? "COMPLIANT STATUS" : "STATUS PATUH"}
                  </h4>
                  <p className="text-xs font-semibold leading-relaxed opacity-90 text-emerald-700">
                    {t.allCompliant}
                  </p>
                </div>
              </div>
            )}

            {/* Hitungan per kelas */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.detectedClasses}</h4>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#4C72B0]" />
                  <span className="text-xs font-bold text-slate-700">{t.helmet}</span>
                </div>
                <span className="text-sm font-extrabold text-slate-700">{helmetCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#C44E52]" />
                  <span className="text-xs font-bold text-slate-700">{t.noHelmet}</span>
                </div>
                <span className={`text-sm font-extrabold ${noHelmetCount > 0 ? "text-[#C44E52]" : "text-slate-700"}`}>
                  {noHelmetCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#55A868]" />
                  <span className="text-xs font-bold text-slate-700">{t.person}</span>
                </div>
                <span className="text-sm font-extrabold text-slate-700">{personCount}</span>
              </div>
            </div>

            {/* Total / waktu inferensi (NYATA) */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t.totalDetections}</p>
                <p className="text-2xl font-black text-[#032448]">{totalDetections}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t.inferenceTime}</p>
                <p className="text-2xl font-black text-[#032448]">{timeMs != null ? `${Math.round(timeMs)}ms` : "—"}</p>
              </div>
            </div>

            {/* Slider pengaturan model */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Sliders size={14} />
                {t.modelSettings}
              </h4>

              {/* Confidence (0.05 - 0.95) */}
              <div>
                <div className="flex justify-between items-center mb-1 bg-slate-50 p-2 py-1.5 rounded-lg border border-slate-100">
                  <label className="text-[11px] font-bold text-slate-600">{t.confidenceThreshold}</label>
                  <span className="text-xs font-extrabold text-[#375e9b]">{Math.round(confidence * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  onMouseUp={rerunIfImage}
                  onTouchEnd={rerunIfImage}
                  onKeyUp={rerunIfImage}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#032448]"
                />
              </div>

              {/* IoU (0.1 - 0.9) */}
              <div>
                <div className="flex justify-between items-center mb-1 bg-slate-50 p-2 py-1.5 rounded-lg border border-slate-100">
                  <label className="text-[11px] font-bold text-slate-600">{t.iouThreshold}</label>
                  <span className="text-xs font-extrabold text-[#375e9b]">{Math.round(iou * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={iou}
                  onChange={(e) => setIou(parseFloat(e.target.value))}
                  onMouseUp={rerunIfImage}
                  onTouchEnd={rerunIfImage}
                  onKeyUp={rerunIfImage}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#032448]"
                />
              </div>
            </div>

            {/* Tombol catat insiden + umpan balik */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              <button
                onClick={triggerLogRecord}
                disabled={!hasResult}
                className="w-full bg-[#032448] hover:bg-[#1f3a5f] text-white py-3 px-4 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t.logIncidentReport}
              </button>

              <AnimatePresence>
                {incidentSuccessMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs text-center font-semibold rounded-lg"
                  >
                    {incidentSuccessMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
