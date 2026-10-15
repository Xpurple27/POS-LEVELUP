"use client";
import { useMemo, useRef, useState } from "react";
import {
  Coffee,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Trash2,
  CreditCard,
  Bookmark,
  UtensilsCrossed,
  Milk,
} from "lucide-react";
import { useStore } from "@/components/provider";
import { categories, rupiah } from "@/lib/domain";
import type { CartItem } from "@/types";
export default function Pos() {
  const s = useStore(),
    [category, setCategory] = useState("Semua"),
    [search, setSearch] = useState(""),
    [cart, setCart] = useState<CartItem[]>([]),
    [customer, setCustomer] = useState(""),
    [busy, setBusy] = useState(false),
    [showBills, setShowBills] = useState(false),
    [localError, setLocalError] = useState("");
  const requestId = useRef<string | null>(null);
  const visible = useMemo(
    () =>
      s.products.filter(
        (p) =>
          (category === "Semua" || p.category === category) &&
          p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [s.products, category, search],
  );
  const total = cart.reduce(
    (sum, item) =>
      sum +
      (s.products.find((p) => p.id === item.product_id)?.price ?? 0) *
        item.quantity,
    0,
  );
  const quantity = cart.reduce((sum, i) => sum + i.quantity, 0),
    bills = s.orders.filter((o) => o.payment_status === "unpaid");
  const change = (id: string, amount: number) => {
    if (busy) return;
    requestId.current = null;
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === id);
      if (!existing) return [...prev, { product_id: id, quantity: 1 }];
      return prev
        .map((i) =>
          i.product_id === id
            ? { ...i, quantity: Math.min(100, i.quantity + amount) }
            : i,
        )
        .filter((i) => i.quantity > 0);
    });
  };
  async function submit(paid: boolean) {
    setBusy(true);
    setLocalError("");
    requestId.current ??= crypto.randomUUID();
    try {
      await s.checkout(cart, customer, paid, requestId.current);
      setCart([]);
      setCustomer("");
      requestId.current = null;
    } catch {
      setLocalError(
        "Pesanan belum berhasil disimpan. Keranjang tetap tersedia untuk dicoba kembali.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (s.role === "barista")
    return (
      <p className="panel p-6">Halaman kasir hanya untuk kasir dan manajer.</p>
    );
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">
            KASIR / PESANAN BARU
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Mulai dari secangkir kopi.
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Pilih menu favorit pelanggan, kami urus sisanya.
          </p>
        </div>
        <button className="secondary" onClick={() => setShowBills(!showBills)}>
          <Bookmark size={16} />
          Bill tersimpan{" "}
          <span className="rounded-md bg-blue-50 px-2 text-blue-600">
            {bills.length}
          </span>
        </button>
      </div>
      {showBills && (
        <section className="panel mb-6 p-5">
          <h2 className="mb-4 font-bold">Bill menunggu pembayaran</h2>
          {bills.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada bill tersimpan.</p>
          ) : (
            bills.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t py-3"
              >
                <div>
                  <p className="font-medium">{o.customer_name}</p>
                  <p className="text-xs text-slate-500">
                    {o.order_items
                      .map((i) => `${i.quantity}× ${i.product_name}`)
                      .join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <b>{rupiah(o.total_amount)}</b>
                  <button
                    className="btn"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await s.pay(o.id);
                      } catch {
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Bayar simulasi
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
        <section>
          <div className="relative mb-5">
            <Search
              className="absolute left-4 top-3.5 text-slate-400"
              size={19}
            />
            <input
              aria-label="Cari menu"
              className="field pl-11"
              placeholder="Cari kopi, minuman, atau makanan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            {["Semua", ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold ${category === c ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mb-4 flex justify-between text-xs text-slate-500">
            <span>MENU PILIHAN</span>
            <span>{visible.length} menu tersedia</span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {visible.map((p) => {
              const Icon =
                p.category === "Kopi"
                  ? Coffee
                  : p.category === "Makanan"
                    ? UtensilsCrossed
                    : Milk;
              return (
                <button
                  key={p.id}
                  disabled={!p.is_available || busy}
                  onClick={() => change(p.id, 1)}
                  className="panel group overflow-hidden text-left hover:border-blue-300 hover:shadow-md"
                >
                  <div
                    className={`relative flex h-36 items-center justify-center ${p.category === "Kopi" ? "bg-[#eee6dc]" : p.category === "Makanan" ? "bg-[#f5e9d9]" : "bg-[#e6eddf]"}`}
                  >
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/50">
                      <Icon
                        size={48}
                        strokeWidth={1.2}
                        className="text-[#82654b]"
                      />
                    </div>
                    {!p.is_available && (
                      <span className="absolute rounded-lg bg-white/95 px-3 py-2 text-xs font-bold">
                        Habis
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">
                      {p.category}
                    </p>
                    <h3 className="min-h-10 text-sm font-bold">{p.name}</h3>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-600">
                        {rupiah(p.price)}
                      </span>
                      <span className="rounded-lg bg-blue-50 p-1.5 text-blue-600 group-hover:bg-blue-600 group-hover:text-white">
                        <Plus size={17} />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {visible.length === 0 && (
            <p className="panel p-12 text-center text-slate-500">
              Menu tidak ditemukan.
            </p>
          )}
        </section>
        <aside className="panel overflow-hidden xl:sticky xl:top-6">
          <div className="flex items-center justify-between border-b p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <ShoppingBag size={19} />
              Pesanan saat ini
            </h2>
            <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
              {quantity} item
            </span>
          </div>
          <div className="p-5">
            <label className="label">
              Pelanggan / Nomor meja
              <input
                className="field mt-2"
                placeholder="Contoh: Meja 05 · Rani"
                maxLength={100}
                value={customer}
                disabled={busy}
                onChange={(e) => {
                  requestId.current = null;
                  setCustomer(e.target.value);
                }}
              />
            </label>
            <div className="min-h-44 py-4">
              {!cart.length ? (
                <div className="flex flex-col items-center py-8 text-slate-400">
                  <ShoppingBag size={36} strokeWidth={1} />
                  <p className="mt-3 text-sm">Keranjang masih kosong</p>
                  <p className="mt-1 text-xs">
                    Pilih menu untuk memulai pesanan
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const p = s.products.find((p) => p.id === item.product_id);
                  return (
                    <div key={item.product_id} className="mb-5">
                      <div className="flex items-start justify-between gap-2 text-sm">
                        <strong>{p?.name ?? "Menu dihapus"}</strong>
                        <button
                          disabled={busy}
                          aria-label={`Hapus ${p?.name}`}
                          className="text-slate-400"
                          onClick={() => {
                            requestId.current = null;
                            setCart(
                              cart.filter(
                                (i) => i.product_id !== item.product_id,
                              ),
                            );
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {rupiah(p?.price ?? 0)}
                        </span>
                        <div className="flex items-center rounded-lg border">
                          <button
                            disabled={busy}
                            aria-label={`Kurangi ${p?.name}`}
                            className="p-2"
                            onClick={() => change(item.product_id, -1)}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-6 text-center text-xs font-bold">
                            {item.quantity}
                          </span>
                          <button
                            disabled={busy || item.quantity >= 100}
                            aria-label={`Tambah ${p?.name}`}
                            className="p-2"
                            onClick={() => change(item.product_id, 1)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="space-y-3 border-t border-dashed pt-5">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{rupiah(total)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Pajak / layanan</span>
                <span>Termasuk</span>
              </div>
              <div className="flex justify-between py-3 text-lg font-bold">
                <span>Total</span>
                <span>{rupiah(total)}</span>
              </div>
            </div>
            {localError && (
              <p role="alert" className="mb-3 text-xs text-red-600">
                {localError}
              </p>
            )}
            <button
              className="btn w-full"
              disabled={busy || !cart.length || !customer.trim()}
              onClick={() => void submit(true)}
            >
              <CreditCard size={18} />
              {busy ? "Memproses…" : "Bayar · Simulasi"}
            </button>
            <button
              className="secondary mt-3 w-full"
              disabled={busy || !cart.length || !customer.trim()}
              onClick={() => void submit(false)}
            >
              <Bookmark size={16} />
              Simpan Bill
            </button>
            <p className="mt-4 text-center text-[10px] text-slate-400">
              Periksa kembali pesanan sebelum pembayaran.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
