"use client";
import { useMemo, useState } from "react";
import {
  Banknote,
  ShoppingBag,
  Trophy,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useStore } from "@/components/provider";
import { categories, rupiah } from "@/lib/domain";
import type { Product, ProductInput } from "@/types";
const day = (value: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(value),
  );
export default function Dashboard() {
  const s = useStore(),
    [date, setDate] = useState(day(new Date().toISOString())),
    [editing, setEditing] = useState<Product | null>(null),
    [open, setOpen] = useState(false),
    [input, setInput] = useState<ProductInput>({
      name: "",
      category: "Kopi",
      price: 0,
      is_available: true,
    }),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const report = useMemo(() => {
    const orders = s.orders.filter(
      (o) => day(o.created_at) === date && o.payment_status === "paid",
    );
    const counts = new Map<string, { name: string; quantity: number }>();
    orders.forEach((o) =>
      o.order_items.forEach((i) => {
        const existing = counts.get(i.product_id);
        counts.set(i.product_id, {
          name: i.product_name,
          quantity: (existing?.quantity ?? 0) + i.quantity,
        });
      }),
    );
    return {
      orders,
      revenue: orders.reduce((t, o) => t + o.total_amount, 0),
      best: [...counts.values()].sort((a, b) => b.quantity - a.quantity)[0],
    };
  }, [s.orders, date]);
  function edit(product?: Product) {
    setEditing(product ?? null);
    setInput(
      product
        ? {
            name: product.name,
            category: product.category,
            price: product.price,
            is_available: product.is_available,
          }
        : { name: "", category: "Kopi", price: 0, is_available: true },
    );
    setFormError("");
    setOpen(true);
  }
  if (s.role !== "manager")
    return <p className="panel p-6">Dasbor hanya tersedia untuk manajer.</p>;
  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-blue-600">
            MANAJER / RINGKASAN KEDAI
          </p>
          <h1 className="text-3xl font-bold">Pantau pertumbuhan kedai.</h1>
          <p className="mt-2 text-sm text-slate-500">
            Laporan penjualan dan pengelolaan menu dalam satu tempat.
          </p>
        </div>
        <label className="text-xs text-slate-500">
          Tanggal laporan · WIB
          <input
            aria-label="Tanggal laporan"
            type="date"
            className="field mt-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <div className="mb-7 grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Pendapatan",
            value: rupiah(report.revenue),
            detail: "Dari pembayaran simulasi berhasil",
            icon: Banknote,
            color: "bg-blue-50 text-blue-600",
          },
          {
            title: "Total pesanan",
            value: String(report.orders.length),
            detail: "Pesanan berbayar pada tanggal terpilih",
            icon: ShoppingBag,
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            title: "Menu terlaris",
            value: report.best?.name ?? "Belum ada penjualan",
            detail: report.best
              ? `${report.best.quantity} porsi terjual`
              : "Data akan muncul setelah transaksi",
            icon: Trophy,
            color: "bg-amber-50 text-amber-600",
          },
        ].map((card) => (
          <div key={card.title} className="panel p-6">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-slate-500">{card.title}</p>
              <span className={`rounded-xl p-2.5 ${card.color}`}>
                <card.icon size={21} />
              </span>
            </div>
            <p className="truncate text-2xl font-bold">{card.value}</p>
            <p className="mt-3 text-xs text-slate-400">{card.detail}</p>
          </div>
        ))}
      </div>
      <section className="panel mb-7 overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <h2 className="font-bold">Transaksi terbaru</h2>
          <span className="text-xs text-slate-400">{date} · WIB</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="border-y bg-slate-50 text-xs text-slate-500">
              <tr>
                {[
                  "ID pesanan",
                  "Pelanggan",
                  "Waktu",
                  "Total",
                  "Pembayaran",
                  "Status dapur",
                ].map((h) => (
                  <th key={h} className="px-5 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.orders
                .filter((o) => day(o.created_at) === date)
                .map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="px-5 py-4 font-mono text-xs">
                      #{o.id.slice(0, 8)}
                    </td>
                    <td className="px-5">{o.customer_name}</td>
                    <td className="px-5 text-slate-500">
                      {new Date(o.created_at).toLocaleTimeString("id-ID", {
                        timeZone: "Asia/Jakarta",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 font-semibold">
                      {rupiah(o.total_amount)}
                    </td>
                    <td className="px-5">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${o.payment_status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {o.payment_status === "paid"
                          ? "Lunas · Simulasi"
                          : "Belum dibayar"}
                      </span>
                    </td>
                    <td className="px-5 text-slate-500">
                      {
                        {
                          pending: "Antre",
                          cooking: "Dibuat",
                          completed: "Selesai",
                        }[o.status]
                      }
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!s.orders.some((o) => day(o.created_at) === date) && (
            <p className="p-10 text-center text-sm text-slate-400">
              Tidak ada transaksi pada tanggal ini.
            </p>
          )}
        </div>
        <p className="border-t px-5 py-3 text-xs text-slate-400">
          Data Supabase menampilkan maksimal 1.000 pesanan terbaru. Laporan ini
          bukan laporan akuntansi final.
        </p>
      </section>
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="font-bold">Manajemen menu</h2>
            <p className="mt-1 text-xs text-slate-400">
              Atur sajian dan ketersediaan menu kedai.
            </p>
          </div>
          <button className="btn" onClick={() => edit()}>
            <Plus size={16} />
            Tambah menu
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y bg-slate-50 text-xs text-slate-500">
              <tr>
                {["Nama menu", "Kategori", "Harga", "Tersedia", "Aksi"].map(
                  (h) => (
                    <th key={h} className="px-5 py-3 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {s.products.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-5 py-4 font-medium">{p.name}</td>
                  <td className="px-5 text-slate-500">{p.category}</td>
                  <td className="px-5 whitespace-nowrap">{rupiah(p.price)}</td>
                  <td className="px-5">
                    <button
                      role="switch"
                      aria-checked={p.is_available}
                      aria-label={`Ketersediaan ${p.name}`}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await s.saveProduct(
                            { ...p, is_available: !p.is_available },
                            p.id,
                          );
                        } catch {
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className={`flex h-6 w-11 items-center rounded-full p-1 ${p.is_available ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full bg-white transition-transform ${p.is_available ? "translate-x-5" : ""}`}
                      />
                    </button>
                  </td>
                  <td className="px-5">
                    <div className="flex gap-3">
                      <button
                        className="text-slate-500 hover:text-blue-600"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => edit(p)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="text-slate-400 hover:text-red-600"
                        aria-label={`Hapus ${p.name}`}
                        onClick={() => setConfirmDelete(p)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-title"
            onClick={(e) => e.stopPropagation()}
            className="panel w-full max-w-md space-y-5 p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setFormError("");
              try {
                await s.saveProduct(
                  { ...input, name: input.name.trim() },
                  editing?.id,
                );
                setOpen(false);
              } catch {
                setFormError(
                  "Menu gagal disimpan. Periksa data atau koneksi Anda.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="flex justify-between">
              <h2 id="menu-title" className="text-xl font-bold">
                {editing ? "Edit menu" : "Tambah menu"}
              </h2>
              <button
                type="button"
                disabled={busy}
                aria-label="Tutup"
                onClick={() => setOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <label className="label">
              Nama menu
              <input
                autoFocus
                className="field mt-2"
                required
                maxLength={150}
                value={input.name}
                onChange={(e) => setInput({ ...input, name: e.target.value })}
              />
            </label>
            <label className="label">
              Kategori
              <select
                className="field mt-2"
                value={input.category}
                onChange={(e) =>
                  setInput({
                    ...input,
                    category: e.target.value as Product["category"],
                  })
                }
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Harga (Rp)
              <input
                className="field mt-2"
                type="number"
                min={1}
                max={1000000}
                step={1}
                required
                value={input.price || ""}
                onChange={(e) =>
                  setInput({ ...input, price: Number(e.target.value) })
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={input.is_available}
                onChange={(e) =>
                  setInput({ ...input, is_available: e.target.checked })
                }
              />
              Menu tersedia
            </label>
            {formError && (
              <p role="alert" className="text-sm text-red-600">
                {formError}
              </p>
            )}
            <button className="btn w-full" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan menu"}
            </button>
          </form>
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="panel max-w-sm p-6"
          >
            <h2 id="delete-title" className="text-lg font-bold">
              Hapus {confirmDelete.name}?
            </h2>
            <p className="my-4 text-sm text-slate-500">
              Menu yang sudah memiliki transaksi tidak dapat dihapus. Gunakan
              pengaturan ketersediaan untuk menonaktifkannya.
            </p>
            <div className="flex gap-3">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setConfirmDelete(null)}
              >
                Batal
              </button>
              <button
                className="btn bg-red-600 hover:bg-red-700"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await s.deleteProduct(confirmDelete.id);
                    setConfirmDelete(null);
                  } catch {
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Menghapus…" : "Hapus menu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
