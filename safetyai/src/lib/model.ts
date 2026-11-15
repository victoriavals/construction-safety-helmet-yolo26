export type Language = "ID" | "EN";
export type ScanStatus = "review" | "clear" | "empty";
export interface ScanLog {
  id: string;
  filename: string;
  createdAt: string;
  helmet: number;
  noHelmet: number;
  person: number;
  timeMs: number;
  confidence: number;
  iou: number;
  snapshot?: string;
}
export const getScanStatus = (
  scan: Pick<ScanLog, "helmet" | "noHelmet" | "person">,
): ScanStatus =>
  scan.noHelmet > 0
    ? "review"
    : scan.helmet + scan.person > 0
      ? "clear"
      : "empty";
export const EXAMPLES = [
  {
    id: 1,
    filename: "area-konstruksi.jpg",
    url: "/examples/example1.jpg",
    title: { ID: "Area konstruksi", EN: "Construction site" },
    description: {
      ID: "Beberapa pekerja di lokasi proyek.",
      EN: "Several workers on a construction site.",
    },
  },
  {
    id: 2,
    filename: "inspeksi-lapangan.jpg",
    url: "/examples/workers-team-v2.jpg",
    title: { ID: "Tim dengan helm", EN: "Team wearing helmets" },
    description: {
      ID: "Empat pekerja dengan helm dan rompi.",
      EN: "Four workers wearing helmets and safety vests.",
    },
  },
  {
    id: 3,
    filename: "pekerja-proyek.jpg",
    url: "/examples/workers-helmet-use-v2.jpg",
    title: { ID: "Variasi penggunaan helm", EN: "Different helmet use" },
    description: {
      ID: "Tim dengan helm dipakai dan dibawa.",
      EN: "A team with helmets worn and carried.",
    },
  },
  {
    id: 4,
    filename: "pemeriksaan-helm.jpg",
    url: "/examples/workers-inspection-v2.jpg",
    title: { ID: "Inspeksi pekerjaan", EN: "Site inspection" },
    description: {
      ID: "Dua pekerja meninjau rencana proyek.",
      EN: "Two workers reviewing the project plans.",
    },
  },
];
// Fixture terisolasi; tidak pernah dimasukkan ke riwayat pengguna.
export const DEMO_LOGS: ScanLog[] = [
  {
    id: "DEMO-004",
    filename: "area-konstruksi.jpg",
    createdAt: "2026-11-15T07:30:00Z",
    helmet: 12,
    noHelmet: 3,
    person: 15,
    timeMs: 81,
    confidence: 0.25,
    iou: 0.45,
    snapshot: EXAMPLES[0].url,
  },
  {
    id: "DEMO-003",
    filename: "inspeksi-lapangan.jpg",
    createdAt: "2026-11-14T04:15:00Z",
    helmet: 4,
    noHelmet: 0,
    person: 4,
    timeMs: 94,
    confidence: 0.25,
    iou: 0.45,
    snapshot: EXAMPLES[1].url,
  },
  {
    id: "DEMO-002",
    filename: "pekerja-proyek.jpg",
    createdAt: "2026-11-12T02:10:00Z",
    helmet: 8,
    noHelmet: 1,
    person: 9,
    timeMs: 76,
    confidence: 0.25,
    iou: 0.45,
    snapshot: EXAMPLES[2].url,
  },
  {
    id: "DEMO-001",
    filename: "pemeriksaan-helm.jpg",
    createdAt: "2026-11-10T01:45:00Z",
    helmet: 1,
    noHelmet: 1,
    person: 2,
    timeMs: 103,
    confidence: 0.25,
    iou: 0.45,
    snapshot: EXAMPLES[3].url,
  },
];
export function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "ID" ? "id-ID" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}
export function exportScans(logs: ScanLog[]) {
  const escape = (value: unknown) =>
    `"${String(value)
      .replace(/^\s*[=+@\-]/, "'$&")
      .replaceAll('"', '""')}"`;
  const rows = [
    [
      "ID",
      "File",
      "Date (ISO)",
      "Helmet",
      "No-Helmet",
      "Person",
      "Inference (ms)",
      "Confidence",
      "IoU",
      "Status",
    ],
    ...logs.map((l) => [
      l.id,
      l.filename,
      l.createdAt,
      l.helmet,
      l.noHelmet,
      l.person,
      l.timeMs,
      l.confidence,
      l.iou,
      getScanStatus(l),
    ]),
  ];
  const blob = new Blob(
    ["\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "safetyai-scans.csv";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
