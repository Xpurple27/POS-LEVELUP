"use client";
import { useState } from "react";
import { Clock, ChefHat, CheckCircle2, ArrowRight } from "lucide-react";
import { useStore } from "@/components/provider";
import type { OrderStatus } from "@/types";
const columns: { status: OrderStatus; label: string; color: string }[] = [
  { status: "pending", label: "Antrean baru", color: "bg-amber-400" },
  { status: "cooking", label: "Sedang dibuat", color: "bg-blue-500" },
  { status: "completed", label: "Siap disajikan", color: "bg-emerald-500" },
];
export default function Kds() {
  const s = useStore(),
    [busy, setBusy] = useState<string[]>([]);
  const orders = s.orders.filter(
    (o) =>
      o.payment_status === "paid" &&
      (o.status !== "completed" ||
        new Date(o.created_at).toLocaleDateString("en-CA", {
          timeZone: "Asia/Jakarta",
        }) ===
          new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" })),
  );
  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-blue-600">
            DAPUR / PESANAN LANGSUNG
          </p>
          <h1 className="text-3xl font-bold">Di balik setiap sajian.</h1>
          <p className="mt-2 text-sm text-slate-500">
            Pesanan berbayar masuk otomatis. Racik dengan sepenuh hati.
          </p>
        </div>
        <span className="rounded-xl border bg-white px-4 py-3 text-sm">
          <ChefHat className="mr-2 inline" size={18} />
          {orders.filter((o) => o.status !== "completed").length} pesanan aktif
        </span>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {columns.map((col) => {
          const list = orders
            .filter((o) => o.status === col.status)
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
          return (
            <section key={col.status} className="rounded-2xl bg-slate-100 p-3">
              <h2 className="mb-4 flex items-center gap-2 p-2 text-sm font-bold">
                <span className={`h-2 w-2 rounded-full ${col.color}`} />
                {col.label}
                <span className="ml-auto rounded-md bg-white px-2 py-1 text-xs text-slate-500">
                  {list.length}
                </span>
              </h2>
              <div className="space-y-4">
                {list.map((o) => (
                  <article key={o.id} className="panel p-5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>#{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(o.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Jakarta",
                        })}
                      </span>
                    </div>
                    <h3 className="mb-4 mt-2 text-lg font-bold">
                      {o.customer_name}
                    </h3>
                    <ul className="space-y-3 border-y border-dashed py-4">
                      {o.order_items.map((i) => (
                        <li key={i.id} className="flex gap-3 text-sm">
                          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold">
                            {i.quantity}×
                          </span>
                          <span className="pt-0.5">{i.product_name}</span>
                        </li>
                      ))}
                    </ul>
                    {col.status === "completed" ? (
                      <p className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600">
                        <CheckCircle2 size={18} />
                        Pesanan selesai
                      </p>
                    ) : (
                      <button
                        disabled={busy.includes(o.id) || s.role === "cashier"}
                        className={`btn mt-4 w-full ${col.status === "cooking" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                        onClick={async () => {
                          setBusy((v) => [...v, o.id]);
                          try {
                            await s.advance(
                              o.id,
                              col.status === "pending"
                                ? "cooking"
                                : "completed",
                            );
                          } catch {
                          } finally {
                            setBusy((v) => v.filter((id) => id !== o.id));
                          }
                        }}
                      >
                        {busy.includes(o.id)
                          ? "Menyimpan…"
                          : col.status === "pending"
                            ? "Mulai buat"
                            : "Selesaikan pesanan"}
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </article>
                ))}
                {list.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-400">
                    Belum ada pesanan
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
