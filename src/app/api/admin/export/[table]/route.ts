import { getCurrentUser, getProfile } from "@/lib/auth";
import { toCsv } from "@/lib/admin/csv";

/**
 * CSV downloads for analysis (CLAUDE.md §6). Owner only: checked here and by
 * Row Level Security. Secrets (order link keys) are never included.
 */
const EXPORTS = {
  orders: {
    table: "orders",
    columns: [
      "id", "order_number", "user_id", "email", "phone", "shipping_address", "subtotal", "discount", "shipping_fee",
      "total", "coupon_code", "status", "payment_status", "paid_at", "razorpay_order_id", "razorpay_payment_id",
      "courier", "tracking_id", "notes", "stock_short", "checkout_session_id", "confirmation_email_sent_at",
      "created_at", "updated_at",
    ],
  },
  order_items: {
    table: "order_items",
    columns: ["id", "order_id", "product_id", "variant_id", "name_snapshot", "price_snapshot", "qty", "created_at"],
  },
  order_status_history: {
    table: "order_status_history",
    columns: ["id", "order_id", "status", "note", "changed_by", "created_at"],
  },
  products: {
    table: "products",
    columns: [
      "id", "name", "slug", "category_id", "type", "price", "sale_price", "effective_price", "stock", "sku", "tags",
      "is_featured", "is_active", "weight_g", "dimensions", "sales_count", "created_at", "updated_at",
    ],
  },
  events: {
    table: "events",
    columns: ["id", "session_id", "user_id", "event_name", "product_id", "metadata", "created_at"],
  },
} as const;

type Name = keyof typeof EXPORTS | "customers";
const BATCH = 1000;
const MAX_ROWS = 200_000;

export async function GET(_request: Request, { params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  const session = await getCurrentUser();
  if (!session || (await getProfile(session))?.role !== "admin") return new Response("Not found", { status: 404 });
  if (!(table in EXPORTS) && table !== "customers") return new Response("Unknown export", { status: 404 });
  const name = table as Name;

  const rows: Record<string, unknown>[] = [];
  let columns: string[];
  if (name === "customers") {
    columns = ["email", "full_name", "phone", "user_id", "registered", "joined_at", "orders", "lifetime_value", "last_order_at"];
    for (let offset = 0; offset < MAX_ROWS; offset += BATCH) {
      const { data, error } = await session.supabase.rpc("admin_customers", { p_search: null, p_limit: BATCH, p_offset: offset });
      if (error) return new Response(`Export failed: ${error.message}`, { status: 500 });
      rows.push(...((data ?? []) as Record<string, unknown>[]));
      if (!data || data.length < BATCH) break;
    }
  } else {
    const spec = EXPORTS[name];
    columns = [...spec.columns];
    for (let from = 0; from < MAX_ROWS; from += BATCH) {
      const { data, error } = await session.supabase
        .from(spec.table)
        .select(columns.join(","))
        .order("created_at")
        .order("id")
        .range(from, from + BATCH - 1);
      if (error) return new Response(`Export failed: ${error.message}`, { status: 500 });
      rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
      if (!data || data.length < BATCH) break;
    }
  }

  const stamp = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  return new Response("﻿" + toCsv(rows, columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="yourscrafts-${name}-${stamp}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
