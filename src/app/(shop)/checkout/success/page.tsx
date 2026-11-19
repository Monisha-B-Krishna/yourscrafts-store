import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2Icon, ClockIcon } from "lucide-react";
import { getSettings } from "@/lib/catalog";
import { getOrderForConfirmation } from "@/lib/checkout/server";
import { DISPATCH_DAYS, TRANSIT_DAYS, formatDeliveryDate } from "@/lib/delivery";
import { formatINR } from "@/lib/pricing";
import type { ProductType } from "@/lib/types";
import { formatIndianPhone } from "@/lib/validation/account";
import { whatsappLink } from "@/lib/whatsapp";
import { FormMessage } from "@/components/shop/form/field";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const placedFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { order: orderId = "", key = "" } = await searchParams;
  const [order, settings] = await Promise.all([getOrderForConfirmation(orderId, key), getSettings()]);

  if (order === null) {
    return (
      <Message title="We couldn't find that order">
        The link may be incomplete. If you&rsquo;ve paid, check your email for the receipt, or message us on WhatsApp.
      </Message>
    );
  }

  if (order === "pending") {
    return (
      <Message title="Confirming your payment…" pending>
        This usually takes a few seconds. This page refreshes on its own; please don&rsquo;t pay again.
      </Message>
    );
  }

  // Expected timeline: the slowest item sets the dispatch time.
  const types = order.items.map((i) => (i.product?.type ?? "product") as ProductType);
  const dispatchMax = Math.max(...types.map((t) => DISPATCH_DAYS[t]?.[1] ?? DISPATCH_DAYS.product[1]));
  const dispatchMin = Math.max(...types.map((t) => DISPATCH_DAYS[t]?.[0] ?? DISPATCH_DAYS.product[0]));
  const placed = new Date(order.paid_at ?? order.created_at);
  const earliest = new Date(placed.getTime() + (dispatchMin + TRANSIT_DAYS[0]) * DAY_MS);
  const latest = new Date(placed.getTime() + (dispatchMax + TRANSIT_DAYS[1]) * DAY_MS);
  const help = whatsappLink(settings.whatsapp_number, `Hi Monisha! A question about my order ${order.order_number}: `);
  const a = order.shipping_address;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6 sm:pt-16">
      <div className="text-center">
        <CheckCircle2Icon className="mx-auto size-14 text-peach-deep" aria-hidden="true" />
        <h1 className="mt-4 text-3xl sm:text-5xl">Thank you!</h1>
        <p className="mt-3 text-lg text-muted-ink">
          Your order <strong className="font-semibold text-ink">{order.order_number}</strong> is confirmed.
        </p>
        <p className="mt-1 text-sm text-muted-ink">
          Placed {placedFormat.format(placed)}. Bookmark this page: it&rsquo;s your receipt.
        </p>
      </div>

      {order.stock_short && (
        <div className="mt-8">
          <FormMessage tone="info">
            One of your pieces sold out just as you paid. Monisha will message you within a day to offer an alternative
            or a full refund.
          </FormMessage>
        </div>
      )}

      <section aria-labelledby="timeline-heading" className="mt-10 rounded-3xl bg-peach-soft/60 p-5 sm:p-8">
        <h2 id="timeline-heading" className="text-2xl">
          What happens next
        </h2>
        <ol className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
          <li>
            <p className="font-medium">1. Made &amp; packed</p>
            <p className="text-muted-ink">
              Within {dispatchMin}–{dispatchMax} days
            </p>
          </li>
          <li>
            <p className="font-medium">2. Shipped</p>
            <p className="text-muted-ink">You&rsquo;ll get the courier&rsquo;s tracking details</p>
          </li>
          <li>
            <p className="font-medium">3. Delivered</p>
            <p className="text-muted-ink">
              Expected {formatDeliveryDate(earliest)} – {formatDeliveryDate(latest)}
            </p>
          </li>
        </ol>
      </section>

      <section aria-labelledby="items-heading" className="mt-8 rounded-3xl border border-border/70 bg-white p-5 sm:p-8">
        <h2 id="items-heading" className="text-2xl">
          Order summary
        </h2>
        <ul className="mt-5 divide-y divide-border">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                {item.name_snapshot} <span className="text-muted-ink">× {item.qty}</span>
              </span>
              <span className="font-medium">{formatINR(item.price_snapshot * item.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-2 border-t pt-4 text-sm">
          <Row label="Subtotal" value={formatINR(order.subtotal)} />
          {order.discount > 0 && (
            <Row label={`Coupon${order.coupon_code ? ` (${order.coupon_code})` : ""}`} value={`−${formatINR(order.discount)}`} />
          )}
          <Row label="Shipping" value={order.shipping_fee === 0 ? "Free" : formatINR(order.shipping_fee)} />
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <dt>Total paid</dt>
            <dd>{formatINR(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="ship-heading" className="mt-8 rounded-3xl border border-border/70 bg-white p-5 sm:p-8">
        <h2 id="ship-heading" className="text-2xl">
          Delivering to
        </h2>
        <address className="mt-3 text-sm leading-relaxed text-muted-ink not-italic">
          <span className="font-medium text-ink">{a.name}</span>
          <br />
          {a.line1}
          {a.line2 && (
            <>
              <br />
              {a.line2}
            </>
          )}
          <br />
          {a.city}, {a.state} {a.pincode}
          <br />
          {formatIndianPhone(a.phone)}
        </address>
      </section>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/shop"
          className="inline-flex h-12 items-center rounded-full bg-ink px-7 font-medium text-cream hover:bg-ink/85"
        >
          Continue shopping
        </Link>
        <a
          href={help}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center rounded-full border border-ink/20 px-7 font-medium hover:bg-peach-soft"
        >
          Questions? WhatsApp us
        </a>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Message({ title, children, pending }: { title: string; children: React.ReactNode; pending?: boolean }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      {pending && (
        <>
          <meta httpEquiv="refresh" content="3" />
          <ClockIcon className="mx-auto size-12 text-peach-deep" aria-hidden="true" />
        </>
      )}
      <h1 className="mt-4 text-3xl sm:text-4xl">{title}</h1>
      <p className="mt-3 text-muted-ink">{children}</p>
      <Link href="/shop" className="mt-6 inline-flex text-sm font-medium underline underline-offset-2">
        Back to the shop
      </Link>
    </div>
  );
}
