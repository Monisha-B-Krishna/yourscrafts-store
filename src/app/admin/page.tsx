import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { Card, EmptyState, PageHeader, Pill, Stat, buttonClass, formatWhen } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/pricing";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/timeline";

export const metadata: Metadata = { title: "Dashboard" };

interface Dashboard {
  today: { revenue: number; orders: number };
  month: { revenue: number; orders: number; average: number };
  daily: { day: string; revenue: number; orders: number }[];
  to_pack: { id: string; order_number: string; status: OrderStatus; total: number; paid_at: string; name: string; stock_short: boolean }[];
  to_pack_count: number;
  top_products: { product_id: string | null; name: string; qty: number; revenue: number }[];
  low_stock: { id: string; name: string; type: string; stock: number; variant: string | null }[];
}

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });

export default async function AdminDashboard() {
  const { supabase, profile } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_dashboard");
  if (error) throw new Error(`Could not load the dashboard: ${error.message}`);
  const d = data as Dashboard;
  const firstName = profile.full_name?.split(/\s+/)[0] ?? "there";
  const maxDay = Math.max(1, ...d.daily.map((x) => x.revenue));
  const fortnight = d.daily.reduce((s, x) => s + x.revenue, 0);

  return (
    <div>
      <PageHeader title={`Hello, ${firstName}`} description="Here's how the shop is doing. All times are Indian time." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Sales today" value={formatINR(d.today.revenue)} hint={`${d.today.orders} ${d.today.orders === 1 ? "order" : "orders"}`} />
        <Stat label="Sales this month" value={formatINR(d.month.revenue)} hint={`${d.month.orders} ${d.month.orders === 1 ? "order" : "orders"}`} />
        <Stat label="Average order" value={formatINR(d.month.average)} hint="This month" />
        <Stat label="Waiting to pack" value={String(d.to_pack_count)} hint="Placed or confirmed" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card
          title="Orders to pack"
          description="Oldest first. Open one to update it or print its packing slip."
          action={
            <Link href="/admin/orders?status=to-pack" className={buttonClass.small}>
              See all
            </Link>
          }
        >
          {d.to_pack.length === 0 ? (
            <EmptyState title="All caught up ✿">New paid orders will appear here.</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {d.to_pack.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-3 hover:bg-peach-soft/40 sm:-mx-2 sm:rounded-xl sm:px-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {o.order_number}
                        <Pill tone={o.status === "placed" ? "soft" : "muted"}>{STATUS_LABELS[o.status]}</Pill>
                        {o.stock_short && <Pill tone="warn">Stock ran out</Pill>}
                      </p>
                      <p className="truncate text-sm text-muted-ink">
                        {o.name} · {formatWhen(o.paid_at)}
                      </p>
                    </div>
                    <span className="text-sm font-medium">{formatINR(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Low stock" description="3 or fewer left. Restock or mark as made-to-order.">
          {d.low_stock.length === 0 ? (
            <EmptyState title="Stock looks good" />
          ) : (
            <ul className="divide-y divide-border">
              {d.low_stock.map((p) => (
                <li key={`${p.id}-${p.variant ?? ""}`}>
                  <Link
                    href={`/admin/${p.type === "product" ? "products" : "artworks"}/${p.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:underline"
                  >
                    <span className="min-w-0 truncate">
                      {p.name}
                      {p.variant && <span className="text-muted-ink"> · {p.variant}</span>}
                    </span>
                    <Pill tone={p.stock === 0 ? "warn" : "soft"}>{p.stock === 0 ? "Sold out" : `${p.stock} left`}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card title="Last 14 days" description={`${formatINR(fortnight)} in paid orders`}>
          <div className="flex h-40 items-end gap-1.5" aria-hidden="true">
            {d.daily.map((x) => (
              <div key={x.day} className="flex h-full flex-1 flex-col justify-end" title={`${dayLabel.format(new Date(x.day))}: ${formatINR(x.revenue)}`}>
                <div
                  className="min-h-[3px] rounded-t-md bg-peach"
                  style={{ height: `${Math.max(2, (x.revenue / maxDay) * 100)}%`, opacity: x.revenue ? 1 : 0.35 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-ink" aria-hidden="true">
            <span>{dayLabel.format(new Date(d.daily[0].day))}</span>
            <span>Today</span>
          </div>
          <table className="sr-only">
            <caption>Sales per day, last 14 days</caption>
            <thead>
              <tr>
                <th>Day</th>
                <th>Sales</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {d.daily.map((x) => (
                <tr key={x.day}>
                  <td>
                    {weekday.format(new Date(x.day))} {dayLabel.format(new Date(x.day))}
                  </td>
                  <td>{formatINR(x.revenue)}</td>
                  <td>{x.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Top sellers this month">
          {d.top_products.length === 0 ? (
            <EmptyState title="No sales yet this month" />
          ) : (
            <ol className="divide-y divide-border text-sm">
              {d.top_products.map((p, i) => (
                <li key={p.product_id ?? p.name} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 text-muted-ink">{i + 1}.</span>
                    {p.name}
                  </span>
                  <span className="shrink-0 text-muted-ink">
                    {p.qty} sold · <span className="font-medium text-ink">{formatINR(p.revenue)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {d.to_pack.some((o) => o.stock_short) && (
        <p className="mt-6 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangleIcon className="size-4" aria-hidden="true" />
          Some orders were paid after an item sold out. Open them to refund or offer an alternative.
        </p>
      )}
    </div>
  );
}
