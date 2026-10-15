"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coffee,
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  LogOut,
  RefreshCw,
  X,
} from "lucide-react";
import { useState } from "react";
import { useStore } from "./provider";
const navigation = [
  { href: "/pos", label: "Kasir", icon: ShoppingBag },
  { href: "/kds", label: "Dapur", icon: ChefHat },
  { href: "/dashboard", label: "Dasbor", icon: LayoutDashboard },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    s = useStore();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-200 bg-white p-4 lg:fixed lg:inset-y-0 lg:w-60 lg:border-r lg:p-6">
        <Link href="/pos" className="mb-6 flex items-center gap-3">
          <span className="rounded-xl bg-blue-600 p-2 text-white">
            <Coffee size={25} />
          </span>
          <span className="text-xl font-extrabold tracking-tight">
            LEVELUP
            <span className="block text-[10px] font-medium tracking-[.25em] text-slate-400">
              RUANG KOPI & CERITA
            </span>
          </span>
        </Link>
        <p className="mb-3 hidden text-[10px] font-bold tracking-widest text-slate-400 lg:block">
          RUANG KERJA
        </p>
        <nav className="flex gap-2 lg:flex-col">
          {navigation.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={path === n.href ? "page" : undefined}
              className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${path === n.href ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <n.icon size={19} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 hidden rounded-xl bg-slate-50 p-4 text-xs text-slate-500 lg:block">
          <Coffee className="mb-3 text-amber-700" />
          <p className="font-bold text-slate-800">Seduh hari yang baik.</p>
          <p className="mt-1 leading-relaxed">
            Setiap cangkir punya cerita. Kelola kedai Anda dengan mudah.
          </p>
        </div>
      </aside>
      <div className="min-w-0 flex-1 lg:ml-60">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-6 py-4">
          <div className="text-sm font-medium">
            Kedai LEVELUP{" "}
            <span className="ml-2 text-slate-400">/ Operasional</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${s.connected ? "bg-emerald-500" : "bg-amber-400"}`}
            />
            <span>
              {s.demo
                ? "Mode demo lokal"
                : s.connected
                  ? "Terhubung langsung"
                  : "Menghubungkan layanan"}
            </span>
            <button
              title="Muat ulang data"
              aria-label="Muat ulang data"
              onClick={() => void s.refresh()}
            >
              <RefreshCw size={16} />
            </button>
            {s.session && (
              <button aria-label="Keluar" onClick={() => void s.logout()}>
                <LogOut size={16} />
              </button>
            )}
            <span className="rounded-full bg-blue-100 px-3 py-2 font-bold text-blue-700">
              {s.role === "barista"
                ? "Barista"
                : s.role === "cashier"
                  ? "Kasir"
                  : "Manajer"}
            </span>
          </div>
        </header>
        <main className="p-4 md:p-7">
          {s.demo && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              Mode demo · Data disimpan di browser ini. Pembayaran adalah
              simulasi, tanpa penagihan nyata.
            </div>
          )}
          {!s.demo && (
            <p className="mb-4 text-xs text-amber-700">
              Pembayaran simulasi aktif — jangan gunakan untuk menagih pelanggan
              nyata.
            </p>
          )}
          {s.error && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {s.error}
              <button aria-label="Tutup pesan" onClick={s.clearError}>
                <X size={18} />
              </button>
            </div>
          )}
          {s.notice && (
            <div
              role="status"
              className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              {s.notice}
            </div>
          )}
          {s.loading ? (
            <p className="py-24 text-center text-slate-500">
              Memuat ruang kerja…
            </p>
          ) : !s.demo && !s.session ? (
            <form
              className="panel mx-auto max-w-sm space-y-5 p-7"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await s.login(email, password);
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h1 className="text-2xl font-bold">Masuk ke kedai</h1>
              <p className="text-sm text-slate-500">
                Gunakan akun staf yang terdaftar.
              </p>
              <label className="label">
                Email
                <input
                  className="field mt-2"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="label">
                Kata sandi
                <input
                  className="field mt-2"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="btn w-full" disabled={busy}>
                {busy ? "Memproses…" : "Masuk"}
              </button>
            </form>
          ) : !s.demo && !s.role ? (
            <div className="panel p-8">
              Akses staf belum diberikan. Hubungi administrator untuk menetapkan
              role akun.
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
