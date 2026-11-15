import type { Metadata } from "next";
import DetectionWorkspace from "@/components/detection-workspace";
export const metadata: Metadata = { title: "Deteksi baru" };
export default function Page() {
  return <DetectionWorkspace />;
}
