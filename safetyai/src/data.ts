import { DetectionLog, ChartDataPoint, Detection } from "./types";

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
  detections: Detection[];
}

export const EXAMPLE_IMAGES: ExampleImage[] = [
  {
    id: "ex-1",
    name: "Zone B Construction Site",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCYV3jLlQoRMizUgjWbJY2wxPOGclQO3UCWsLWCEsqVKiI8B1lRfBl4C-Pn2_M3CxraTgQ0KGpUijroeucIdAYmMbGEzCTgMY7wVQ5mr5kJx6WIA2595eusKRqSzL_nush071GCPErs6nxlHPHPuv4DKMvKZFeHAU9IH3gp_pG-qpCDmQ_O3jUdpetmhyTL5_jive9RVMglKIhvXBIm_p3OWHuShZzL0fhZe3WGzQ5I8auWjiXvdGdJO4ZAb9BN8IvDlVZ11-2outM",
    detections: [
      { id: "det-1", className: "Helmet", confidence: 0.95, bbox: [20, 30, 10, 15] },
      { id: "det-2", className: "No-Helmet", confidence: 0.88, bbox: [40, 60, 8, 12] },
      { id: "det-3", className: "Person", confidence: 0.99, bbox: [18, 28, 15, 40] }
    ]
  },
  {
    id: "ex-2",
    name: "Scaffolding Scans",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDX8ZmTa7OWs9ZhdY3Z3y3-pGXRbj27VLODwzM8MBZW4rTgf112au1S3quyqjmC-4SdWggFtjlccmSPUOBZLLy14lN6cXPx1ETF4KtNmBZRyp3P-xigt5XC8YMvNkmF0xcNb_Dzn-0kjeTcXlnHV9eJhyhFUXVsEaxjZYkStOMoxJAAwO7o3ZVjSkMZJ-pOvHhWAy2d-1vQHWQ4oUi1E-U62EdKx7jjpW5YdotPIH8yjELgH96gmQe-X6_VLbIxZa7WQ859hzjVkBA",
    detections: [
      { id: "det-4", className: "Helmet", confidence: 0.91, bbox: [15, 45, 8, 10] },
      { id: "det-5", className: "No-Helmet", confidence: 0.86, bbox: [30, 20, 8, 12] },
      { id: "det-6", className: "No-Helmet", confidence: 0.89, bbox: [32, 70, 7, 11] },
      { id: "det-7", className: "Person", confidence: 0.98, bbox: [10, 15, 15, 60] },
      { id: "det-8", className: "Person", confidence: 0.94, bbox: [12, 40, 14, 50] }
    ]
  },
  {
    id: "ex-3",
    name: "Factory Core Area",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAEZv-PwAhTmH70nTy1zDEB1w3xW-T3JKbonX8fQuOUGqDVT9vnSvJa6FywOvhxvd8qzcWdAp4OHjSGTObtKa8MB7BlVwDqKl48HqLCKRPqe3FHUUEvS5wkakHyrJ41WOTmBaRx82z5scnIYjOKemkU-qaqN75sZ_cLk3bZ1YAs5gkvCLj8aUQRAehL1XS__Ssn_8QGRWI9qpiUFhMd6QDb8s_lp9zP_vrmIrR_AnoGBW0NMo4a7FzqScR_xaccW4N_kJ8T53EJwdM",
    detections: [
      { id: "det-9", className: "Helmet", confidence: 0.97, bbox: [25, 10, 10, 12] },
      { id: "det-10", className: "Helmet", confidence: 0.95, bbox: [22, 35, 9, 11] },
      { id: "det-11", className: "Helmet", confidence: 0.94, bbox: [24, 60, 9, 12] },
      { id: "det-12", className: "Person", confidence: 0.99, bbox: [20, 5, 15, 70] },
      { id: "det-13", className: "Person", confidence: 0.99, bbox: [18, 30, 14, 65] }
    ]
  },
  {
    id: "ex-4",
    name: "PPE Frontal View",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCKyr9sEnjXJ0jn4R1IJnHEEBO6aYL3hr-lPBtiNyrW8FxTZa4evSoovjJIOtsqA32O8ZSh_7ByeV9sYFrgT_5Bk0Hw0ZfljH-oLXJ6S8AFozDDVIj4ZZKk37Hi-8PMjjeh81tBgQ1TE7v9rv9aJeDiM53ol2lm3Lc-nIgDooYYpHk45gxtYnmLRWH35bdPpJAxNTUKjyH6hEkMG04Aqe0Z9FpzYIXBde0yfxQJK6WFLms1ZF7DBv7ynE49iACxNVtTRqjVlttgiCQ",
    detections: [
      { id: "det-14", className: "Helmet", confidence: 0.92, bbox: [11, 25, 33, 25] },
      { id: "det-15", className: "No-Helmet", confidence: 0.88, bbox: [20, 50, 40, 30] }, // simulating no vest or violation in lower section
      { id: "det-16", className: "Person", confidence: 0.99, bbox: [1, 10, 80, 80] }
    ]
  }
];
