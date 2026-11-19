import "server-only";
import { getSettings } from "@/lib/catalog";
import { formatDeliveryDate } from "@/lib/delivery";
import { siteUrl } from "@/lib/env";
import { orderLink } from "@/lib/orders/server";
import { expectedDelivery } from "@/lib/orders/timeline";
import { createAdminClient } from "@/lib/supabase/admin";
import { whatsappLink } from "@/lib/whatsapp";
import { isEmailConfigured, sendEmail } from "./send";
import { orderConfirmationEmail, orderStatusEmail, type EmailOrder } from "./templates";

const COLUMNS =
  "id, order_number, access_key, email, status, paid_at, subtotal, discount, shipping_fee, total, coupon_code, courier, tracking_id, shipping_address, items:order_items (name_snapshot, price_snapshot, qty, product:products (type))";

type LoadedOrder = Omit<EmailOrder, "items"> & {
  id: string;
  access_key: string;
  email: string;
  paid_at: string;
  items: (EmailOrder["items"][number] & { product: { type: string } | null })[];
};

async function loadOrder(orderId: string): Promise<LoadedOrder | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("orders").select(COLUMNS).eq("id", orderId).eq("payment_status", "paid").maybeSingle();
  if (error) throw new Error(`Could not load order for email: ${error.message}`);
  return data as unknown as LoadedOrder | null;
}

async function linksFor(order: LoadedOrder) {
  const settings = await getSettings();
  const estimate = expectedDelivery(order.items.map((i) => i.product?.type), new Date(order.paid_at));
  return {
    orderUrl: new URL(orderLink(order.order_number, order.access_key), siteUrl).toString(),
    whatsappUrl: whatsappLink(settings.whatsapp_number, `Hi Monisha! A question about my order ${order.order_number}: `),
    expectedDelivery: `${formatDeliveryDate(estimate.earliest)} – ${formatDeliveryDate(estimate.latest)}`,
  };
}

/**
 * Emails the receipt for a newly paid order. Safe to call from both the
 * browser confirmation and the webhook: the database lets only one caller
 * claim the email, and gives the claim back if sending fails.
 */
export async function sendOrderConfirmation(orderId: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  const admin = createAdminClient();
  if (!admin) return false;
  try {
    const { data: claimed, error } = await admin.rpc("claim_confirmation_email", { p_order_id: orderId });
    if (error || claimed !== true) return false;

    const order = await loadOrder(orderId);
    const sent = order ? await sendEmail({ to: order.email, ...orderConfirmationEmail(order, await linksFor(order)) }) : false;
    if (!sent) await admin.rpc("release_confirmation_email", { p_order_id: orderId });
    return sent;
  } catch (error) {
    console.error("Order confirmation email failed:", error);
    await admin.rpc("release_confirmation_email", { p_order_id: orderId });
    return false;
  }
}

/** Emails the customer the order's current status (the admin panel calls this after a change). */
export async function sendOrderStatusUpdate(orderId: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    const order = await loadOrder(orderId);
    if (!order) return false;
    const message = orderStatusEmail(order, await linksFor(order));
    return message ? await sendEmail({ to: order.email, ...message }) : false;
  } catch (error) {
    console.error("Order status email failed:", error);
    return false;
  }
}
