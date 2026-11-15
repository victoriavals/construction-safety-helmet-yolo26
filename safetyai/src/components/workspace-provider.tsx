"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig } from "motion/react";
import { Toaster, toast } from "sonner";
import {
  warmUpBackend,
  subscribeBackendStatus,
  type BackendStatus,
} from "@/api";
import type { Language, ScanLog } from "@/lib/model";

const LOG_KEY = "safetyai.scans.v2";
const LANG_KEY = "safetyai.language.v1";
interface Workspace {
  language: Language;
  setLanguage: (value: Language) => void;
  logs: ScanLog[];
  hydrated: boolean;
  backendStatus: BackendStatus;
  saveLog: (log: ScanLog) => boolean;
  clearLogs: () => void;
  text: (id: string, en: string) => string;
}
const Context = createContext<Workspace | null>(null);
const validLog = (value: unknown): value is ScanLog => {
  if (!value || typeof value !== "object") return false;
  const l = value as ScanLog;
  return (
    typeof l.id === "string" &&
    typeof l.filename === "string" &&
    typeof l.createdAt === "string" &&
    Number.isFinite(Date.parse(l.createdAt)) &&
    [l.helmet, l.noHelmet, l.person].every(
      (n) => Number.isInteger(n) && n >= 0,
    ) &&
    [l.timeMs, l.confidence, l.iou].every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
    )
  );
};
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [language, changeLanguage] = useState<Language>("ID");
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [backendStatus, setBackendStatus] =
    useState<BackendStatus>("unconfigured");
  const text = (id: string, en: string) => (language === "ID" ? id : en);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      if (Array.isArray(stored))
        setLogs(
          stored
            .filter(validLog)
            .slice(0, 100)
            .map(({ snapshot: _snapshot, ...log }) => log),
        );
      if (localStorage.getItem(LANG_KEY) === "EN") changeLanguage("EN");
    } catch {
      toast.error(
        "Riwayat lokal tidak dapat dimuat / Local history could not be loaded.",
      );
    }
    setHydrated(true);
    const unsubscribe = subscribeBackendStatus(setBackendStatus);
    void warmUpBackend();
    const sync = (event: StorageEvent) => {
      if (event.key === LOG_KEY) {
        try {
          const stored: unknown = JSON.parse(event.newValue || "[]");
          if (Array.isArray(stored))
            setLogs(
              stored
                .filter(validLog)
                .slice(0, 100)
                .map(({ snapshot: _snapshot, ...log }) => log),
            );
        } catch {
          /* Biarkan riwayat terakhir tetap terlihat. */
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === "ID" ? "id" : "en";
  }, [language]);
  function setLanguage(value: Language) {
    changeLanguage(value);
    try {
      localStorage.setItem(LANG_KEY, value);
    } catch {
      /* Pilihan bahasa tetap berlaku untuk sesi ini. */
    }
  }
  function persist(next: ScanLog[]) {
    try {
      localStorage.setItem(
        LOG_KEY,
        JSON.stringify(next.map(({ snapshot: _snapshot, ...log }) => log)),
      );
      setLogs(next);
      return true;
    } catch {
      toast.error(
        text(
          "Penyimpanan browser tidak tersedia. Ekspor hasil sebelum menutup halaman.",
          "Browser storage is unavailable. Export your results before leaving.",
        ),
      );
      return false;
    }
  }
  function saveLog(log: ScanLog) {
    if (logs.some((l) => l.id === log.id)) return true;
    return persist([log, ...logs].slice(0, 100));
  }
  return (
    <Context.Provider
      value={{
        language,
        setLanguage,
        logs,
        hydrated,
        backendStatus,
        saveLog,
        clearLogs: () => {
          persist([]);
        },
        text,
      }}
    >
      <MotionConfig reducedMotion="user">
        {children}
        <Toaster richColors position="bottom-right" closeButton />
      </MotionConfig>
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("WorkspaceProvider is missing");
  return value;
}
