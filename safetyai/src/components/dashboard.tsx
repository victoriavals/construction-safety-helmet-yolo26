"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Clock3,
  FileImage,
  FlaskConical,
  ScanLine,
  Search,
  ShieldCheck,
  ShieldAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "./workspace-provider";
import {
  DEMO_LOGS,
  exportScans,
  formatDate,
  getScanStatus,
  type ScanLog,
  type ScanStatus,
} from "@/lib/model";

export function ScanStatusBadge({
  scan,
}: {
  scan: Pick<ScanLog, "helmet" | "noHelmet" | "person">;
}) {
  const { text } = useWorkspace();
  const status = getScanStatus(scan);
  return (
    <Badge variant="outline" className={`scan-badge ${status}`}>
      {status === "review" ? (
        <ShieldAlert />
      ) : status === "clear" ? (
        <ShieldCheck />
      ) : (
        <Search />
      )}
      {status === "review"
        ? text("Perlu ditinjau", "Needs review")
        : status === "clear"
          ? text("Tanpa temuan", "No flags")
          : text("Tanpa objek", "No objects")}
    </Badge>
  );
}

export default function Dashboard() {
  const { text, language, logs, hydrated } = useWorkspace();
  const [source, setSource] = useState("mine");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ScanStatus>("all");
  const [period, setPeriod] = useState("all");
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const [selected, setSelected] = useState<ScanLog | null>(null);
  const demo = source === "demo";
  const sourceLogs = demo ? DEMO_LOGS : logs;
  const filtered = useMemo(
    () =>
      sourceLogs.filter((log) => {
        const end = demo ? Date.parse("2026-11-15T23:59:59+07:00") : Date.now();
        return (
          `${log.id} ${log.filename}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (filter === "all" || getScanStatus(log) === filter) &&
          (period === "all" ||
            Date.parse(log.createdAt) >= end - 7 * 86_400_000)
        );
      }),
    [sourceLogs, query, filter, period, demo],
  );
  const reviewCount = filtered.filter(
    (l) => getScanStatus(l) === "review",
  ).length;
  const clearCount = filtered.filter(
    (l) => getScanStatus(l) === "clear",
  ).length;
  const avg = filtered.length
    ? Math.round(
        filtered.reduce((sum, l) => sum + l.timeMs, 0) / filtered.length,
      )
    : null;
  const counts = [
    filtered.reduce((sum, l) => sum + l.helmet, 0),
    filtered.reduce((sum, l) => sum + l.noHelmet, 0),
    filtered.reduce((sum, l) => sum + l.person, 0),
  ];
  const sum = counts.reduce((a, b) => a + b, 0);
  const dateKey = (value: string | number) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const time =
      (demo ? Date.parse("2026-11-15T12:00:00+07:00") : Date.now()) -
      (6 - index) * 86_400_000;
    const entries = filtered.filter(
      (l) => dateKey(l.createdAt) === dateKey(time),
    );
    return {
      label: new Intl.DateTimeFormat(language === "ID" ? "id-ID" : "en-GB", {
        weekday: "short",
        timeZone: "Asia/Jakarta",
      }).format(time),
      all: entries.length,
      review: entries.filter((l) => getScanStatus(l) === "review").length,
    };
  });
  const max = Math.max(2, ...chartDays.map((d) => d.all));
  const line = chartDays
    .map((d, i) => `${40 + i * 76},${148 - (d.all / max) * 105}`)
    .join(" ");
  const metrics = [
    {
      title: text("Total pemeriksaan", "Total scans"),
      value: filtered.length,
      detail: text("Gambar yang tersimpan", "Saved image scans"),
      icon: ScanLine,
      tone: "blue",
    },
    {
      title: text("Perlu ditinjau", "Needs review"),
      value: reviewCount,
      detail: text("Terdeteksi tanpa helm", "No-helmet detections"),
      icon: ShieldAlert,
      tone: "amber",
    },
    {
      title: text("Tanpa temuan", "No flags"),
      value: clearCount,
      detail: text("Tetap perlu verifikasi", "Still requires verification"),
      icon: ShieldCheck,
      tone: "green",
    },
    {
      title: text("Rerata inferensi", "Average inference"),
      value: avg ?? "—",
      detail: text("Waktu pemrosesan model", "Model processing time"),
      icon: Clock3,
      tone: "purple",
      unit: avg != null ? "ms" : "",
    },
  ];
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SAFETY WORKSPACE</span>
          <h1>
            {text("Ringkasan keselamatan", "Safety overview")}
            <span className="heading-period">.</span>
          </h1>
          <p>
            {text(
              "Lihat temuan. Tinjau risiko. Ambil langkah berikutnya.",
              "See findings. Review risks. Take the next step.",
            )}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/detect">
            <ScanLine data-icon="inline-start" />
            {text("Deteksi baru", "New detection")}
            <ArrowUpRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      <section
        className="welcome-banner"
        aria-label={text("Mulai pemeriksaan", "Start an inspection")}
      >
        <div className="welcome-copy">
          <span className="hero-kicker">
            <span className="small-line" />
            {text(
              "LEBIH PEDULI. LEBIH TERLINDUNGI.",
              "MORE AWARE. BETTER PROTECTED.",
            )}
          </span>
          <h2>
            {text("Setiap helm berarti.", "Every helmet matters.")}
            <br />
            <span>
              {text("Setiap pemeriksaan penting.", "Every check counts.")}
            </span>
          </h2>
          <p>
            {text(
              "Ubah gambar lapangan menjadi temuan yang bisa Anda tindak lanjuti, dengan bantuan AI.",
              "Turn site images into actionable findings with a little help from AI.",
            )}
          </p>
          <Link className="banner-link" href="/detect">
            {text("Mulai pemeriksaan pertama", "Start your first inspection")}
            <ArrowRight />
          </Link>
        </div>
        <div className="welcome-image">
          <img
            src="/examples/example1.jpg"
            alt={text(
              "Pekerja dengan helm di area konstruksi",
              "Workers wearing helmets on a construction site",
            )}
          />
          <span className="image-corner top-left" />
          <span className="image-corner bottom-right" />
          <div className="image-caption">
            <FileImage />
            {text(
              "GAMBAR CONTOH · BUKAN LIVE FEED",
              "SAMPLE IMAGE · NOT A LIVE FEED",
            )}
          </div>
        </div>
      </section>

      <section
        aria-label={text("Statistik pemeriksaan", "Inspection statistics")}
        className="page-stack"
      >
        <div className="section-toolbar">
          <div className="section-title-inline">
            <h2>{text("Aktivitas workspace", "Workspace activity")}</h2>
            <span className="small-caption">
              {text("Sumber data", "Data source")}
            </span>
          </div>
          <ToggleGroup
            type="single"
            value={source}
            onValueChange={(value) => {
              if (value) {
                setSource(value);
                setQuery("");
                setFilter("all");
                setPeriod("all");
              }
            }}
            className="source-switch"
            aria-label={text("Sumber data", "Data source")}
          >
            <ToggleGroupItem value="mine">
              {text("Data saya", "My data")}
              <span className="source-count">{logs.length}</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="demo">
              <FlaskConical />
              {text("Lihat demo", "View demo")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        {demo ? (
          <div className="demo-banner">
            <FlaskConical />
            <span>
              <strong>{text("Mode demo aktif.", "Demo mode is on.")}</strong>{" "}
              {text(
                "Semua angka di bawah berasal dari 4 contoh ilustrasi, terpisah dari riwayat Anda.",
                "All numbers below come from 4 illustrative samples, separate from your history.",
              )}
            </span>
            <button
              aria-label={text("Kembali ke data saya", "Return to my data")}
              onClick={() => setSource("mine")}
            >
              <X />
            </button>
          </div>
        ) : null}
        <div className="metrics-grid">
          {metrics.map((metric, index) => (
            <motion.article
              key={metric.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.04, duration: 0.2 }}
              className="metric-card"
            >
              <div className="metric-top">
                <span>{metric.title}</span>
                <span className={`metric-icon ${metric.tone}`}>
                  <metric.icon />
                </span>
              </div>
              {hydrated || demo ? (
                <div className="metric-value">
                  {metric.value}
                  <small>{metric.unit}</small>
                </div>
              ) : (
                <Skeleton className="h-10 w-20" />
              )}
              <div className="metric-detail">{metric.detail}</div>
            </motion.article>
          ))}
        </div>
      </section>

      <div className="analytics-grid">
        <section className="panel activity-panel">
          <div className="panel-header">
            <div>
              <h2>{text("Aktivitas pemeriksaan", "Inspection activity")}</h2>
              <p>
                {text("7 hari terakhir · WIB", "Last 7 days · WIB")}
                {demo ? " · 9–15 Nov 2026" : ""}
              </p>
            </div>
            <div className="chart-key">
              <span>
                <i className="blue-dot" />
                {text("Pemeriksaan", "Scans")}
              </span>
              <span>
                <i className="amber-dot" />
                {text("Perlu ditinjau", "Needs review")}
              </span>
            </div>
          </div>
          <div className="line-chart">
            <svg
              viewBox="0 0 536 188"
              role="img"
              aria-label={text(
                "Grafik jumlah pemeriksaan dan temuan selama tujuh hari. Rincian tersedia di bawah.",
                "Scan and review counts over seven days. Details are available below.",
              )}
            >
              <defs>
                <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#496dc9" stopOpacity=".18" />
                  <stop offset="100%" stopColor="#496dc9" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2].map((n) => (
                <g key={n}>
                  <line
                    x1="36"
                    x2="505"
                    y1={148 - n * 52.5}
                    y2={148 - n * 52.5}
                    stroke="#e9edf2"
                    strokeDasharray="4 5"
                  />
                  <text x="15" y={152 - n * 52.5} fontSize="10" fill="#64748b">
                    {((n * max) / 2).toFixed(max % 2 ? 1 : 0)}
                  </text>
                </g>
              ))}
              <polygon
                points={`40,148 ${line} 496,148`}
                fill="url(#chart-fill)"
              />
              <polyline
                points={line}
                fill="none"
                stroke="#4166c5"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {chartDays.map((day, index) => (
                <g key={index}>
                  <circle
                    cx={40 + index * 76}
                    cy={148 - (day.all / max) * 105}
                    r="4"
                    fill="#fff"
                    stroke="#4166c5"
                    strokeWidth="2"
                  />
                  <circle
                    cx={40 + index * 76}
                    cy={148 - (day.review / max) * 105}
                    r="3"
                    fill="#d68a25"
                  />
                  <text
                    x={40 + index * 76}
                    y="177"
                    fontSize="11"
                    textAnchor="middle"
                    fill="#66758a"
                  >
                    {day.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <details className="chart-details">
            <summary>{text("Lihat data grafik", "View chart data")}</summary>
            <table>
              <caption className="sr-only">
                {text("Rincian aktivitas 7 hari", "Seven-day activity details")}
              </caption>
              <thead>
                <tr>
                  <th>{text("Hari", "Day")}</th>
                  <th>{text("Pemeriksaan", "Scans")}</th>
                  <th>{text("Perlu ditinjau", "Needs review")}</th>
                </tr>
              </thead>
              <tbody>
                {chartDays.map((d, i) => (
                  <tr key={i}>
                    <th>{d.label}</th>
                    <td>{d.all}</td>
                    <td>{d.review}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
        <section className="panel distribution-panel">
          <div className="panel-header">
            <div>
              <h2>{text("Objek terdeteksi", "Detected objects")}</h2>
              <p>
                {text("Distribusi berdasarkan kelas", "Distribution by class")}
              </p>
            </div>
            <Badge variant="secondary">3 {text("kelas", "classes")}</Badge>
          </div>
          <div className="distribution-body">
            <div
              className="donut"
              style={{
                background: sum
                  ? `conic-gradient(var(--helmet) 0 ${(counts[0] / sum) * 100}%, var(--no-helmet) ${(counts[0] / sum) * 100}% ${((counts[0] + counts[1]) / sum) * 100}%, var(--person) ${((counts[0] + counts[1]) / sum) * 100}% 100%)`
                  : "var(--muted)",
              }}
              role="img"
              aria-label={`${text("Total objek", "Total objects")}: ${sum}`}
            >
              <div>
                <strong>{sum}</strong>
                <span>{text("objek", "objects")}</span>
              </div>
            </div>
            <div className="distribution-legend">
              {[
                text("Helm", "Helmet"),
                text("Tanpa helm", "No helmet"),
                text("Orang", "Person"),
              ].map((label, index) => (
                <div key={label}>
                  <i className={`class-dot class-${index}`} />
                  <span>{label}</span>
                  <strong>{counts[index]}</strong>
                </div>
              ))}
            </div>
          </div>
          <p className="panel-note">
            {text(
              "Kelas dapat tumpang tindih. Total objek bukan jumlah pekerja unik.",
              "Classes can overlap. Object totals are not unique worker counts.",
            )}
          </p>
        </section>
      </div>

      <section className="panel history-panel" id="history">
        <div className="panel-header">
          <div>
            <h2>
              {text("Riwayat pemeriksaan", "Inspection history")}
              <span className="inline-count">{filtered.length}</span>
            </h2>
            <p>
              {demo
                ? text(
                    "Contoh ilustrasi untuk menjelajahi workspace",
                    "Illustrative samples to explore the workspace",
                  )
                : text(
                    "Ringkasan tersimpan di browser ini · maksimum 100 pemeriksaan",
                    "Summaries saved in this browser · up to 100 scans",
                  )}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => exportScans(filtered)}
            disabled={!filtered.length}
          >
            <ArrowDownToLine data-icon="inline-start" />
            {text("Ekspor CSV", "Export CSV")}
          </Button>
        </div>
        <div className="history-toolbar">
          <div className="search-control">
            <Search />
            <label className="sr-only" htmlFor="history-search">
              {text("Cari nama file atau ID", "Search filename or ID")}
            </label>
            <input
              id="history-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={text(
                "Cari nama file atau ID…",
                "Search filename or ID…",
              )}
            />
          </div>
          <div className="history-selects">
            <label className="sr-only" htmlFor="status-filter">
              {text("Filter status", "Filter status")}
            </label>
            <select
              id="status-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">
                {text("Semua status", "All statuses")}
              </option>
              <option value="review">
                {text("Perlu ditinjau", "Needs review")}
              </option>
              <option value="clear">{text("Tanpa temuan", "No flags")}</option>
              <option value="empty">{text("Tanpa objek", "No objects")}</option>
            </select>
            <label className="sr-only" htmlFor="date-filter">
              {text("Periode", "Date range")}
            </label>
            <select
              id="date-filter"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="all">{text("Semua waktu", "All time")}</option>
              <option value="7">
                {text("7 hari terakhir", "Last 7 days")}
              </option>
            </select>
          </div>
        </div>
        {!hydrated && !demo ? (
          <div className="history-loading" role="status">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <span className="sr-only">
              {text("Memuat riwayat", "Loading history")}
            </span>
          </div>
        ) : filtered.length ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={text(
              "Tabel riwayat pemeriksaan",
              "Inspection history table",
            )}
          >
            <table className="history-table">
              <caption className="sr-only">
                {text(
                  "Riwayat dengan jumlah objek dan status peninjauan",
                  "History with object counts and review status",
                )}
              </caption>
              <thead>
                <tr>
                  <th>{text("SUMBER GAMBAR", "IMAGE SOURCE")}</th>
                  <th>{text("WAKTU · WIB", "TIME · WIB")}</th>
                  <th>{text("HELM", "HELMET")}</th>
                  <th>{text("TANPA HELM", "NO HELMET")}</th>
                  <th>{text("ORANG", "PERSON")}</th>
                  <th>STATUS</th>
                  <th>
                    <span className="sr-only">{text("Detail", "Details")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((scan) => (
                  <tr key={scan.id}>
                    <td>
                      <div className="file-cell">
                        {scan.snapshot ? (
                          <img loading="lazy" src={scan.snapshot} alt="" />
                        ) : (
                          <span className="file-placeholder">
                            <FileImage />
                          </span>
                        )}
                        <div>
                          <strong>{scan.filename}</strong>
                          <small>{scan.id}</small>
                        </div>
                      </div>
                    </td>
                    <td className="date-cell">
                      {formatDate(scan.createdAt, language)}
                    </td>
                    <td>{scan.helmet}</td>
                    <td className={scan.noHelmet > 0 ? "flag-number" : ""}>
                      {scan.noHelmet}
                    </td>
                    <td>{scan.person}</td>
                    <td>
                      <ScanStatusBadge scan={scan} />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          detailTrigger.current = event.currentTarget;
                          setSelected(scan);
                        }}
                        aria-label={`${text("Lihat detail", "View details")} ${scan.filename}`}
                      >
                        <ChevronRight />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty className="history-empty">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScanLine />
              </EmptyMedia>
              <EmptyTitle>
                {query || filter !== "all" || period !== "all"
                  ? text("Tidak ada hasil yang cocok", "No matching results")
                  : text(
                      "Pemeriksaan pertama dimulai di sini",
                      "Your first inspection starts here",
                    )}
              </EmptyTitle>
              <EmptyDescription>
                {query || filter !== "all" || period !== "all"
                  ? text(
                      "Coba nama file lain atau hapus filter Anda.",
                      "Try another filename or clear your filters.",
                    )
                  : text(
                      "Unggah gambar lapangan, tinjau hasilnya, lalu simpan ringkasan untuk melihatnya di workspace.",
                      "Upload a site image, review the findings, then save a summary to see it here.",
                    )}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {query || filter !== "all" || period !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                    setPeriod("all");
                  }}
                >
                  {text("Hapus filter", "Clear filters")}
                </Button>
              ) : (
                <div className="empty-actions">
                  <Button asChild>
                    <Link href="/detect">
                      {text("Mulai deteksi", "Start detection")}
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => setSource("demo")}>
                    {text("Jelajahi demo", "Explore demo")}
                  </Button>
                </div>
              )}
            </EmptyContent>
          </Empty>
        )}
        <div className="table-footer">
          <span>
            {text("Menampilkan", "Showing")} {filtered.length}{" "}
            {text("dari", "of")} {sourceLogs.length}{" "}
            {text("pemeriksaan", "scans")}
          </span>
          <span>
            <ShieldCheck />
            {demo
              ? text("Data ilustrasi", "Illustrative data")
              : text("Penyimpanan lokal", "Local storage")}
          </span>
        </div>
      </section>
      <div className="safety-note">
        <ShieldCheck />
        <p>
          {text(
            "AI membantu Anda melihat lebih cepat. Keputusan keselamatan tetap memerlukan pemeriksaan manusia.",
            "AI helps you see faster. Safety decisions still require human review.",
          )}
        </p>
        <Link href="/about">
          {text("Pelajari batasan model", "Learn model limitations")}
          <ArrowUpRight />
        </Link>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent
          className="scan-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            detailTrigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {text("Detail pemeriksaan", "Inspection details")}
            </DialogTitle>
            <DialogDescription>
              {selected?.filename} · {selected?.id}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <>
              {selected.snapshot ? (
                <img
                  className="detail-snapshot"
                  src={selected.snapshot}
                  alt={text("Cuplikan pemeriksaan", "Inspection snapshot")}
                />
              ) : (
                <p className="panel-note">
                  {text(
                    "Gambar tidak disimpan permanen. Hanya ringkasan pemeriksaan yang tersedia.",
                    "Images are not stored permanently. Only the scan summary is available.",
                  )}
                </p>
              )}
              <ScanStatusBadge scan={selected} />
              <dl className="detail-grid">
                <div>
                  <dt>{text("Helm", "Helmet")}</dt>
                  <dd>{selected.helmet}</dd>
                </div>
                <div>
                  <dt>{text("Tanpa helm", "No helmet")}</dt>
                  <dd>{selected.noHelmet}</dd>
                </div>
                <div>
                  <dt>{text("Orang", "Person")}</dt>
                  <dd>{selected.person}</dd>
                </div>
                <div>
                  <dt>{text("Inferensi", "Inference")}</dt>
                  <dd>{Math.round(selected.timeMs)} ms</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{Math.round(selected.confidence * 100)}%</dd>
                </div>
                <div>
                  <dt>IoU</dt>
                  <dd>{Math.round(selected.iou * 100)}%</dd>
                </div>
              </dl>
              <p className="panel-note">
                {formatDate(selected.createdAt, language)} WIB
              </p>
              <Button variant="outline" onClick={() => exportScans([selected])}>
                <ArrowDownToLine data-icon="inline-start" />
                {text("Ekspor pemeriksaan", "Export scan")}
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
