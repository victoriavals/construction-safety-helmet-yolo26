import React, { useState, useMemo } from "react";
import { Search, Filter, ArrowRight, ShieldAlert, CheckCircle, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { Language, DetectionLog } from "../types";
import { translations } from "../translations";
import { CHART_DATA } from "../data";
import { motion, AnimatePresence } from "motion/react";

interface DashboardViewProps {
  language: Language;
  logs: DetectionLog[];
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ language, logs, onNavigate }: DashboardViewProps) {
  const t = translations[language];

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>("");
  // Filters active status
  const [statusFilter, setStatusFilter] = useState<"All" | "Violation" | "Compliant">("All");
  const [showFiltersMenu, setShowFiltersMenu] = useState<boolean>(false);

  // Compute stats on current logs
  const totalScansVal = useMemo(() => {
    return 1240 + (logs.length - 4); // base 1240 adjust dynamically
  }, [logs]);

  const totalViolationsVal = useMemo(() => {
    // base 142 adjust dynamically
    const additionalViolations = logs.filter(l => l.status === "Violation").length - 3;
    return 142 + Math.max(0, additionalViolations);
  }, [logs]);

  const complianceRateVal = useMemo(() => {
    const totalComplyLogs = logs.filter(l => l.status === "Compliant").length;
    const pct = (totalComplyLogs / logs.length) * 100;
    // Blend with initial 88.5%
    return ((88.5 + pct) / 2).toFixed(1);
  }, [logs]);

  // Handle Search & Filter logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch = 
        log.dateTime.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.snapshotAlt.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === "All" ? true : log.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [logs, searchTerm, statusFilter]);

  // Export CSV simulation
  const triggerExportCSV = () => {
    const headers = "Log ID,DateTime,Helmet Count,No-Helmet Count,Person Count,Status\n";
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers 
      + logs.map(e => `${e.id},"${e.dateTime}",${e.helmetCount},${e.noHelmetCount},${e.personCount},${e.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SafetyAI_Telemetry_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Dashboard Sub Header and Search Control Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#032448] tracking-tight">{language === "EN" ? "System Dashboard" : "Dasbor Sistem"}</h1>
          <p className="text-sm text-slate-500 mt-1">{language === "EN" ? "Real-time inference and historical violation metrics." : "Metrik inferensi real-time dan riwayat metrik pelanggaran."}</p>
          <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
            <AlertTriangle size={11} className="shrink-0" />
            {t.demoDataNotice}
          </span>
        </div>
        
        {/* Search & Actions block */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" size={16} />
            <input 
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#4C72B0] focus:outline-none placeholder-slate-400 shadow-sm transition"
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowFiltersMenu(!showFiltersMenu)}
              className={`bg-white border text-xs font-bold rounded-xl px-4 py-2 flex items-center gap-2 hover:bg-slate-50 shadow-sm transition h-9 shrink-0 ${
                statusFilter !== "All" ? "border-[#375e9b] text-[#375e9b]" : "border-slate-200 text-slate-700"
              }`}
            >
              <Filter size={14} />
              <span>{t.filters} {statusFilter !== "All" ? `(${statusFilter})` : ""}</span>
            </button>

            {/* Dropdown Menu */}
            {showFiltersMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-2">
                <button 
                  onClick={() => { setStatusFilter("All"); setShowFiltersMenu(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 ${statusFilter === "All" ? "text-[#032448] font-bold" : "text-slate-600"}`}
                >
                  {language === "EN" ? "All Logs" : "Semua Log"}
                </button>
                <button 
                  onClick={() => { setStatusFilter("Violation"); setShowFiltersMenu(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 ${statusFilter === "Violation" ? "text-[#C44E52] font-bold" : "text-slate-600"}`}
                >
                  ⚠️ {t.violation}
                </button>
                <button 
                  onClick={() => { setStatusFilter("Compliant"); setShowFiltersMenu(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 ${statusFilter === "Compliant" ? "text-[#55A868] font-bold" : "text-slate-600"}`}
                >
                  ✓ {t.compliant}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Scans */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.totalScans}</span>
          <span className="text-4xl font-extrabold text-[#032448] tracking-tight">{totalScansVal.toLocaleString()}</span>
        </div>

        {/* Compliance Rate */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.complianceRate}</span>
          <span className="text-4xl font-extrabold text-[#55A868] tracking-tight">{complianceRateVal}%</span>
        </div>

        {/* Total Violations */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.totalViolations}</span>
          <span className="text-4xl font-extrabold text-[#C44E52] tracking-tight">{totalViolationsVal}</span>
        </div>

        {/* Inference Time */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.avgInferenceTime}</span>
          <span className="text-4xl font-extrabold text-[#032448] tracking-tight">42ms</span>
        </div>
      </div>

      {/* Dual Row Layout: Class Distribution Donut Chart & trends chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Class Distribution Donut Panel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition">
          <h3 className="text-md font-bold text-[#032448] pb-3 border-b border-slate-100 mb-6">
            {t.classDistribution}
          </h3>

          <div className="flex-grow flex items-center justify-center relative min-h-[180px]">
            {/* Beautiful Custom SVG Donut Chart matching the specific 3-class distribution */}
            <svg width="180" height="180" viewBox="0 0 42 42" className="transform -rotate-90">
              {/* Base grey background circle */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1edf1" strokeWidth="4" />
              
              {/* Helmet: stroke-dasharray="[length of line] [gap length]" */}
              {/* 50% blue */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#4C72B0" strokeWidth="4" 
                      strokeDasharray="50 50" strokeDashoffset="0" />
              
              {/* No-Helmet: 12% red */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#C44E52" strokeWidth="4" 
                      strokeDasharray="12 88" strokeDashoffset="-50" />
              
              {/* Person: 38% green */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#55A868" strokeWidth="4" 
                      strokeDasharray="38 62" strokeDashoffset="-62" />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-[#032448]">3</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t.classes}</span>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <span className="w-3.5 h-3.5 rounded-full bg-[#4C72B0]" />
              <span>{t.helmet}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <span className="w-3.5 h-3.5 rounded-full bg-[#C44E52]" />
              <span>{t.noHelmet}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <span className="w-3.5 h-3.5 rounded-full bg-[#55A868]" />
              <span>{t.person}</span>
            </div>
          </div>
        </div>

        {/* Violation Trends Panel (Dynamic columnar visualization) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2 flex flex-col hover:shadow-md transition">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-6">
            <h3 className="text-md font-bold text-[#032448]">{t.violationTrends}</h3>
            <button 
              onClick={triggerExportCSV}
              className="text-xs font-bold text-[#375e9b] hover:underline flex items-center gap-1"
            >
              <FileSpreadsheet size={14} />
              {t.exportCsv}
            </button>
          </div>

          {/* Graphical timeline */}
          <div className="flex-grow flex items-end gap-3 md:gap-5 pt-8 min-h-[220px] relative">
            
            {/* Background horizontal guiding lines */}
            <div className="absolute inset-x-0 bottom-6 h-[1px] bg-slate-100" />
            <div className="absolute inset-x-0 bottom-20 h-[1px] bg-slate-100" />
            <div className="absolute inset-x-0 bottom-36 h-[1px] bg-slate-100" />
            <div className="absolute inset-x-0 bottom-52 h-[1px] bg-slate-100" />

            {CHART_DATA.map((pt, index) => {
              // Wed is Wednesday highlighted peek as specified in layout
              const barHeightPct = pt.day === "Wed" ? 90 : 25 + Math.round((pt.violations / 50) * 60);
              const isWed = pt.day === "Wed";

              return (
                <div key={pt.day} className="flex-1 flex flex-col justify-end items-center group relative cursor-pointer z-10">
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] font-bold rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition shadow-lg pointer-events-none whitespace-nowrap">
                    {pt.violations} {t.totalViolations.toLowerCase()}
                  </div>

                  {/* Highlight color on wed (red peak) vs normal blue compliant color */}
                  <div 
                    style={{ height: `${barHeightPct}%` }}
                    className={`w-full rounded-t-lg transition-all duration-500 shadow-sm ${
                      isWed 
                        ? "bg-[#C44E52]/40 group-hover:bg-[#C44E52]/60 border-t-3 border-[#C44E52]" 
                        : "bg-[#4C72B0]/20 group-hover:bg-[#4C72B0]/40 border-t-2 border-[#4C72B0]/30"
                    }`}
                  />

                  <span className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-wider">
                    {pt.day === "Thu: Kamis" ? (language === "EN" ? "Thu" : "Kam") : pt.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Table: Recent Detections */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-md font-bold text-[#032448]">{t.recentDetections}</h3>
          
          <button 
            onClick={() => onNavigate("detect")} 
            className="text-xs font-bold text-[#375e9b] flex items-center gap-1 hover:underline"
          >
            {t.viewAll}
            <ArrowRight size={14} className="mt-0.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/50">
                <th className="p-4 pl-6 w-28">{t.snapshot}</th>
                <th className="p-4">{t.dateTime}</th>
                <th className="p-4 text-center">#Helmet</th>
                <th className="p-4 text-center">#No-Helmet</th>
                <th className="p-4 text-center">#Person</th>
                <th className="p-4 pr-6 text-center">{t.status}</th>
              </tr>
            </thead>
            
            <tbody className="text-xs">
              <AnimatePresence>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const hasViolation = log.status === "Violation" || log.noHelmetCount > 0;
                    return (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={log.id} 
                        className="border-b border-slate-200/50 hover:bg-slate-50/50 transition-colors"
                      >
                        {/* Interactive Snapshot Viewport */}
                        <td className="p-4 pl-6">
                          <div 
                            onClick={() => onNavigate("detect")}
                            className="w-16 h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-[#032448] transition group shadow-sm shrink-0"
                          >
                            <img 
                              className="w-full h-full object-cover transition duration-300 group-hover:scale-105" 
                              src={log.snapshotUrl} 
                              alt={log.snapshotAlt} 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </td>

                        {/* Date Time */}
                        <td className="p-4 font-bold text-slate-700">
                          {log.dateTime}
                          <span className="block text-[9px] text-slate-400 font-normal uppercase tracking-wider mt-0.5">{log.id}</span>
                        </td>

                        {/* Counts */}
                        <td className="p-4 text-center font-extrabold text-slate-600">{log.helmetCount}</td>
                        <td className="p-4 text-center font-extrabold text-[#C44E52]">{log.noHelmetCount}</td>
                        <td className="p-4 text-center font-extrabold text-slate-600">{log.personCount}</td>

                        {/* Status alert pill */}
                        <td className="p-4 pr-6 text-center">
                          {hasViolation ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-[#C44E52] border border-red-200 text-[10px] font-bold">
                              <ShieldAlert size={12} className="shrink-0" />
                              {t.violation}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-250 text-[10px] font-bold">
                              <CheckCircle size={12} className="shrink-0" />
                              {t.compliant}
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-semibold">
                      {language === "EN" ? "No logs match your search queries." : "Tidak ada log yang cocok dengan kueri penelusuran Anda."}
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
