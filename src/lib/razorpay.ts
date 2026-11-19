import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay (CLAUDE.md §8). Test-mode keys start with rzp_test_ and move no
 * real money. All three keys stay on the server; the key id is also sent to
 * the browser when checkout opens (it is public by design).
 */
export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return {
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    // Only for automated tests; leave unset so the real Razorpay API is used.
    apiBase: (process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1").replace(/\/$/, ""),
    configured: /^rzp_(test|live)_/.test(keyId) && keySecret.length > 0,
    testMode: keyId.startsWith("rzp_test_"),
  };
}

export const isRazorpayConfigured = () => razorpayConfig().configured;

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

/** Creates the Razorpay order the customer pays against. Amount is in paise. */
export async function createRazorpayOrder(input: {
  amount: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const config = razorpayConfig();
  if (!config.configured) throw new Error("Razorpay keys are not set");

  const response = await fetch(`${config.apiBase}/orders`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({ amount: input.amount, currency: "INR", receipt: input.receipt, notes: input.notes }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => null)) as (RazorpayOrder & { error?: { description?: string } }) | null;
  if (!response.ok || !body?.id) {
    throw new Error(`Razorpay order failed (${response.status}): ${body?.error?.description ?? "no details"}`);
  }
  if (body.amount !== input.amount || body.currency !== "INR") {
    throw new Error("Razorpay returned an order for a different amount");
  }
  return body;
}

function hmacHex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Constant-time comparison, so the signature can't be guessed byte by byte. */
function safeEqualHex(expected: string, received: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received.toLowerCase(), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Proves the browser's "payment succeeded" message really came from Razorpay. */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret = razorpayConfig().keySecret,
): boolean {
  if (!secret) return false;
  return safeEqualHex(hmacHex(secret, `${razorpayOrderId}|${razorpayPaymentId}`), signature);
}

/** Proves a webhook call really came from Razorpay (signed with the webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret = razorpayConfig().webhookSecret): boolean {
  if (!secret) return false;
  return safeEqualHex(hmacHex(secret, rawBody), signature);
}
