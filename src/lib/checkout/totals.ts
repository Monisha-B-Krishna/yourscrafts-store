import { shippingFee } from "@/lib/pricing";
import type { StoreSettings } from "@/lib/settings";
import type { Paise } from "@/lib/types";

/**
 * Coupon rules and order totals for checkout. Pure functions, so the same
 * maths runs in tests; the server always calls them with fresh database data.
 */

export interface Coupon {
  code: string;
  type: "percentage" | "flat";
  /** Percentage points, or paise for a flat discount. */
  value: number;
  min_order: Paise;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
}

export type CouponCheck = { ok: true; discount: Paise } | { ok: false; message: string };

/** "  welcome10 " → "WELCOME10". Codes are letters, digits, - and _. */
export function normaliseCouponCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9_-]{2,32}$/.test(code) ? code : null;
}

/** Is this coupon usable on this subtotal right now, and how much does it take off? */
export function checkCoupon(coupon: Coupon | null, subtotal: Paise, now: Date = new Date()): CouponCheck {
  if (!coupon) return { ok: false, message: "That code isn't valid. Please check the spelling." };
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { ok: false, message: "This code isn't active yet." };
  }
  if (coupon.ends_at && new Date(coupon.ends_at) <= now) {
    return { ok: false, message: "Sorry, this code has expired." };
  }
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return { ok: false, message: "Sorry, this code has been fully used." };
  }
  if (subtotal < coupon.min_order) {
    return { ok: false, message: `This code works on orders of ${rupees(coupon.min_order)} or more.` };
  }
  const raw = coupon.type === "percentage" ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  const discount = Math.max(0, Math.min(raw, subtotal));
  if (discount <= 0) return { ok: false, message: "This code doesn't take anything off this order." };
  return { ok: true, discount };
}

const rupees = (paise: Paise) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

export interface CheckoutTotals {
  subtotal: Paise;
  discount: Paise;
  shippingFee: Paise;
  total: Paise;
}

/**
 * Free shipping is judged on the subtotal BEFORE any coupon, so the
 * "₹X more for free shipping" message in the cart never changes at checkout.
 */
export function checkoutTotals(
  subtotal: Paise,
  discount: Paise,
  settings: Pick<StoreSettings, "flat_shipping_rate" | "free_shipping_threshold">,
): CheckoutTotals {
  const fee = shippingFee(subtotal, settings);
  const safeDiscount = Math.max(0, Math.min(discount, subtotal));
  return { subtotal, discount: safeDiscount, shippingFee: fee, total: subtotal - safeDiscount + fee };
}

/** Razorpay's smallest accepted payment is ₹1. */
export const MIN_PAYMENT: Paise = 100;
