import "server-only";
import { getProductsByIds, getSettings } from "@/lib/catalog";
import { quoteCart, type CartLineInput, type CartQuote } from "@/lib/cart/quote";
import { checkCoupon, checkoutTotals, normaliseCouponCode, type CheckoutTotals, type Coupon } from "@/lib/checkout/totals";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutLineSchema } from "@/lib/validation/checkout";

export interface PricedCheckout {
  quote: CartQuote;
  totals: CheckoutTotals;
  coupon: { code: string; discount: number } | null;
  couponError: string | null;
}

/** Keeps well-formed cart lines only (the cart comes from the browser). */
export function cleanLines(input: unknown): CartLineInput[] {
  const items = Array.isArray(input) ? input.slice(0, 50) : [];
  return items.flatMap((item) => {
    const parsed = checkoutLineSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

async function loadCoupon(code: string): Promise<Coupon | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("coupons")
    .select("code, type, value, min_order, starts_at, ends_at, usage_limit, used_count")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(`Could not check coupon: ${error.message}`);
  return data as Coupon | null;
}

/**
 * Prices the cart for checkout from the database alone: current prices and
 * stock, shipping settings, and the coupon if one was entered. The browser
 * only ever says WHICH items and how many.
 */
export async function priceCheckout(lines: CartLineInput[], rawCouponCode?: string | null): Promise<PricedCheckout> {
  const [products, settings] = await Promise.all([
    getProductsByIds(lines.map((l) => l.productId)),
    getSettings(),
  ]);
  const quote = quoteCart(lines, products, settings);

  let coupon: PricedCheckout["coupon"] = null;
  let couponError: string | null = null;
  if (rawCouponCode && rawCouponCode.trim()) {
    const code = normaliseCouponCode(rawCouponCode);
    const check = checkCoupon(code ? await loadCoupon(code) : null, quote.subtotal);
    if (check.ok && code) coupon = { code, discount: check.discount };
    else if (!check.ok) couponError = check.message;
  }

  return { quote, totals: checkoutTotals(quote.subtotal, coupon?.discount ?? 0, settings), coupon, couponError };
}

export interface ConfirmedOrder {
  id: string;
  order_number: string;
  email: string;
  created_at: string;
  paid_at: string | null;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  coupon_code: string | null;
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
  items: { name_snapshot: string; price_snapshot: number; qty: number; product: { type: string; slug: string } | null }[];
}

/**
 * A paid order for its confirmation page. The access key in the link works
 * like a receipt: only someone holding it (the buyer) can see the order.
 * Returns "pending" while payment is still being confirmed.
 */
export async function getOrderForConfirmation(orderId: string, accessKey: string): Promise<ConfirmedOrder | "pending" | null> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(orderId) || !uuid.test(accessKey)) return null;
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("orders")
    .select(
      "id, order_number, email, created_at, paid_at, payment_status, subtotal, discount, shipping_fee, total, coupon_code, stock_short, shipping_address, items:order_items (name_snapshot, price_snapshot, qty, product:products (type, slug))",
    )
    .eq("id", orderId)
    .eq("access_key", accessKey)
    .maybeSingle();
  if (error) throw new Error(`Could not load order: ${error.message}`);
  if (!data) return null;
  if (data.payment_status !== "paid") return "pending";
  return data as unknown as ConfirmedOrder;
}
