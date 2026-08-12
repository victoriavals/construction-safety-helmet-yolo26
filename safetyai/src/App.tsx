/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Shield, Menu, X, User, Globe, AlertCircle, Info, Home as HomeIcon, Eye, LayoutDashboard } from "lucide-react";
import { SAMPLE_LOGS, ExampleImage } from "./data";
import { Language, DetectionLog } from "./types";
import { translations } from "./translations";
import { warmUpBackend } from "./api";

import HomeView from "./components/HomeView";
import DetectView from "./components/DetectView";
import DashboardView from "./components/DashboardView";
import AboutView from "./components/AboutView";

import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Toggle Language status (defaults to ID to match user instructions immediately!)
  const [language, setLanguage] = useState<Language>("ID");
  // Toggle Selected view tab (matched dashboard screenshot which lists system dashboard selected)
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  // Logs state populated from SAMPLE_LOGS
  const [logs, setLogs] = useState<DetectionLog[]>(SAMPLE_LOGS);
  // Mobile responsive navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Bangunkan backend SEGERA saat app dibuka. Hugging Face Space gratis tidur
  // setelah ~48 jam menganggur; memicu warm-up di sini membuat Space menghangat
  // sambil pengunjung membaca Home, sehingga tab Deteksi tidak perlu menunggu.
  useEffect(() => {
    warmUpBackend();
  }, []);

  // Quick helper to insert new logs from Detect Screen
  const handleAddNewLog = (newImgUrl: string, helmet: number, noHelmet: number, person: number) => {
    const formattedDate = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).replace(/,/g, "");

    const newLog: DetectionLog = {
      id: `LOG-${1000 + logs.length + 1}`,
      snapshotUrl: newImgUrl,
      snapshotAlt: "User-uploaded audit frame",
      dateTime: formattedDate,
      helmetCount: helmet,
      noHelmetCount: noHelmet,
      personCount: person,
      status: noHelmet > 0 ? "Violation" : "Compliant"
    };

    setLogs([newLog, ...logs]);
  };

  const t = translations[language];

  return (
    <div className="bg-[#faf9fc] text-[#1a1c1e] min-h-screen flex flex-col font-sans selection:bg-[#97bcff] selection:text-[#001c3b]">
      
      {/* PERSISTENT TOP NAVIGATION BAR */}
      <header className="fixed top-0 left-0 w-full z-50 h-16 bg-white border-b border-slate-200 shadow-sm flex justify-between items-center px-4 md:px-8">
        
        {/* Left Side: Brand & Tabs List */}
        <div className="flex items-center gap-8">
          
          {/* Logo Brand */}
          <div 
            onClick={() => { setActiveTab("home"); setIsMobileMenuOpen(false); }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <Shield className="text-[#032448] fill-[#032448]/10 group-hover:scale-105 transition duration-300" size={24} />
            <span className="text-xl font-black text-[#032448] tracking-tight">{t.brandName}</span>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1.5">
            {[
              { id: "home", label: t.home, icon: HomeIcon },
              { id: "detect", label: t.detect, icon: Eye },
              { id: "dashboard", label: t.dashboard, icon: LayoutDashboard },
              { id: "about", label: t.about, icon: Info }
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl transition duration-200 flex items-center gap-1.5 ${
                    isSelected 
                      ? "bg-[#032448]/10 text-[#032448]" 
                      : "text-slate-500 hover:text-[#032448] hover:bg-slate-100"
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Side Tools: EN/ID segmented toggle and User Avatar Profile icon */}
        <div className="flex items-center gap-4">
          
          {/* Bilingual controls segment toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setLanguage("EN")}
              className={`p-1 px-2.5 text-[10px] font-extrabold rounded-lg transition-all ${
                language === "EN" 
                  ? "bg-white text-[#032448] shadow-sm" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage("ID")}
              className={`p-1 px-2.5 text-[10px] font-extrabold rounded-lg transition-all ${
                language === "ID" 
                  ? "bg-white text-[#032448] shadow-sm" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ID
            </button>
          </div>

          {/* User account avatar button */}
          <button className="text-slate-500 hover:text-[#032448] p-1.5 rounded-full hover:bg-slate-100 transition duration-200">
            <User size={20} />
          </button>

          {/* Mobile responsive toggle button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-[#032448] hover:bg-slate-100 p-1.5 rounded-full transition duration-200"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER/MENU OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-16 left-0 w-full bg-white border-b border-slate-200 shadow-lg z-40 md:hidden overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-2">
              {[
                { id: "home", label: t.home, icon: HomeIcon },
                { id: "detect", label: t.detect, icon: Eye },
                { id: "dashboard", label: t.dashboard, icon: LayoutDashboard },
                { id: "about", label: t.about, icon: Info }
              ].map((tab) => {
                const isSelected = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left py-3 px-4 text-xs font-bold rounded-xl flex items-center gap-2 ${
                      isSelected 
                        ? "bg-[#032448]/15 text-[#032448]" 
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETECTORS CONTENT BODY WRAPPER */}
      <main className="flex-grow pt-20 pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "home" && (
              <HomeView language={language} onNavigate={setActiveTab} />
            )}
            
            {activeTab === "detect" && (
              <DetectView language={language} onAddLog={handleAddNewLog} />
            )}

            {activeTab === "dashboard" && (
              <DashboardView language={language} logs={logs} onNavigate={setActiveTab} />
            )}

            {activeTab === "about" && (
              <AboutView language={language} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* SYSTEM PERSISTENT INDUSTRIAL FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-2">
            <Shield className="text-[#032448] fill-[#032448]/10" size={18} />
            <span className="text-sm font-black text-[#032448] tracking-tight">{t.brandName}</span>
          </div>

          <p className="text-xs text-slate-400 text-center md:text-left">
            {t.footerCopyright}
          </p>

          <div className="flex gap-4 text-xs">
            <a href="#" className="text-slate-400 hover:text-[#032448] font-bold transition">
              {t.documentation}
            </a>
            <a href="#" className="text-slate-400 hover:text-[#032448] font-bold transition">
              {t.privacyPolicy}
            </a>
            <a href="#" className="text-slate-400 hover:text-[#032448] font-bold transition">
              {t.termsOfService}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
