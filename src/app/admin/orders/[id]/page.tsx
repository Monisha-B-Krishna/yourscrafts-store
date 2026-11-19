import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangleIcon, ExternalLinkIcon, PrinterIcon } from "lucide-react";
import { Card, PageHeader, Pill, buttonClass, formatWhen } from "@/components/admin/ui";
import { ShippingAddress } from "@/components/shop/orders/order-parts";
import { requireAdmin } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email/send";
import { orderLink } from "@/lib/orders/server";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/timeline";
import { formatINR } from "@/lib/pricing";
import { formatIndianPhone } from "@/lib/validation/account";
import { whatsappLink } from "@/lib/whatsapp";
import { NotesForm, UpdateOrderForm } from "./order-forms";

export const metadata: Metadata = { title: "Order" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, items:order_items (id, product_id, name_snapshot, price_snapshot, qty, product:products (type)), history:order_status_history (id, status, note, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load order: ${error.message}`);
  if (!data) notFound();

  const o = data as {
    id: string;
    order_number: string | null;
    access_key: string;
    status: OrderStatus;
    payment_status: string;
    email: string;
    phone: string;
    user_id: string | null;
    shipping_address: { name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string };
    subtotal: number;
    discount: number;
    shipping_fee: number;
    total: number;
    coupon_code: string | null;
    courier: string | null;
    tracking_id: string | null;
    notes: string | null;
    razorpay_order_id: string | null;
    razorpay_payment_id: string | null;
    created_at: string;
    paid_at: string | null;
    stock_short: boolean;
    confirmation_email_sent_at: string | null;
    items: { id: string; product_id: string | null; name_snapshot: string; price_snapshot: number; qty: number; product: { type: string } | null }[];
    history: { id: string; status: OrderStatus; note: string | null; created_at: string }[];
  };
  const paid = o.payment_status === "paid";
  const history = [...o.history].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/orders", label: "Orders" }}
        title={o.order_number ?? "Unpaid checkout"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {paid ? <Pill tone="ink">{STATUS_LABELS[o.status]}</Pill> : <Pill tone="muted">{o.payment_status}</Pill>}
            <span>{paid ? `Paid ${formatWhen(o.paid_at)}` : `Started ${formatWhen(o.created_at)}`}</span>
            <span>· {formatINR(o.total)}</span>
          </span>
        }
        actions={
          paid && (
            <>
              <Link href={`/admin/orders/${o.id}/slip`} className={buttonClass.secondary}>
                <PrinterIcon className="size-4" aria-hidden="true" /> Packing slip
              </Link>
              {o.order_number && (
                <Link href={orderLink(o.order_number, o.access_key)} target="_blank" className={buttonClass.secondary}>
                  <ExternalLinkIcon className="size-4" aria-hidden="true" /> Customer&rsquo;s view
                </Link>
              )}
            </>
          )
        }
      />

      {o.stock_short && (
        <div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangleIcon className="size-5 shrink-0" aria-hidden="true" />
          <p>
            An item in this order sold out just before the customer paid. Message them to offer an alternative, or refund in
            Razorpay and mark the order Cancelled.
          </p>
        </div>
      )}
      {!paid && (
        <div className="mb-6 rounded-2xl bg-peach-soft/60 p-4 text-sm">
          This checkout was never paid, so there&rsquo;s nothing to pack. It&rsquo;s kept for your analysis of abandoned checkouts.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {paid && (
            <Card title="Update this order" description="Customers see the status and tracking details on their order page.">
              <UpdateOrderForm
                orderId={o.id}
                status={o.status}
                courier={o.courier ?? ""}
                trackingId={o.tracking_id ?? ""}
                emailOn={isEmailConfigured()}
              />
            </Card>
          )}

          <Card title="Items">
            <ul className="divide-y divide-border">
              {o.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                  <span>
                    {item.product_id ? (
                      <Link
                        href={`/admin/${item.product?.type && item.product.type !== "product" ? "artworks" : "products"}/${item.product_id}`}
                        className="hover:underline"
                      >
                        {item.name_snapshot}
                      </Link>
                    ) : (
                      item.name_snapshot
                    )}{" "}
                    <span className="font-medium">× {item.qty}</span>
                  </span>
                  <span>{formatINR(item.price_snapshot * item.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(o.subtotal)}</dd></div>
              {o.discount > 0 && (
                <div className="flex justify-between"><dt>Coupon {o.coupon_code}</dt><dd>−{formatINR(o.discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt>Shipping</dt><dd>{o.shipping_fee ? formatINR(o.shipping_fee) : "Free"}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatINR(o.total)}</dd></div>
            </dl>
          </Card>

          <Card title="Private notes" description="Only you see these.">
            <NotesForm orderId={o.id} notes={o.notes ?? ""} />
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Customer">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-ink">Email</dt><dd className="break-all"><a href={`mailto:${o.email}`} className="hover:underline">{o.email}</a></dd></div>
              <div>
                <dt className="text-muted-ink">Mobile</dt>
                <dd>
                  {formatIndianPhone(o.phone)}{" "}
                  <a href={whatsappLink(`91${o.phone}`, `Hi! This is Monisha from Yours Crafts Woman about your order ${o.order_number ?? ""}.`)} target="_blank" rel="noopener noreferrer" className="ml-1 underline underline-offset-2">
                    WhatsApp
                  </a>
                </dd>
              </div>
              <div><dt className="text-muted-ink">Account</dt><dd>{o.user_id ? "Signed-in customer" : "Guest checkout"}</dd></div>
            </dl>
          </Card>
          <Card title="Ship to">
            <ShippingAddress address={o.shipping_address} />
          </Card>
          <Card title="History">
            {history.length === 0 ? (
              <p className="text-sm text-muted-ink">No changes yet.</p>
            ) : (
              <ol className="space-y-3 text-sm">
                {history.map((h) => (
                  <li key={h.id}>
                    <p className="font-medium">{STATUS_LABELS[h.status]}</p>
                    <p className="text-muted-ink">{formatWhen(h.created_at)}</p>
                    {h.note && <p className="mt-0.5">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card title="Payment">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-ink">Razorpay payment</dt><dd className="break-all font-mono text-xs">{o.razorpay_payment_id ?? "—"}</dd></div>
              <div><dt className="text-muted-ink">Razorpay order</dt><dd className="break-all font-mono text-xs">{o.razorpay_order_id ?? "—"}</dd></div>
              <div><dt className="text-muted-ink">Receipt email</dt><dd>{o.confirmation_email_sent_at ? `Sent ${formatWhen(o.confirmation_email_sent_at)}` : "Not sent"}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted-ink">Refunds are made in your Razorpay dashboard.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
