import { DetectionLog, ChartDataPoint } from "./types";

export const SAMPLE_LOGS: DetectionLog[] = [
  {
    id: "LOG-1001",
    snapshotUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDX8ZmTa7OWs9ZhdY3Z3y3-pGXRbj27VLODwzM8MBZW4rTgf112au1S3quyqjmC-4SdWggFtjlccmSPUOBZLLy14lN6cXPx1ETF4KtNmBZRyp3P-xigt5XC8YMvNkmF0xcNb_Dzn-0kjeTcXlnHV9eJhyhFUXVsEaxjZYkStOMoxJAAwO7o3ZVjSkMZJ-pOvHhWAy2d-1vQHWQ4oUi1E-U62EdKx7jjpW5YdotPIH8yjELgH96gmQe-X6_VLbIxZa7WQ859hzjVkBA",
    snapshotAlt: "Midday scaffolding scaffolding with workers",
    dateTime: "24 Oct 2024, 14:30",
    helmetCount: 12,
    noHelmetCount: 3,
    personCount: 15,
    status: "Violation"
  },
  {
    id: "LOG-1002",
    snapshotUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAEZv-PwAhTmH70nTy1zDEB1w3xW-T3JKbonX8fQuOUGqDVT9vnSvJa6FywOvhxvd8qzcWdAp4OHjSGTObtKa8MB7BlVwDqKl48HqLCKRPqe3FHUUEvS5wkakHyrJ41WOTmBaRx82z5scnIYjOKemkU-qaqN75sZ_cLk3bZ1YAs5gkvCLj8aUQRAehL1XS__Ssn_8QGRWI9qpiUFhMd6QDb8s_lp9zP_vrmIrR_AnoGBW0NMo4a7FzqScR_xaccW4N_kJ8T53EJwdM",
    snapshotAlt: "Factory floor workers with blue hard hats",
    dateTime: "24 Oct 2024, 14:15",
    helmetCount: 4,
    noHelmetCount: 0,
    personCount: 4,
    status: "Compliant"
  },
  {
    id: "LOG-1003",
    snapshotUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCYV3jLlQoRMizUgjWbJY2wxPOGclQO3UCWsLWCEsqVKiI8B1lRfBl4C-Pn2_M3CxraTgQ0KGpUijroeucIdAYmMbGEzCTgMY7wVQ5mr5kJx6WIA2595eusKRqSzL_nush071GCPErs6nxlHPHPuv4DKMvKZFeHAU9IH3gp_pG-qpCDmQ_O3jUdpetmhyTL5_jive9RVMglKIhvXBIm_p3OWHuShZzL0fhZe3WGzQ5I8auWjiXvdGdJO4ZAb9BN8IvDlVZ11-2outM",
    snapshotAlt: "Busy industrial structure workers",
    dateTime: "24 Oct 2024, 11:10",
    helmetCount: 8,
    noHelmetCount: 1,
    personCount: 9,
    status: "Violation"
  },
  {
    id: "LOG-1004",
    snapshotUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCKyr9sEnjXJ0jn4R1IJnHEEBO6aYL3hr-lPBtiNyrW8FxTZa4evSoovjJIOtsqA32O8ZSh_7ByeV9sYFrgT_5Bk0Hw0ZfljH-oLXJ6S8AFozDDVIj4ZZKk37Hi-8PMjjeh81tBgQ1TE7v9rv9aJeDiM53ol2lm3Lc-nIgDooYYpHk45gxtYnmLRWH35bdPpJAxNTUKjyH6hEkMG04Aqe0Z9FpzYIXBde0yfxQJK6WFLms1ZF7DBv7ynE49iACxNVtTRqjVlttgiCQ",
    snapshotAlt: "Worker close up with yellow helmet and orange vest",
    dateTime: "24 Oct 2024, 09:45",
    helmetCount: 1,
    noHelmetCount: 1, // Missing safety vest/hardhat
    personCount: 1,
    status: "Violation"
  }
];

export const CHART_DATA: ChartDataPoint[] = [
  { day: "Mon", violations: 25, scans: 180 },
  { day: "Tue", violations: 18, scans: 195 },
  { day: "Wed", violations: 45, scans: 220 }, // Wednesday violates more peak (highlight style in screenshots)
  { day: "Thu: Kamis", violations: 14, scans: 165 },
  { day: "Fri", violations: 22, scans: 175 },
  { day: "Sat", violations: 10, scans: 140 },
  { day: "Sun", violations: 8, scans: 110 }
];

export interface ExampleImage {
  id: string;
  name: string;
  url: string;
}

// Gambar contoh lokal (disalin ke public/examples/). Saat diklik, gambar
// dikirim ke backend untuk deteksi NYATA — tidak ada deteksi yang di-hardcode.
export const EXAMPLE_IMAGES: ExampleImage[] = [
  { id: "ex-1", name: "Contoh 1", url: "/examples/example1.jpg" },
  { id: "ex-2", name: "Contoh 2", url: "/examples/example2.jpg" },
  { id: "ex-3", name: "Contoh 3", url: "/examples/example3.jpg" },
  { id: "ex-4", name: "Contoh 4", url: "/examples/example4.jpg" }
];
