import type { Metadata } from "next";
import ModelGuide from "@/components/model-guide";
export const metadata: Metadata = { title: "Panduan & model" };
export default function Page() {
  return <ModelGuide />;
}
