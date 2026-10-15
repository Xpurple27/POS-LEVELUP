"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { initialDemo } from "@/lib/demo";
import { calculateTotal } from "@/lib/domain";
import type {
  CartItem,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  ProductInput,
  StaffRole,
} from "@/types";
const demo =
  !process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
interface Store {
  products: Product[];
  orders: Order[];
  loading: boolean;
  error: string;
  notice: string;
  demo: boolean;
  session: Session | null;
  role: StaffRole | null;
  connected: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkout: (
    items: CartItem[],
    customer: string,
    paid: boolean,
    id: string,
  ) => Promise<void>;
  pay: (id: string) => Promise<void>;
  advance: (id: string, status: OrderStatus) => Promise<void>;
  saveProduct: (input: ProductInput, id?: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  clearError: () => void;
}
const Context = createContext<Store | null>(null);
const storageKey = "levelup-demo-v2";
function message(e: unknown) {
  return e instanceof Error
    ? e.message
    : "Operasi gagal. Periksa koneksi dan hak akses Anda.";
}
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [session, setSession] = useState<Session | null>(null),
    [role, setRole] = useState<StaffRole | null>(null),
    [connected, setConnected] = useState(false);
  const demoState = useRef(initialDemo());
  const loadDemo = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          !("products" in parsed) ||
          !("orders" in parsed) ||
          !Array.isArray(parsed.products) ||
          !Array.isArray(parsed.orders)
        )
          throw new Error("Data demo rusak.");
        demoState.current = parsed as { products: Product[]; orders: Order[] };
      }
      setProducts(demoState.current.products);
      setOrders(demoState.current.orders);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, []);
  const persist = () => {
    localStorage.setItem(storageKey, JSON.stringify(demoState.current));
    setProducts([...demoState.current.products]);
    setOrders([...demoState.current.orders]);
    window.dispatchEvent(new Event("levelup-update"));
  };
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (demo) {
      loadDemo();
      return;
    }
    const generation = ++sequence.current;
    try {
      const db = getSupabase();
      const [p, o] = await Promise.all([
        db.from("products").select("*").order("name"),
        db
          .from("orders")
          .select(
            "id,customer_name,total_amount,status,payment_status,created_at",
          )
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);
      if (p.error || o.error)
        throw new Error(
          "Data tidak dapat dimuat. Periksa koneksi, skema SQL, dan role staf.",
        );
      const orderItems: OrderItem[] = [];
      const ids = o.data.map((order) => order.id);
      for (let start = 0; start < ids.length; start += 100) {
        const batch = ids.slice(start, start + 100);
        for (let offset = 0; ; offset += 1000) {
          const { data, error: itemError } = await db
            .from("order_items")
            .select("*")
            .in("order_id", batch)
            .order("id")
            .range(offset, offset + 999);
          if (itemError)
            throw new Error("Rincian pesanan gagal dimuat. Coba kembali.");
          orderItems.push(...data);
          if (data.length < 1000) break;
        }
      }
      if (generation !== sequence.current) return;
      setProducts(p.data);
      setOrders(
        o.data.map((order) => ({
          ...order,
          order_items: orderItems.filter((item) => item.order_id === order.id),
        })),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, [loadDemo]);
  useEffect(() => {
    if (demo) {
      loadDemo();
      setRole("manager");
      setConnected(true);
      const listener = () => loadDemo();
      window.addEventListener("storage", listener);
      return () => window.removeEventListener("storage", listener);
    }
    try {
      const db = getSupabase();
      let active = true;
      const update = async (next: Session | null) => {
        if (!active) return;
        setSession(next);
        if (!next) {
          sequence.current++;
          setProducts([]);
          setOrders([]);
          setRole(null);
          setLoading(false);
          return;
        }
        const { data, error: roleError } = await db
          .from("staff_profiles")
          .select("role")
          .eq("id", next.user.id)
          .single();
        if (!active) return;
        if (roleError) {
          setError("Akun belum memiliki role staf. Hubungi manajer.");
          setRole(null);
        } else setRole(data.role);
        await refresh();
      };
      db.auth.getSession().then(({ data, error: authError }) => {
        if (authError)
          setError("Sesi tidak dapat diperiksa. Silakan masuk kembali.");
        void update(data.session);
      });
      const { data: subscription } = db.auth.onAuthStateChange(
        (_event, next) => {
          setTimeout(() => void update(next), 0);
        },
      );
      return () => {
        active = false;
        subscription.subscription.unsubscribe();
      };
    } catch (e) {
      setError(message(e));
      setLoading(false);
    }
  }, [loadDemo, refresh]);
  useEffect(() => {
    if (demo || !session) return;
    const db = getSupabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reload = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 250);
    };
    const channel = db
      .channel("kedai-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        reload,
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") reload();
      });
    const interval = setInterval(reload, 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      void db.removeChannel(channel);
      setConnected(false);
    };
  }, [session, refresh]);
  async function mutate(operation: () => Promise<void>, success: string) {
    setError("");
    try {
      await operation();
      await refresh();
      setNotice(success);
    } catch (e) {
      setError(message(e));
      throw e;
    }
  }
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  const store: Store = {
    products,
    orders,
    loading,
    error,
    notice,
    demo,
    session,
    role,
    connected,
    refresh,
    clearError: () => setError(""),
    login: async (email, password) => {
      try {
        const { error: e } = await getSupabase().auth.signInWithPassword({
          email,
          password,
        });
        if (e)
          throw new Error(
            "Email atau kata sandi salah, atau layanan tidak tersedia.",
          );
      } catch (e) {
        setError(message(e));
        throw e;
      }
    },
    logout: async () => {
      const { error: e } = await getSupabase().auth.signOut();
      if (e) setError("Gagal keluar. Coba kembali.");
    },
    checkout: async (items, customer, paid, id) =>
      mutate(
        async () => {
          const total = calculateTotal(items, products);
          if (!customer.trim() || customer.trim().length > 100)
            throw new Error(
              "Isi nama pelanggan atau meja (maksimal 100 karakter).",
            );
          if (demo) {
            if (!demoState.current.orders.some((o) => o.id === id)) {
              demoState.current.orders.unshift({
                id,
                customer_name: customer.trim(),
                total_amount: total,
                status: "pending",
                payment_status: paid ? "paid" : "unpaid",
                created_at: new Date().toISOString(),
                order_items: items.map((item) => {
                  const p = products.find((p) => p.id === item.product_id)!;
                  return {
                    ...item,
                    id: crypto.randomUUID(),
                    order_id: id,
                    product_name: p.name,
                    unit_price: p.price,
                  };
                }),
              });
              persist();
            }
          } else {
            const { error: e } = await getSupabase().rpc("checkout_order", {
              request_id: id,
              customer: customer.trim(),
              items,
              paid,
            });
            if (e)
              throw new Error(
                "Pesanan gagal disimpan. Periksa koneksi dan ketersediaan menu, lalu coba lagi.",
              );
          }
        },
        paid
          ? "Pembayaran simulasi berhasil. Pesanan dikirim ke dapur."
          : "Bill tersimpan. Bayar melalui daftar bill tersimpan.",
      ),
    pay: async (id) =>
      mutate(async () => {
        if (demo) {
          demoState.current.orders = demoState.current.orders.map((o) =>
            o.id === id ? { ...o, payment_status: "paid" } : o,
          );
          persist();
        } else {
          const { error: e } = await getSupabase().rpc("pay_order", {
            target_order: id,
          });
          if (e) throw new Error("Pembayaran gagal disimpan. Coba kembali.");
        }
      }, "Pembayaran simulasi berhasil."),
    advance: async (id, status) =>
      mutate(async () => {
        if (demo) {
          demoState.current.orders = demoState.current.orders.map((o) =>
            o.id === id ? { ...o, status } : o,
          );
          persist();
        } else {
          const { error: e } = await getSupabase().rpc("set_order_status", {
            target_order: id,
            next_status: status,
          });
          if (e)
            throw new Error(
              "Status sudah berubah atau akses ditolak. Muat ulang pesanan.",
            );
        }
      }, "Status pesanan diperbarui."),
    saveProduct: async (input, id) =>
      mutate(async () => {
        if (
          !input.name.trim() ||
          input.name.length > 150 ||
          !Number.isInteger(input.price) ||
          input.price < 1 ||
          input.price > 1000000
        )
          throw new Error("Nama dan harga menu tidak valid.");
        if (demo) {
          demoState.current.products = id
            ? demoState.current.products.map((p) =>
                p.id === id ? { ...input, id } : p,
              )
            : [
                ...demoState.current.products,
                { ...input, id: crypto.randomUUID() },
              ];
          persist();
        } else {
          const query = id
            ? getSupabase().from("products").update(input).eq("id", id)
            : getSupabase().from("products").insert(input);
          const { error: e } = await query;
          if (e)
            throw new Error(
              "Menu gagal disimpan. Pastikan Anda memiliki role manajer.",
            );
        }
      }, "Menu berhasil disimpan."),
    deleteProduct: async (id) =>
      mutate(async () => {
        if (demo) {
          if (
            demoState.current.orders.some((o) =>
              o.order_items.some((i) => i.product_id === id),
            )
          )
            throw new Error(
              "Menu sudah dipakai dalam transaksi. Nonaktifkan ketersediaannya.",
            );
          demoState.current.products = demoState.current.products.filter(
            (p) => p.id !== id,
          );
          persist();
        } else {
          const { error: e } = await getSupabase().rpc("delete_product", {
            target_product: id,
          });
          if (e)
            throw new Error(
              "Menu tidak dapat dihapus. Nonaktifkan menu yang memiliki riwayat transaksi.",
            );
        }
      }, "Menu berhasil dihapus."),
  };
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("Provider aplikasi tidak tersedia.");
  return store;
}
