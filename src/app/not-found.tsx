import Link from "next/link";
export default function NotFound() {
  return (
    <div className="panel p-10 text-center">
      <h1 className="mb-5 text-xl font-bold">Halaman tidak ditemukan</h1>
      <Link className="btn" href="/pos">
        Kembali ke kasir
      </Link>
    </div>
  );
}
