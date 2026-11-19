/**
 * Loads Razorpay's payment window (checkout.js) and opens it for one order.
 * https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
 */

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailure {
  error?: { reason?: string; metadata?: { payment_id?: string } };
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: RazorpayFailure) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.Razorpay ? resolve() : reject(new Error("Razorpay did not load")));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Could not load Razorpay"));
    };
    document.body.appendChild(script);
  });
  return loading;
}

export async function openRazorpay(options: {
  keyId: string;
  orderId: string;
  amount: number;
  name: string;
  email: string;
  contact: string;
  onSuccess: (payment: RazorpaySuccess) => void;
  onFailure: (failure: { razorpay_payment_id: string | null; reason: string | null }) => void;
  onDismiss: () => void;
}) {
  await loadScript();
  const instance = new window.Razorpay!({
    key: options.keyId,
    order_id: options.orderId,
    amount: options.amount,
    currency: "INR",
    name: "Yours Crafts Woman",
    description: "Handmade with love",
    prefill: { name: options.name, email: options.email, contact: options.contact },
    theme: { color: "#F4A27A" },
    // Razorpay keeps the window open after a failed attempt so the customer can retry.
    retry: { enabled: true },
    handler: (response: RazorpaySuccess) => options.onSuccess(response),
    modal: { ondismiss: options.onDismiss, confirm_close: true },
  });
  instance.on("payment.failed", (response) =>
    options.onFailure({
      razorpay_payment_id: response.error?.metadata?.payment_id ?? null,
      reason: response.error?.reason ?? null,
    }),
  );
  instance.open();
}
