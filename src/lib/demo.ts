import type { Product, Order } from "@/types";
export const demoProducts: Product[] = [
  [
    "11111111-1111-4111-8111-111111111111",
    "Kopi Susu Gula Aren",
    "Kopi",
    24000,
  ],
  ["22222222-2222-4222-8222-222222222222", "Caffè Latte", "Kopi", 28000],
  ["33333333-3333-4333-8333-333333333333", "Americano", "Kopi", 22000],
  ["44444444-4444-4444-8444-444444444444", "Cappuccino", "Kopi", 28000],
  ["55555555-5555-4555-8555-555555555555", "Matcha Latte", "Non-Kopi", 32000],
  ["66666666-6666-4666-8666-666666666666", "Cokelat Klasik", "Non-Kopi", 26000],
  [
    "77777777-7777-4777-8777-777777777777",
    "Croissant Mentega",
    "Makanan",
    25000,
  ],
  ["88888888-8888-4888-8888-888888888888", "Roti Panggang", "Makanan", 20000],
].map(([id, name, category, price]) => ({
  id: String(id),
  name: String(name),
  category: category as Product["category"],
  price: Number(price),
  is_available: true,
}));
export function initialDemo(): { products: Product[]; orders: Order[] } {
  const id = "99999999-9999-4999-8999-999999999999";
  return {
    products: demoProducts,
    orders: [
      {
        id,
        customer_name: "Meja 03 · Dinda",
        total_amount: 48000,
        status: "pending",
        payment_status: "paid",
        created_at: new Date().toISOString(),
        order_items: [
          {
            id: "demo-item",
            order_id: id,
            product_id: demoProducts[0].id,
            product_name: demoProducts[0].name,
            unit_price: 24000,
            quantity: 2,
          },
        ],
      },
    ],
  };
}
