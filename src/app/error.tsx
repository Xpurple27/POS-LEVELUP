"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel p-10 text-center">
      <h1 className="text-xl font-bold">Ruang kerja tidak dapat ditampilkan</h1>
      <p className="my-4 text-sm text-slate-500">
        Terjadi gangguan. Coba lagi atau periksa konfigurasi layanan.
      </p>
      <button className="btn" onClick={reset}>
        Coba kembali
      </button>
    </div>
  );
}
