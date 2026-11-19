import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, PackageIcon } from "lucide-react";
import { StatusBadge, formatOrderDate } from "@/components/shop/orders/order-parts";
import { requireUser } from "@/lib/auth";
import { listMyOrders } from "@/lib/orders/server";
import { formatINR } from "@/lib/pricing";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const session = await requireUser("/account/orders");
  const orders = await listMyOrders(session);

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl bg-peach-soft/60 px-6 py-14 text-center">
        <PackageIcon className="mx-auto size-10 text-peach-deep" aria-hidden="true" />
        <h2 className="mt-4 text-2xl sm:text-3xl">No orders yet</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-ink">
          When you place an order, you&rsquo;ll find it here with its status and tracking details.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-ink">
          Ordered as a guest?{" "}
          <Link href="/track" className="font-medium text-ink underline underline-offset-2">
            Track it here
          </Link>
          .
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-7 font-medium text-cream hover:bg-ink/85"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="sr-only">Your orders</h2>
      <ul aria-label="Your orders" className="flex flex-col gap-4">
        {orders.map((order) => {
          const count = order.items.reduce((n, i) => n + i.qty, 0);
          const names = order.items.map((i) => i.name_snapshot);
          return (
            <li key={order.id}>
              <Link
                href={`/orders/${order.order_number}`}
                className="group flex items-center gap-4 rounded-3xl border border-border/70 bg-white p-5 transition-colors hover:border-peach sm:p-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-medium">{order.order_number}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-ink">
                    {names.slice(0, 2).join(", ")}
                    {names.length > 2 ? ` and ${names.length - 2} more` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-ink">
                    {formatOrderDate(order.paid_at)} · {count} {count === 1 ? "item" : "items"} ·{" "}
                    <span className="font-medium text-ink">{formatINR(order.total)}</span>
                  </p>
                </div>
                <ChevronRightIcon className="size-5 shrink-0 text-muted-ink transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
