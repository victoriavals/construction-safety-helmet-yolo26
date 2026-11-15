import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { AppShell } from "@/components/app-shell";
import "../index.css";

export const metadata: Metadata = {
  title: {
    default: "SafetyAI — Workspace Keselamatan",
    template: "%s | SafetyAI",
  },
  description:
    "Periksa helm keselamatan dari gambar dan video dengan YOLO26s. Tinjau hasil deteksi dan simpan riwayat inspeksi Anda.",
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>
        <Script src="/config.js" strategy="beforeInteractive" nonce={nonce} />
        <WorkspaceProvider>
          <AppShell>{children}</AppShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
