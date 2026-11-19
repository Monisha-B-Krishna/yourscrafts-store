import "server-only";
import type { Session } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORDER_NUMBER_PATTERN, type HistoryEntry, type OrderStatus } from "./timeline";

/**
 * Reading orders for customers. Only PAID orders are ever shown (unpaid ones
 * are abandoned checkouts). Internal notes are never selected.
 */

export interface OrderSummary {
  id: string;
  order_number: string;
  status: OrderStatus;
  paid_at: string;
  total: number;
  items: { name_snapshot: string; qty: number }[];
}

export interface OrderDetail {
  id: string;
  order_number: string;
  access_key: string;
  email: string;
  status: OrderStatus;
  paid_at: string;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  coupon_code: string | null;
  courier: string | null;
  tracking_id: string | null;
  stock_short: boolean;
  shipping_address: {
    name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  items: {
    name_snapshot: string;
    price_snapshot: number;
    qty: number;
    product: { slug: string; type: string } | null;
  }[];
  history: HistoryEntry[];
}

const DETAIL_COLUMNS =
  "id, order_number, access_key, email, status, paid_at, subtotal, discount, shipping_fee, total, coupon_code, courier, tracking_id, stock_short, shipping_address, items:order_items (name_snapshot, price_snapshot, qty, product:products (slug, type)), history:order_status_history (status, created_at)";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The signed-in customer's paid orders, newest first. */
export async function listMyOrders(session: Session): Promise<OrderSummary[]> {
  const { data, error } = await session.supabase
    .from("orders")
    .select("id, order_number, status, paid_at, total, items:order_items (name_snapshot, qty)")
    .eq("user_id", session.user.id)
    .eq("payment_status", "paid")
    .order("paid_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Could not load orders: ${error.message}`);
  return (data ?? []) as unknown as OrderSummary[];
}

/**
 * One paid order, for whoever may see it:
 *   - anyone holding its secret link key (guests, email links), or
 *   - the signed-in customer who placed it (checked by Row Level Security).
 */
export async function getOrder(
  orderNumber: string,
  access: { key?: string | null; session?: Session | null },
): Promise<OrderDetail | null> {
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) return null;

  if (access.key && UUID.test(access.key)) {
    const admin = createAdminClient();
    if (admin) {
      const { data, error } = await admin
        .from("orders")
        .select(DETAIL_COLUMNS)
        .eq("order_number", orderNumber)
        .eq("access_key", access.key)
        .eq("payment_status", "paid")
        .maybeSingle();
      if (error) throw new Error(`Could not load order: ${error.message}`);
      if (data) return data as unknown as OrderDetail;
    }
  }

  if (access.session) {
    const { data, error } = await access.session.supabase
      .from("orders")
      .select(DETAIL_COLUMNS)
      .eq("order_number", orderNumber)
      .eq("user_id", access.session.user.id)
      .eq("payment_status", "paid")
      .maybeSingle();
    if (error) throw new Error(`Could not load order: ${error.message}`);
    if (data) return data as unknown as OrderDetail;
  }
  return null;
}

/**
 * Guest tracking: order number + the email used at checkout. Returns the
 * order's link key only when both match; any mismatch looks the same.
 */
export async function findGuestOrder(orderNumber: string, email: string): Promise<{ accessKey: string } | null> {
  const admin = createAdminClient();
  if (!admin || !ORDER_NUMBER_PATTERN.test(orderNumber)) return null;
  const { data, error } = await admin
    .from("orders")
    .select("access_key")
    .eq("order_number", orderNumber)
    .eq("email", email.trim().toLowerCase())
    .eq("payment_status", "paid")
    .maybeSingle();
  if (error) throw new Error(`Could not look up order: ${error.message}`);
  return data ? { accessKey: data.access_key as string } : null;
}

/** Link to an order's tracking page that works without signing in. */
export const orderLink = (orderNumber: string, accessKey: string) =>
  `/orders/${encodeURIComponent(orderNumber)}?key=${encodeURIComponent(accessKey)}`;
