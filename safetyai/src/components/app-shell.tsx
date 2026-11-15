"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  Menu,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useWorkspace } from "./workspace-provider";
import { retryWarmUp } from "@/api";
import { BrandLogo } from "./brand-logo";

export function BackendIndicator({ expanded = false }: { expanded?: boolean }) {
  const { backendStatus, text } = useWorkspace();
  const labels = {
    ready: text("Backend terhubung", "Backend connected"),
    waking: text("Menghubungkan backend", "Connecting to backend"),
    error: text("Backend belum tersedia", "Backend unavailable"),
    unconfigured: text("Backend belum diatur", "Backend not configured"),
  };
  return (
    <div className={`backend-indicator state-${backendStatus}`} role="status">
      <span className="status-dot" />
      <span>{labels[backendStatus]}</span>
      {expanded && backendStatus === "error" && (
        <button className="text-link" onClick={() => void retryWarmUp()}>
          {text("Coba lagi", "Retry")}
        </button>
      )}
    </div>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { language, setLanguage, text, logs, hydrated } = useWorkspace();
  const [open, setOpen] = useState(false);
  const nav = [
    {
      href: "/",
      label: text("Ringkasan", "Overview"),
      icon: LayoutDashboard,
      description: text("Workspace Anda", "Your workspace"),
    },
    {
      href: "/detect",
      label: text("Deteksi baru", "New detection"),
      icon: ScanLine,
      description: text("Gambar & video", "Images & video"),
    },
    {
      href: "/about",
      label: text("Panduan & model", "Guide & model"),
      icon: CircleHelp,
      description: text("Cara kerja SafetyAI", "How SafetyAI works"),
    },
  ];
  const current = nav.find((item) => item.href === pathname);
  const navigation = (
    <>
      <Link
        href="/"
        className="brand"
        aria-label={text("SafetyAI — ringkasan", "SafetyAI — overview")}
        onClick={() => setOpen(false)}
      >
        <BrandLogo />
      </Link>
      <div className="workspace-label">WORKSPACE</div>
      <nav
        aria-label={text("Navigasi utama", "Main navigation")}
        className="side-navigation"
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={
              pathname === item.href ? "side-link active" : "side-link"
            }
            aria-current={pathname === item.href ? "page" : undefined}
          >
            <item.icon />
            <span>{item.label}</span>
            {item.href === "/" && logs.length > 0 ? (
              <span className="nav-count">{logs.length}</span>
            ) : (
              <ChevronRight className="nav-chevron" />
            )}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-guide">
          <ShieldCheck />
          <h2>{text("Satu langkah lebih aman.", "One step safer.")}</h2>
          <p>
            {text(
              "Tinjau hasil AI sebelum mengambil keputusan di lapangan.",
              "Review AI findings before making on-site decisions.",
            )}
          </p>
          <Link href="/about" onClick={() => setOpen(false)}>
            {text("Kenali model", "Know the model")}
            <ArrowUpRight />
          </Link>
        </div>
        <div className="model-version">
          <span className="status-dot" />
          YOLO26s<span>v2.0</span>
        </div>
      </div>
    </>
  );
  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        {text("Langsung ke konten", "Skip to content")}
      </a>
      <aside className="desktop-sidebar">{navigation}</aside>
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mobile-menu"
                  aria-label={text("Buka navigasi", "Open navigation")}
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="mobile-sidebar">
                <SheetTitle className="sr-only">
                  {text("Navigasi utama", "Main navigation")}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  SafetyAI workspace
                </SheetDescription>
                {navigation}
              </SheetContent>
            </Sheet>
            <Link
              href="/"
              className="mobile-brand"
              aria-label={text("SafetyAI — ringkasan", "SafetyAI — overview")}
            >
              <BrandLogo variant="header" />
            </Link>
            <span className="breadcrumb-workspace">Workspace</span>
            <ChevronRight />
            <span className="breadcrumb-page">
              {current?.label ?? "SafetyAI"}
            </span>
          </div>
          <div className="topbar-tools">
            <BackendIndicator />
            <span className="toolbar-separator" />
            <ToggleGroup
              type="single"
              value={language}
              onValueChange={(value) => {
                if (value === "ID" || value === "EN") setLanguage(value);
              }}
              className="language-switch"
              aria-label={text("Bahasa tampilan", "Display language")}
            >
              <ToggleGroupItem value="ID" aria-label="Bahasa Indonesia">
                ID
              </ToggleGroupItem>
              <ToggleGroupItem value="EN" aria-label="English">
                EN
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="workspace-main"
          aria-busy={!hydrated}
        >
          {children}
        </main>
        <footer className="workspace-footer">
          <div className="footer-identity">
            <Link
              href="/"
              aria-label={text("SafetyAI — ringkasan", "SafetyAI — overview")}
            >
              <BrandLogo variant="footer" />
            </Link>
            <span className="footer-tagline">
              {text(
                "Dibangun untuk keselamatan di lapangan",
                "Built for on-site safety",
              )}
            </span>
          </div>
          <Link href="/about#privacy">
            {text("Privasi & penyimpanan", "Privacy & storage")}
            <ArrowUpRight />
          </Link>
        </footer>
      </div>
    </div>
  );
}
