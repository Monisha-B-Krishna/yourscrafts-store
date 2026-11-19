import { formatINR } from "@/lib/pricing";
import { STATUS_LABELS, trackingUrl, type OrderStatus } from "@/lib/orders/timeline";
import { formatIndianPhone } from "@/lib/validation/account";

/**
 * Order emails, built as plain HTML tables so they look right in Gmail,
 * Outlook and phone mail apps. Everything the customer typed is escaped.
 */

export interface EmailOrder {
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  coupon_code: string | null;
  courier: string | null;
  tracking_id: string | null;
  shipping_address: { name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string };
  items: { name_snapshot: string; price_snapshot: number; qty: number }[];
}

export interface EmailLinks {
  /** Tracking page that works without signing in. */
  orderUrl: string;
  whatsappUrl: string;
  /** e.g. "Mon, 23 Nov – Sat, 28 Nov" */
  expectedDelivery?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const C = { ink: "#111111", peach: "#F4A27A", soft: "#FCE6D9", cream: "#FFF9F4", muted: "#6B6B6B" };

function layout(title: string, intro: string, body: string, links: EmailLinks): string {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:${C.cream};font-family:Inter,Arial,Helvetica,sans-serif;color:${C.ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;padding:32px 24px;">
<tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:22px;padding-bottom:24px;">Yours Crafts Woman</td></tr>
<tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;padding-bottom:10px;">${title}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#4a4a4a;padding-bottom:24px;">${intro}</td></tr>
${body}
<tr><td style="padding-top:28px;">
<a href="${escapeHtml(links.orderUrl)}" style="display:inline-block;background:${C.peach};color:${C.ink};text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:999px;">Track your order</a>
</td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:${C.muted};padding-top:24px;">
Questions? <a href="${escapeHtml(links.whatsappUrl)}" style="color:${C.ink};">Message Monisha on WhatsApp</a>.
</td></tr>
</table>
<p style="font-size:12px;color:${C.muted};margin-top:20px;">Handmade with love · @yours.craftswoman</p>
</td></tr>
</table>
</body>
</html>`;
}

function itemsTable(order: EmailOrder): string {
  const rows = order.items
    .map(
      (i) => `<tr>
<td style="padding:8px 0;font-size:14px;border-bottom:1px solid #f0e6df;">${escapeHtml(i.name_snapshot)} <span style="color:${C.muted};">× ${i.qty}</span></td>
<td align="right" style="padding:8px 0;font-size:14px;border-bottom:1px solid #f0e6df;white-space:nowrap;">${formatINR(i.price_snapshot * i.qty)}</td>
</tr>`,
    )
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0;font-size:14px;${bold ? "font-weight:700;font-size:16px;padding-top:10px;" : ""}">${label}</td><td align="right" style="padding:4px 0;font-size:14px;${bold ? "font-weight:700;font-size:16px;padding-top:10px;" : ""}">${value}</td></tr>`;
  return `<tr><td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows}
${line("Subtotal", formatINR(order.subtotal))}
${order.discount > 0 ? line(`Coupon${order.coupon_code ? ` (${escapeHtml(order.coupon_code)})` : ""}`, `−${formatINR(order.discount)}`) : ""}
${line("Shipping", order.shipping_fee === 0 ? "Free" : formatINR(order.shipping_fee))}
${line("Total paid", formatINR(order.total), true)}
</table>
</td></tr>`;
}

function addressBlock(order: EmailOrder): string {
  const a = order.shipping_address;
  const lines = [a.name, a.line1, a.line2, `${a.city}, ${a.state} ${a.pincode}`, formatIndianPhone(a.phone)]
    .filter(Boolean)
    .map((l) => escapeHtml(String(l)))
    .join("<br>");
  return `<tr><td style="padding-top:24px;">
<p style="margin:0 0 6px;font-size:13px;color:${C.muted};text-transform:uppercase;letter-spacing:.08em;">Delivering to</p>
<p style="margin:0;font-size:14px;line-height:1.6;">${lines}</p>
</td></tr>`;
}

function addressText(order: EmailOrder): string {
  const a = order.shipping_address;
  return [a.name, a.line1, a.line2, `${a.city}, ${a.state} ${a.pincode}`, formatIndianPhone(a.phone)].filter(Boolean).join("\n");
}

function itemsText(order: EmailOrder): string {
  const lines = order.items.map((i) => `- ${i.name_snapshot} x ${i.qty}: ${formatINR(i.price_snapshot * i.qty)}`);
  lines.push(`Subtotal: ${formatINR(order.subtotal)}`);
  if (order.discount > 0) lines.push(`Coupon${order.coupon_code ? ` (${order.coupon_code})` : ""}: -${formatINR(order.discount)}`);
  lines.push(`Shipping: ${order.shipping_fee === 0 ? "Free" : formatINR(order.shipping_fee)}`);
  lines.push(`Total paid: ${formatINR(order.total)}`);
  return lines.join("\n");
}

/** "Thank you for your order" — sent once, when payment is confirmed. */
export function orderConfirmationEmail(order: EmailOrder, links: EmailLinks) {
  const subject = `Order ${order.order_number} confirmed · Yours Crafts Woman`;
  const when = links.expectedDelivery ? ` Expected delivery: <strong>${escapeHtml(links.expectedDelivery)}</strong>.` : "";
  const intro = `Your order <strong>${escapeHtml(order.order_number)}</strong> is confirmed and paid. Monisha will start making and packing it by hand. We'll email you again when it ships.${when}`;
  const html = layout("Thank you for your order!", intro, itemsTable(order) + addressBlock(order), links);
  const text = [
    "Thank you for your order!",
    "",
    `Your order ${order.order_number} is confirmed and paid. Monisha will start making and packing it by hand. We'll email you again when it ships.`,
    links.expectedDelivery ? `Expected delivery: ${links.expectedDelivery}` : "",
    "",
    itemsText(order),
    "",
    "Delivering to:",
    addressText(order),
    "",
    `Track your order: ${links.orderUrl}`,
    `Questions? WhatsApp: ${links.whatsappUrl}`,
  ]
    .filter((l, i, all) => !(l === "" && all[i - 1] === ""))
    .join("\n");
  return { subject, html, text };
}

const STATUS_COPY: Record<Exclude<OrderStatus, "placed">, { title: string; intro: string }> = {
  confirmed: { title: "Your order is confirmed", intro: "Monisha has confirmed your order and is getting started on it." },
  packed: { title: "Your order is packed", intro: "Your order is made, wrapped and ready to go. It ships soon." },
  shipped: { title: "Your order is on its way!", intro: "Your order has left the studio and is with the courier." },
  delivered: { title: "Your order has been delivered", intro: "We hope you love it! We'd be so happy to see it on Instagram: tag @yours.craftswoman." },
  cancelled: {
    title: "Your order has been cancelled",
    intro: "Your order has been cancelled. If you paid, your refund goes back to the original payment method, usually within 5–7 working days.",
  },
};

/** Sent when the owner moves an order on (used by the admin panel). */
export function orderStatusEmail(order: EmailOrder, links: EmailLinks) {
  if (order.status === "placed") return null;
  const copy = STATUS_COPY[order.status];
  const subject = `Order ${order.order_number}: ${STATUS_LABELS[order.status]} · Yours Crafts Woman`;
  const track = trackingUrl(order.tracking_id);
  let courierHtml = "";
  let courierText = "";
  if (order.status === "shipped" && (order.courier || order.tracking_id)) {
    const parts = [
      order.courier ? `Courier: <strong>${escapeHtml(order.courier)}</strong>` : "",
      order.tracking_id
        ? track
          ? `<a href="${escapeHtml(track)}" style="color:${C.ink};">Track with the courier</a>`
          : `Tracking ID: <strong>${escapeHtml(order.tracking_id)}</strong>`
        : "",
    ].filter(Boolean);
    courierHtml = `<tr><td style="background:${C.soft};border-radius:14px;padding:14px 16px;font-size:14px;line-height:1.6;">${parts.join("<br>")}</td></tr>`;
    courierText = [order.courier ? `Courier: ${order.courier}` : "", order.tracking_id ? `Tracking: ${order.tracking_id}` : ""]
      .filter(Boolean)
      .join("\n");
  }
  const intro = `${copy.intro}<br><span style="color:${C.muted};">Order ${escapeHtml(order.order_number)}</span>`;
  const html = layout(copy.title, intro, courierHtml, links);
  const text = [copy.title, "", copy.intro, `Order ${order.order_number}`, courierText, "", `Track your order: ${links.orderUrl}`, `Questions? WhatsApp: ${links.whatsappUrl}`]
    .filter((l, i, all) => !(l === "" && all[i - 1] === ""))
    .join("\n");
  return { subject, html, text };
}
