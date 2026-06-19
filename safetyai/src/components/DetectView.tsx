import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { 
  Upload, Image as ImageIcon, Video, Layers, 
  Trash2, ShieldAlert, CheckCircle, Cpu, Sliders, 
  Download, Share2, AlertTriangle, Play 
} from "lucide-react";
import { Language, Detection } from "../types";
import { translations } from "../translations";
import { EXAMPLE_IMAGES, ExampleImage } from "../data";
import { motion, AnimatePresence } from "motion/react";

interface DetectViewProps {
  language: Language;
  onAddLog: (newImgUrl: string, helmet: number, noHelmet: number, person: number) => void;
}

export default function DetectView({ language, onAddLog }: DetectViewProps) {
  const t = translations[language];

  // Selected image asset or uploaded file
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(EXAMPLE_IMAGES[0].url);
  const [currentDetections, setCurrentDetections] = useState<Detection[]>(EXAMPLE_IMAGES[0].detections);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0.25);
  const [iou, setIou] = useState<number>(0.45);
  const [activeTab, setActiveTab] = useState<"image" | "video" | "examples">("image");
  const [incidentSuccessMessage, setIncidentSuccessMessage] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter detections based on current confidence threshold
  const filteredDetections = currentDetections.filter(
    (det) => det.confidence >= confidence
  );

  // Compute stats
  const helmetCount = filteredDetections.filter((d) => d.className === "Helmet").length;
  const noHelmetCount = filteredDetections.filter((d) => d.className === "No-Helmet").length;
  const personCount = filteredDetections.filter((d) => d.className === "Person").length;
  const totalDetections = filteredDetections.length;

  const handleSelectExample = (ex: ExampleImage) => {
    setAnalyzing(true);
    setIncidentSuccessMessage("");
    setCurrentImageUrl(ex.url);
    setCurrentDetections(ex.detections);
    
    // Simulate minor lag for visual satisfaction
    setTimeout(() => {
      setAnalyzing(false);
    }, 600);
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleManualSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Convert uploaded image and run mock AI analyzer
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert(language === "EN" ? "Please upload an image file." : "Silakan unggah berkas gambar.");
      return;
    }

    setAnalyzing(true);
    setIncidentSuccessMessage("");

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCurrentImageUrl(result);
      
      // Simulate object detection on uploaded custom image:
      // We randomly place 1-2 Persons, 0-2 Helmets, and 0-1 No-Helmets inside the box coordinates
      const mockDetections: Detection[] = [
        {
          id: "uploaded-det-1",
          className: "Person",
          confidence: 0.94,
          bbox: [20, 25, 20, 50]
        },
        {
          id: "uploaded-det-2",
          className: "Helmet",
          confidence: 0.89,
          bbox: [16, 27, 16, 15]
        }
      ];

      // Occasional safety violations on uploaded samples
      if (Math.random() > 0.4) {
        mockDetections.push({
          id: "uploaded-det-3",
          className: "No-Helmet",
          confidence: 0.82,
          bbox: [45, 65, 12, 18]
        });
        mockDetections.push({
          id: "uploaded-det-4",
          className: "Person",
          confidence: 0.91,
          bbox: [40, 60, 22, 45]
        });
      }

      setCurrentDetections(mockDetections);

      setTimeout(() => {
        setAnalyzing(false);
      }, 900);
    };
    reader.readAsDataURL(file);
  };

  const triggerLogRecord = () => {
    onAddLog(currentImageUrl, helmetCount, noHelmetCount, personCount);
    setIncidentSuccessMessage(t.incidentSuccess);
    setTimeout(() => {
      setIncidentSuccessMessage("");
    }, 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Banner indicating Operational Status */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-semibold border border-emerald-200">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          {t.serverConnected}
        </div>
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
                onClick={() => {
                  setActiveTab("video");
                  // Auto load sample video screen
                  alert(language === "EN" ? "Live RTSP streaming stream is restricted inside preview container." : "Saluran aliran kamera RTSP langsung dibatasi dalam wadah pratinjau.");
                }}
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

            {/* TAB VIEWPORTS */}
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
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleManualSelect} 
                  accept="image/*" 
                  className="hidden" 
                />
                <Upload size={32} className="text-slate-400 mb-3" />
                <p className="text-sm font-semibold text-slate-700 mb-1">{t.dragDropText}</p>
                <p className="text-xs text-slate-400 mb-4">{language === "EN" ? "Supports JPG, PNG up to 10MB" : "Mendukung JPG, PNG hingga 10MB"}</p>
                <button className="bg-[#1f3a5f] hover:bg-[#032448] text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition">
                  {t.chooseFile}
                </button>
              </div>
            )}

            {activeTab === "video" && (
              <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 animate-pulse">
                  <Video size={28} />
                </div>
                <h4 className="text-slate-800 font-bold mb-1">{language === "EN" ? "RTSP Connection Required" : "Koneksi RTSP Diperlukan"}</h4>
                <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                  {language === "EN" 
                    ? "Please specify local RTSP safety cameras on your .env configuration. Simulating background camera instead for client feed."
                    : "Silakan tentukan kamera keselamatan RTSP lokal pada konfigurasi eksternal .env Anda. Mensimulasikan kamera statis sebagai gantinya."}
                </p>
                <div className="bg-slate-900 text-[#55A868] p-3 rounded font-mono text-xs text-left w-full max-w-md border border-slate-700 leading-normal">
                  $ rtsp://192.168.1.104:554/h264 <span className="text-slate-500"># Connecting...</span><br />
                  $ [YOLO26s] Feed running at 30fps. Latency: 12ms.
                </div>
              </div>
            )}

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
                      <img src={ex.url} alt={ex.name} className="w-full aspect-square object-cover" referrerPolicy="no-referrer" />
                      <div className="p-2 bg-white border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-800 block truncate">{ex.name}</span>
                        <span className="text-[9px] text-[#375e9b] font-medium">{ex.detections.length} total classes</span>
                      </div>
                      <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <span className="bg-white/90 text-slate-900 text-[10px] font-bold px-2 py-1 rounded">Select</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC VIEWPORT VIEWER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
            <div className="p-4 bg-slate-50 border-b border-slate-250 flex justify-between items-center">
              <span className="text-sm font-bold text-[#032448] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                {t.analysisView}
              </span>
              <div className="flex gap-2">
                <button className="p-1 px-3 text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold rounded flex items-center gap-1.5 transition">
                  <Download size={12} /> {t.save}
                </button>
                <button className="p-1 px-3 text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold rounded flex items-center gap-1.5 transition">
                  <Share2 size={12} /> {t.share}
                </button>
              </div>
            </div>

            {/* Simulated Bounding Box View Area */}
            <div className="relative w-full aspect-video bg-neutral-900 flex items-center justify-center overflow-hidden">
              <img 
                src={currentImageUrl}
                alt={t.analysisView}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover transition-opacity duration-300 ${analyzing ? "opacity-30 blur-[2px]" : "opacity-95"}`}
              />

              {/* BOUNDING BOXES OVERLAY */}
              {!analyzing && (
                <div className="absolute inset-0 pointer-events-none select-none">
                  {filteredDetections.map((det) => {
                    const [top, left, width, height] = det.bbox;
                    const borderColors = {
                      "Helmet": "border-[#4C72B0]",
                      "No-Helmet": "border-[#C44E52]",
                      "Person": "border-[#55A868]"
                    };
                    const bgColors = {
                      "Helmet": "bg-[#4C72B0]/10",
                      "No-Helmet": "bg-[#C44E52]/10",
                      "Person": "bg-[#55A868]/5"
                    };
                    const badgeColors = {
                      "Helmet": "bg-[#4C72B0]",
                      "No-Helmet": "bg-[#C44E52]",
                      "Person": "bg-[#55A868]"
                    };

                    return (
                      <div 
                        key={det.id}
                        style={{
                          top: `${top}%`,
                          left: `${left}%`,
                          width: `${width}%`,
                          height: `${height}%`
                        }}
                        className={`absolute border-2 ${borderColors[det.className]} ${bgColors[det.className]} rounded-sm transition-all`}
                      >
                        <span className={`absolute -top-6 left-0 ${badgeColors[det.className]} text-white text-[9px] font-bold px-1 py-0.5 rounded-t shadow-sm whitespace-nowrap`}>
                          {language === "EN" ? det.className : (det.className === "Helmet" ? "Helm" : det.className === "No-Helmet" ? "Tanpa Helm" : "Orang")} {Math.round(det.confidence * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Spinner Overlay */}
              <AnimatePresence>
                {analyzing && (
                  <div className="absolute inset-0 bg-[#032448]/40 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3" />
                    <p className="text-white text-xs font-bold tracking-widest uppercase animate-pulse">Running YOLO26s Inference...</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Results & Settings Panel (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-[#032448] pb-3 border-b border-slate-100">
                {t.detectionResults}
              </h2>
            </div>

            {/* Warning Banner / Complete Compliant Banner */}
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
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl flex items-start gap-3 shadow-sm border border-emerald-250">
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

            {/* Dynamic Class Counter List */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.detectedClasses}</h4>
              
              {/* Helmet */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#4C72B0]" />
                  <span className="text-xs font-bold text-slate-700">{t.helmet}</span>
                </div>
                <span className="text-sm font-extrabold text-slate-700">{helmetCount}</span>
              </div>

              {/* No-Helmet */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#C44E52]" />
                  <span className="text-xs font-bold text-slate-700">{t.noHelmet}</span>
                </div>
                <span className={`text-sm font-extrabold ${noHelmetCount > 0 ? "text-[#C44E52]" : "text-slate-700"}`}>
                  {noHelmetCount}
                </span>
              </div>

              {/* Person */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#55A868]" />
                  <span className="text-xs font-bold text-slate-700">{t.person}</span>
                </div>
                <span className="text-sm font-extrabold text-slate-700">{personCount}</span>
              </div>
            </div>

            {/* Total / Metadata */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t.totalDetections}</p>
                <p className="text-2xl font-black text-[#032448]">{totalDetections}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t.inferenceTime}</p>
                <p className="text-2xl font-black text-[#032448]">{totalDetections > 0 ? 42 : 0}ms</p>
              </div>
            </div>

            {/* Slider Settings */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Sliders size={14} />
                {t.modelSettings}
              </h4>

              {/* Confidence */}
              <div>
                <div className="flex justify-between items-center mb-1 bg-slate-50 p-2 py-1.5 rounded-lg border border-slate-100">
                  <label className="text-[11px] font-bold text-slate-600">{t.confidenceThreshold}</label>
                  <span className="text-xs font-extrabold text-[#375e9b]">{Math.round(confidence * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#032448]"
                />
              </div>

              {/* IoU */}
              <div>
                <div className="flex justify-between items-center mb-1 bg-slate-50 p-2 py-1.5 rounded-lg border border-slate-100">
                  <label className="text-[11px] font-bold text-slate-600">{t.iouThreshold}</label>
                  <span className="text-xs font-extrabold text-[#375e9b]">{Math.round(iou * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={iou}
                  onChange={(e) => setIou(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#032448]"
                />
              </div>
            </div>

            {/* Log Incident Button & Success Feedback */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              <button 
                onClick={triggerLogRecord}
                className="w-full bg-[#032448] hover:bg-[#1f3a5f] text-white py-3 px-4 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
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
