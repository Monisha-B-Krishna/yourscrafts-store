import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearchIcon, TruckIcon } from "lucide-react";
import { OrderTimeline, OrderTotals, ShippingAddress, StatusBadge, formatOrderDate } from "@/components/shop/orders/order-parts";
import { FormMessage } from "@/components/shop/form/field";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/catalog";
import { formatDeliveryDate } from "@/lib/delivery";
import { getOrder } from "@/lib/orders/server";
import { STATUS_DESCRIPTIONS, expectedDelivery, trackingUrl } from "@/lib/orders/timeline";
import { formatINR } from "@/lib/pricing";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ orderNumber: raw }, { key }] = await Promise.all([params, searchParams]);
  const orderNumber = decodeURIComponent(raw).toUpperCase();
  const [session, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const order = await getOrder(orderNumber, { key, session });

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <PackageSearchIcon className="mx-auto size-12 text-peach-deep" aria-hidden="true" />
        <h1 className="mt-4 text-3xl sm:text-4xl">We couldn&rsquo;t find that order</h1>
        <p className="mt-3 text-muted-ink">
          {session
            ? "It may have been placed with a different account or as a guest."
            : "Sign in, or look it up with your order number and email."}
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/track" className="inline-flex h-12 items-center rounded-full bg-ink px-7 font-medium text-cream hover:bg-ink/85">
            Track an order
          </Link>
          {!session && (
            <Link
              href={`/login?next=${encodeURIComponent(`/orders/${orderNumber}`)}`}
              className="inline-flex h-12 items-center rounded-full border border-ink/20 px-7 font-medium hover:bg-peach-soft"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    );
  }

  const placed = new Date(order.paid_at);
  const estimate = expectedDelivery(order.items.map((i) => i.product?.type), placed);
  const link = trackingUrl(order.tracking_id);
  const hoursSince = (Date.now() - placed.getTime()) / 36e5;
  const canStillChange =
    (order.status === "placed" || order.status === "confirmed") && hoursSince < settings.cancellation_window_hours;
  const help = whatsappLink(settings.whatsapp_number, `Hi Monisha! A question about my order ${order.order_number}: `);
  const showEstimate = order.status !== "delivered" && order.status !== "cancelled";

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12 lg:px-8">
      {session && (
        <Link href="/account/orders" className="text-sm text-muted-ink hover:text-ink">
          ← My orders
        </Link>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl sm:text-4xl">Order {order.order_number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-muted-ink">
        Placed {formatOrderDate(order.paid_at)} · {formatINR(order.total)}
      </p>

      {order.stock_short && order.status !== "cancelled" && (
        <div className="mt-6">
          <FormMessage tone="info">
            One of your pieces sold out just as you paid. Monisha will message you to offer an alternative or a full refund.
          </FormMessage>
        </div>
      )}

      <section aria-labelledby="progress-heading" className="mt-8 rounded-3xl border border-border/70 bg-white p-5 sm:p-8">
        <h2 id="progress-heading" className="text-2xl">
          Where your order is
        </h2>
        <p className="mt-1 mb-6 text-sm text-muted-ink">{STATUS_DESCRIPTIONS[order.status]}</p>
        <OrderTimeline status={order.status} history={order.history} />

        {(order.courier || order.tracking_id) && (
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-peach-soft/60 px-4 py-3 text-sm">
            <TruckIcon className="size-5 text-peach-deep" aria-hidden="true" />
            {order.courier && (
              <span>
                Courier: <strong className="font-medium">{order.courier}</strong>
              </span>
            )}
            {order.tracking_id &&
              (link ? (
                <a href={link} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
                  Track with the courier
                </a>
              ) : (
                <span>
                  Tracking ID: <strong className="font-medium break-all">{order.tracking_id}</strong>
                </span>
              ))}
          </div>
        )}

        {showEstimate && (
          <p className="mt-6 text-sm text-muted-ink">
            Expected delivery: <strong className="font-medium text-ink">{formatDeliveryDate(estimate.earliest)} – {formatDeliveryDate(estimate.latest)}</strong>
          </p>
        )}
      </section>

      <div className="mt-8 grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <section aria-labelledby="items-heading" className="rounded-3xl border border-border/70 bg-white p-5 sm:p-8">
          <h2 id="items-heading" className="text-2xl">
            Items
          </h2>
          <ul className="mt-4 divide-y divide-border">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-4 py-3 text-sm">
                <span>
                  {item.product?.slug ? (
                    <Link href={`/product/${item.product.slug}`} className="hover:underline hover:underline-offset-4">
                      {item.name_snapshot}
                    </Link>
                  ) : (
                    item.name_snapshot
                  )}{" "}
                  <span className="text-muted-ink">× {item.qty}</span>
                </span>
                <span className="font-medium">{formatINR(item.price_snapshot * item.qty)}</span>
              </li>
            ))}
          </ul>
          <OrderTotals
            subtotal={order.subtotal}
            discount={order.discount}
            shippingFee={order.shipping_fee}
            total={order.total}
            couponCode={order.coupon_code}
          />
        </section>

        <div className="flex flex-col gap-8">
          <section aria-labelledby="address-heading" className="rounded-3xl border border-border/70 bg-white p-5 sm:p-8">
            <h2 id="address-heading" className="mb-3 text-2xl">
              Delivering to
            </h2>
            <ShippingAddress address={order.shipping_address} />
          </section>
          <section aria-labelledby="help-heading" className="rounded-3xl bg-peach-soft/60 p-5 sm:p-8">
            <h2 id="help-heading" className="text-2xl">
              Need help?
            </h2>
            <p className="mt-2 text-sm text-muted-ink">
              {canStillChange
                ? `Need to change or cancel? Message us within ${settings.cancellation_window_hours} hours of ordering, before we start making it.`
                : "Questions about your order? We're happy to help."}
            </p>
            <a
              href={help}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-11 items-center rounded-full bg-peach px-5 text-sm font-medium text-ink hover:bg-peach/85"
            >
              WhatsApp Monisha
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
