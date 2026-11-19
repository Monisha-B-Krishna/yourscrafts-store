import { after } from "next/server";
import { sendOrderConfirmation } from "@/lib/email/order-emails";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BODY_BYTES = 256 * 1024;

interface PaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  error_reason?: string | null;
}

/**
 * Razorpay calls this after every payment, even if the customer closed the
 * tab before our page heard back (CLAUDE.md §8: the source of truth).
 * Safe to receive the same event many times: marking an order paid only
 * happens once. Set it up in Razorpay → Settings → Webhooks (docs/setup.md).
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return new Response("too large", { status: 413 });

  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) return new Response("bad signature", { status: 400 });

  let event: { event?: string; payload?: { payment?: { entity?: PaymentEntity } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  // Events we don't use (refunds, settlements…) are simply acknowledged.
  if (!payment?.order_id || !payment.id) return Response.json({ ok: true, ignored: true });

  const admin = createAdminClient();
  if (!admin) return new Response("not configured", { status: 503 });

  if (event.event === "payment.captured" || event.event === "order.paid") {
    if (payment.currency && payment.currency !== "INR") return new Response("wrong currency", { status: 400 });
    const { data, error } = await admin
      .rpc("mark_order_paid", {
        p_razorpay_order_id: payment.order_id,
        p_razorpay_payment_id: payment.id,
        p_amount: typeof payment.amount === "number" ? payment.amount : null,
      })
      .maybeSingle<{ order_id: string; newly_paid: boolean }>();
    if (error) {
      // Payments for orders this store didn't create (another site on the same account) are ignored.
      if (error.code === "P0002") return Response.json({ ok: true, ignored: true });
      console.error("Webhook could not mark order paid:", error.message);
      return new Response("retry", { status: 500 }); // Razorpay retries later
    }
    // Also covers a receipt that failed earlier: only one caller can ever send it.
    if (data?.order_id) after(() => sendOrderConfirmation(data.order_id));
    return Response.json({ ok: true });
  }

  if (event.event === "payment.failed") {
    const { error } = await admin.rpc("record_payment_failure", {
      p_razorpay_order_id: payment.order_id,
      p_razorpay_payment_id: payment.id,
      p_reason: payment.error_reason ?? null,
    });
    if (error) {
      console.error("Webhook could not record failure:", error.message);
      return new Response("retry", { status: 500 });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ ok: true, ignored: true });
}
