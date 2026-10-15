import type { CartItem, Product } from "@/types";
export const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
export function calculateTotal(items: CartItem[], products: Product[]): number {
  if (!items.length) throw new Error("Keranjang masih kosong.");
  const seen = new Set<string>();
  return items.reduce((sum, item) => {
    const p = products.find((p) => p.id === item.product_id);
    if (!p || !p.is_available)
      throw new Error("Menu sudah tidak tersedia. Muat ulang keranjang.");
    if (
      seen.has(item.product_id) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 100
    )
      throw new Error("Kuantitas menu tidak valid.");
    seen.add(item.product_id);
    const total = sum + p.price * item.quantity;
    if (total > 100000000)
      throw new Error("Total melebihi batas Rp100.000.000.");
    return total;
  }, 0);
}
export const categories = ["Kopi", "Non-Kopi", "Makanan"] as const;
