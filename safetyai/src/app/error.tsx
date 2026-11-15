"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-loading">
      <h1>Halaman tidak dapat dimuat</h1>
      <p>Page could not be loaded. Silakan coba lagi.</p>
      <Button onClick={reset}>Coba lagi / Retry</Button>
    </div>
  );
}
