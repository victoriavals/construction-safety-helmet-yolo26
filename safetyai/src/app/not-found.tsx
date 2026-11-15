import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page-loading">
      <h1>404 — Halaman tidak ditemukan</h1>
      <Link href="/" className="text-link">
        Kembali ke ringkasan / Back to overview
      </Link>
    </div>
  );
}
