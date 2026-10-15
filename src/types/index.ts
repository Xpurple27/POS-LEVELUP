export type Category = "Kopi" | "Non-Kopi" | "Makanan";
export type OrderStatus = "pending" | "cooking" | "completed";
export type PaymentStatus = "unpaid" | "paid";
export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  is_available: boolean;
};
export type ProductInput = Omit<Product, "id">;
export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  unit_price: number;
};
export interface Order {
  id: string;
  customer_name: string;
  total_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
  order_items: OrderItem[];
}
export type CartItem = { product_id: string; quantity: number };
export type StaffRole = "cashier" | "barista" | "manager";
type Table<R, I, U> = { Row: R; Insert: I; Update: U; Relationships: [] };
export interface Database {
  public: {
    Tables: {
      products: Table<
        Product,
        ProductInput & { id?: string },
        Partial<ProductInput>
      >;
      orders: Table<Omit<Order, "order_items">, never, never>;
      order_items: Table<OrderItem, never, never>;
      staff_profiles: Table<{ id: string; role: StaffRole }, never, never>;
    };
    Views: { [_ in never]: never };
    Functions: {
      checkout_order: {
        Args: {
          request_id: string;
          customer: string;
          items: CartItem[];
          paid: boolean;
        };
        Returns: string;
      };
      pay_order: { Args: { target_order: string }; Returns: undefined };
      set_order_status: {
        Args: { target_order: string; next_status: OrderStatus };
        Returns: undefined;
      };
      delete_product: { Args: { target_product: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
