import React from "react";
import { Cpu, Scale, HelpCircle, HardDrive, ShieldCheck, FileText, Bookmark } from "lucide-react";
import { Language } from "../types";
import { translations } from "../translations";
import { motion } from "motion/react";

interface AboutViewProps {
  language: Language;
}

export default function AboutView({ language }: AboutViewProps) {
  const t = translations[language];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-[#032448] tracking-tight mb-2">
          {t.aboutDetails}
        </h2>
        <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
          {t.aboutDesc}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Model Architecture Card */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:shadow-md transition">
          {/* Subtle decoration */}
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-110 transition duration-500" />
          
          <h3 className="text-md font-bold text-[#032448] mb-6 pb-3 border-b border-slate-100 flex items-center gap-2 relative z-10">
            <Cpu className="text-[#375e9b]" size={18} />
            {t.architecture}
          </h3>

          <div className="space-y-6 relative z-10 flex-grow">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.coreModel}</div>
              <div className="text-base font-extrabold text-[#032448]">YOLO26s</div>
              <p className="text-xs text-slate-500 mt-1">
                {language === "EN"
                  ? "Anchor-free single-stage real-time object detector, trained to detect helmets/PPE on construction sites."
                  : "Detektor objek real-time satu tahap (anchor-free), dilatih untuk mendeteksi helm/APD di lokasi konstruksi."}
              </p>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.inferenceResolution}</div>
              <div className="text-base font-extrabold text-slate-700">640x640 px</div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.trainingDataset}</div>
              <div className="text-base font-extrabold text-slate-700">Roboflow Construction Safety</div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 border border-blue-105 text-[10px] text-[#375e9b] font-bold">
                <Bookmark size={10} />
                {t.license}: CC BY 4.0
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics Bento Widgets (2x2 grid inside remaining 2 cols) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Precision Meter Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="text-center">
              <span className="text-4xl font-black text-[#032448] tracking-tight block mb-1">84.7%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.precision}</span>
            </div>
            
            {/* Custom linear progressive scale indicator */}
            <div className="w-full bg-slate-100 h-2 mt-6 rounded-full overflow-hidden">
              <div className="bg-[#032448] h-full rounded-full transition-all duration-1000" style={{ width: "84.7%" }} />
            </div>
          </div>

          {/* Recall Meter Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition col-span-1">
            <div className="text-center">
              <span className="text-4xl font-black text-[#032448] tracking-tight block mb-1">70.8%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.recall}</span>
            </div>
            
            <div className="w-full bg-slate-100 h-2 mt-6 rounded-full overflow-hidden">
              <div className="bg-[#032448] h-full rounded-full transition-all duration-1000" style={{ width: "70.8%" }} />
            </div>
          </div>

          {/* mAP@50 Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center hover:shadow-md transition">
            <span className="text-3xl font-black text-[#032448] tracking-tight block mb-1">78.6%</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">mAP@50</span>
          </div>

          {/* mAP@50-95 Card */}
          <div className="bg-slate-55 rounded-2xl p-6 border border-slate-200 bg-slate-50 shadow-sm flex flex-col justify-center items-center text-center hover:shadow-md transition">
            <span className="text-3xl font-black text-[#375e9b] tracking-tight block mb-1">50.8%</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">mAP@50-95</span>
          </div>
        </div>
      </div>

      {/* Catatan sumber metrik */}
      <p className="text-[11px] text-slate-400 mb-4 text-center">
        {language === "EN"
          ? "Metrics measured on the validation set (best.pt, imgsz 640). Test set: mAP@50 64.8%, mAP@50-95 40.5%."
          : "Metrik diukur pada set validasi (best.pt, imgsz 640). Set uji: mAP@50 64,8%, mAP@50-95 40,5%."}
      </p>

      {/* Verified Status Banner */}
      <div className="bg-[#1f3a5f] text-white rounded-xl p-5 text-center border border-slate-800 shadow-sm flex items-center justify-center gap-3">
        <ShieldCheck className="text-emerald-400 shrink-0" size={22} />
        <span className="text-sm font-semibold">{t.builtWith}</span>
      </div>
    </div>
  );
}
