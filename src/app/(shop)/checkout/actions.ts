"use server";

import { getProfile, getCurrentUser } from "@/lib/auth";
import { createAddress, listAddresses } from "@/lib/addresses";
import type { CartQuote } from "@/lib/cart/quote";
import { cleanLines, priceCheckout } from "@/lib/checkout/server";
import { MIN_PAYMENT, type CheckoutTotals } from "@/lib/checkout/totals";
import { createRazorpayOrder, razorpayConfig, verifyPaymentSignature } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, type FieldErrors } from "@/lib/validation/account";
import {
  checkoutSchema,
  paymentFailureSchema,
  paymentResultSchema,
  sessionIdSchema,
  type ShippingAddress,
} from "@/lib/validation/checkout";

export interface CheckoutPreview {
  quote: CartQuote;
  totals: CheckoutTotals;
  coupon: { code: string; discount: number } | null;
  couponError: string | null;
}

/** Live order summary for the checkout page (prices from the database, never the browser). */
export async function previewCheckoutAction(lines: unknown, couponCode: unknown): Promise<CheckoutPreview> {
  return priceCheckout(cleanLines(lines), typeof couponCode === "string" ? couponCode.slice(0, 40) : null);
}

export type StartCheckoutResult =
  | {
      ok: true;
      orderId: string;
      razorpay: { keyId: string; orderId: string; amount: number; name: string; email: string; contact: string };
    }
  | { ok: false; reason: "invalid"; message: string; fields: FieldErrors }
  | { ok: false; reason: "cart_changed" | "coupon"; message: string; preview: CheckoutPreview }
  | { ok: false; reason: "unavailable" | "error"; message: string };

const TRY_AGAIN = "Something went wrong on our side. Please try again in a moment.";

/**
 * Step 1 of paying: re-price the cart on the server, save an unpaid order with
 * those prices, and open a Razorpay order for exactly that total.
 */
export async function startCheckoutAction(
  detailsInput: unknown,
  linesInput: unknown,
  couponCode: unknown,
  sessionId: unknown,
): Promise<StartCheckoutResult> {
  const config = razorpayConfig();
  const admin = createAdminClient();
  if (!config.configured || !admin) {
    return { ok: false, reason: "unavailable", message: "Online payment isn't switched on yet. Please order on WhatsApp." };
  }

  const parsed = checkoutSchema.safeParse(detailsInput);
  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  }
  const details = parsed.data;
  const session = await getCurrentUser();

  // Where it's going: a saved address (must be the customer's own) or a new one.
  let address: ShippingAddress;
  if (details.addressMode === "saved") {
    if (!session) return { ok: false, reason: "invalid", message: "Please sign in again to use a saved address.", fields: {} };
    const saved = (await listAddresses(session.supabase, session.user.id)).find((a) => a.id === details.addressId);
    if (!saved) {
      return { ok: false, reason: "invalid", message: "Please choose a delivery address.", fields: { addressId: "Please choose a delivery address" } };
    }
    address = {
      name: saved.name,
      phone: saved.phone,
      line1: saved.line1,
      line2: saved.line2,
      city: saved.city,
      state: saved.state as ShippingAddress["state"],
      pincode: saved.pincode,
    };
  } else {
    address = details.address;
  }

  const lines = cleanLines(linesInput);
  const priced = await priceCheckout(lines, typeof couponCode === "string" ? couponCode.slice(0, 40) : null);
  if (priced.quote.lines.length === 0 || priced.quote.hasIssues || priced.quote.itemCount === 0) {
    return {
      ok: false,
      reason: "cart_changed",
      message: "Some items in your cart have changed. Please check your cart before paying.",
      preview: priced,
    };
  }
  if (priced.couponError) return { ok: false, reason: "coupon", message: priced.couponError, preview: priced };
  if (priced.totals.total < MIN_PAYMENT) {
    return { ok: false, reason: "error", message: "The order total is too small to pay online." };
  }

  const checkoutSessionId = sessionIdSchema.safeParse(sessionId);
  const { data: orderId, error } = await admin.rpc("create_pending_order", {
    order_row: {
      user_id: session?.user.id ?? "",
      email: details.email,
      phone: details.phone,
      shipping_address: address,
      subtotal: priced.totals.subtotal,
      discount: priced.totals.discount,
      shipping_fee: priced.totals.shippingFee,
      total: priced.totals.total,
      coupon_code: priced.coupon?.code ?? "",
      checkout_session_id: checkoutSessionId.success ? checkoutSessionId.data : "",
    },
    items: priced.quote.lines.map((l) => ({
      product_id: l.productId,
      variant_id: l.variantId ?? "",
      name: l.variantName ? `${l.name} (${l.variantName})` : l.name,
      price: l.unitPrice,
      qty: l.qty,
    })),
  });
  if (error || typeof orderId !== "string") {
    console.error("Could not create order:", error?.message);
    return { ok: false, reason: "error", message: TRY_AGAIN };
  }

  let razorpayOrderId: string;
  try {
    const rzp = await createRazorpayOrder({
      amount: priced.totals.total,
      receipt: orderId.slice(0, 40),
      notes: { order_id: orderId },
    });
    razorpayOrderId = rzp.id;
  } catch (e) {
    console.error("Razorpay order failed:", e);
    return { ok: false, reason: "error", message: "We couldn't reach the payment service. Please try again." };
  }

  const { error: linkError } = await admin.from("orders").update({ razorpay_order_id: razorpayOrderId }).eq("id", orderId);
  if (linkError) {
    console.error("Could not link Razorpay order:", linkError.message);
    return { ok: false, reason: "error", message: TRY_AGAIN };
  }

  // Keep a new address for next time, if the customer asked (never blocks payment).
  if (session && details.addressMode === "new" && details.saveAddress) {
    await createAddress(session.supabase, session.user.id, { ...details.address, isDefault: false }).catch((e) =>
      console.warn("Could not save address from checkout:", e),
    );
  }

  const profile = session ? await getProfile(session).catch(() => null) : null;
  return {
    ok: true,
    orderId,
    razorpay: {
      keyId: config.keyId,
      orderId: razorpayOrderId,
      amount: priced.totals.total,
      name: profile?.full_name ?? address.name,
      email: details.email,
      contact: `+91${details.phone}`,
    },
  };
}

