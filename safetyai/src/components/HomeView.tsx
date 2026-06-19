import React from "react";
import { Shield, ArrowRight, Play, Server, Activity, Users, Video } from "lucide-react";
import { Language } from "../types";
import { translations } from "../translations";
import { motion } from "motion/react";

interface HomeViewProps {
  language: Language;
  onNavigate: (tab: string) => void;
}

export default function HomeView({ language, onNavigate }: HomeViewProps) {
  const t = translations[language];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-16">
      {/* Subtle background accent */}
      <div className="relative text-center mb-12">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 mb-6 shadow-sm"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          {t.systemOperational}
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#032448] tracking-tight mb-6"
        >
          {t.precisionSafety} <br />
          <span className="text-[#375e9b]">{t.aiOversight}</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          {t.heroDesc}
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto"
        >
          <button 
            onClick={() => onNavigate("detect")}
            className="w-full sm:w-auto h-13 bg-[#032448] hover:bg-[#1f3a5f] text-white px-8 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            {t.startDetection}
            <ArrowRight size={18} />
          </button>
          
          <button 
            onClick={() => onNavigate("dashboard")}
            className="w-full sm:w-auto h-13 bg-white hover:bg-slate-50 text-slate-800 px-8 rounded-xl font-semibold border-2 border-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {t.viewDemoDashboard}
          </button>
        </motion.div>
      </div>

      {/* Hero Live Preview Feature Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-16 border border-slate-200 rounded-2xl overflow-hidden shadow-lg bg-slate-50 relative aspect-video max-w-4xl mx-auto group cursor-pointer"
        onClick={() => onNavigate("detect")}
      >
        <img 
          className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-102" 
          referrerPolicy="no-referrer"
          alt="Safety AI Live Feed Preview"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYOPZZR7ykTdAbrSEcqxrIPLkVDWXZbEny_Tt1-kUB-8ZixPTHbmNFaV0vWX32515RCQeTeU9gaKOweOeyXAMToLqdXMG_ZMgXU7CFTuCSeL8dBq9w_jS5w9ZO4oj-ws2TQ-kBiLtc5tHadFUwDkzPfkwYNCbNpcqShyw4M7Pqr4VA7mSkWPAq4aPXp7E7V-xFicGi5Qi5SWO34h48yrMODirATCwHAUgsZftkHLSaFfFaVK5Dia65xDic0i-TrIcE1zJ7cLQI4T4"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-6 flex justify-between items-end">
          <div className="text-white">
            <span className="text-xs font-semibold tracking-wider uppercase opacity-80 mb-1 block">YOLO26s Core Inference</span>
            <h4 className="text-lg md:text-xl font-bold">Active Live Stream - Zone A Gateway</h4>
          </div>
          <span className="text-white text-xs bg-[#032448]/80 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium border border-white/20">
            <Video size={14} className="animate-pulse text-red-400" />
            {t.liveFeedAnalysis}
          </span>
        </div>
      </motion.div>

      {/* Feature Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 bg-blue-50 text-[#032448] rounded-xl flex items-center justify-center mb-4 border border-blue-100">
            <Shield size={24} />
          </div>
          <h3 className="text-lg font-bold text-[#032448] mb-2">{language === "EN" ? "Industrial Compliance Audit" : "Audit Kepatuhan Industri"}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {language === "EN" 
              ? "Automated tracking for hardhats and PPE requirements continuously running over secure internal camera nodes."
              : "Pelacakan otomatis untuk kebutuhan helm keselamatan dan APD yang terus berjalan di atas simpul kamera internal yang aman."}
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 border border-amber-100">
            <Activity size={24} />
          </div>
          <h3 className="text-lg font-bold text-[#032448] mb-2">{language === "EN" ? "Dual-Language Telemetry" : "Telemetri Dua Bahasa"}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {language === "EN"
              ? "Instantly switch whole dashboard metrics, threshold boundaries, and PDF logs from English to Bahasa Indonesia."
              : "Beralih metrik dasbor, batas ambang, dan log PDF secara instan dari Bahasa Inggris ke Bahasa Indonesia."}
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 border border-emerald-100">
            <Users size={24} />
          </div>
          <h3 className="text-lg font-bold text-[#032448] mb-2">{language === "EN" ? "Low-Latency Analysis" : "Analisis Latensi Rendah"}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {language === "EN"
              ? "Optimized inference yields deep insights under ~45ms, maximizing on-site responsiveness and incident logging."
              : "Inferensi yang dioptimalkan menghasilkan wawasan mendalam di bawah ~45ms, memaksimalkan responsivitas lokal."}
          </p>
        </div>
      </div>
    </div>
  );
}
