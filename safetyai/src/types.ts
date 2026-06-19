export type Language = "EN" | "ID";

export interface Detection {
  id: string;
  className: "Helmet" | "No-Helmet" | "Person";
  confidence: number;
  // Bounding box coordinates in percentage [top, left, width, height]
  bbox: [number, number, number, number];
}

export interface DetectionLog {
  id: string;
  snapshotUrl: string;
  snapshotAlt: string;
  dateTime: string;
  helmetCount: number;
  noHelmetCount: number;
  personCount: number;
  status: "Violation" | "Compliant";
}

export interface MetricCard {
  label: string;
  value: string;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  color?: string;
}

export interface ChartDataPoint {
  day: string;
  violations: number;
  scans: number;
}