export type ConfirmPaymentResult =
  | { ok: true; orderId: string; accessKey: string; orderNumber: string }
  | { ok: false; message: string };

/**
 * Step 2: Razorpay says the payment went through. Check its signature (so it
 * can't be faked), then mark the order paid and reduce stock. The webhook does
 * the same if the customer closes the tab first; whichever arrives first wins.
 */
export async function confirmPaymentAction(input: unknown): Promise<ConfirmPaymentResult> {
  const parsed = paymentResultSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "We couldn't confirm that payment. If money left your account, message us on WhatsApp." };
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    console.warn("Payment signature mismatch for", razorpay_order_id);
    return { ok: false, message: "We couldn't confirm that payment. If money left your account, message us on WhatsApp." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, message: TRY_AGAIN };
  const { data, error } = await admin
    .rpc("mark_order_paid", { p_razorpay_order_id: razorpay_order_id, p_razorpay_payment_id: razorpay_payment_id })
    .single<{ order_id: string; order_number: string; access_key: string }>();
  if (error || !data) {
    console.error("mark_order_paid failed:", error?.message);
    return { ok: false, message: "Your payment went through, but we couldn't finish saving your order. Please message us on WhatsApp." };
  }
  return { ok: true, orderId: data.order_id, accessKey: data.access_key, orderNumber: data.order_number };
}

/** A payment attempt failed (wrong PIN, bank declined…). The order stays open for another try. */
export async function reportPaymentFailureAction(input: unknown): Promise<void> {
  const parsed = paymentFailureSchema.safeParse(input);
  const admin = createAdminClient();
  if (!parsed.success || !admin) return;
  const { error } = await admin.rpc("record_payment_failure", {
    p_razorpay_order_id: parsed.data.razorpay_order_id,
    p_razorpay_payment_id: parsed.data.razorpay_payment_id,
    p_reason: parsed.data.reason,
  });
  if (error) console.error("Could not record payment failure:", error.message);
}
