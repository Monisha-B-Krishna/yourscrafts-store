import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Card, EmptyState, PageHeader, Pager, Pill, buttonClass, formatWhen } from "@/components/admin/ui";
import { fieldClass } from "@/components/shop/form/field";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/pricing";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/timeline";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 25;
const FILTERS = [
  { value: "to-pack", label: "To pack" },
  { value: "all", label: "All paid" },
  { value: "placed", label: "Placed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "unpaid", label: "Unpaid checkouts" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

/** Keeps search text safe inside a database filter (no commas, brackets or wildcards). */
const cleanSearch = (raw: string) => raw.replace(/[,()*%\\:"']/g, " ").trim().slice(0, 60);
const istMidnight = (date: string) => new Date(`${date}T00:00:00+05:30`).toISOString();
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.value === sp.status) ? (sp.status as Filter) : "all";
  const q = cleanSearch(sp.q ?? "");
  const from = sp.from && DATE.test(sp.from) ? sp.from : "";
  const to = sp.to && DATE.test(sp.to) ? sp.to : "";
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));

  let query = supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total, paid_at, created_at, email, shipping_address, stock_short, items:order_items (qty)", {
      count: "exact",
    });
  if (filter === "unpaid") query = query.neq("payment_status", "paid").neq("payment_status", "refunded");
  else query = query.in("payment_status", ["paid", "refunded"]);
  if (filter === "to-pack") query = query.in("status", ["placed", "confirmed"]);
  else if (filter !== "all" && filter !== "unpaid") query = query.eq("status", filter);
  const dateColumn = filter === "unpaid" ? "created_at" : "paid_at";
  if (from) query = query.gte(dateColumn, istMidnight(from));
  if (to) query = query.lt(dateColumn, new Date(new Date(istMidnight(to)).getTime() + 864e5).toISOString());
  if (q) {
    const digits = q.replace(/\D/g, "");
    query = query.or(
      [
        `order_number.ilike.*${q}*`,
        `email.ilike.*${q}*`,
        `shipping_address->>name.ilike.*${q}*`,
        digits.length >= 4 ? `phone.ilike.*${digits}*` : null,
      ]
        .filter(Boolean)
        .join(","),
    );
  }
  query = query
    .order(filter === "to-pack" ? "paid_at" : dateColumn, { ascending: filter === "to-pack", nullsFirst: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data, error, count } = await query;
  if (error && error.code !== "PGRST103") throw new Error(`Could not load orders: ${error.message}`);
  const orders = (data ?? []) as {
    id: string;
    order_number: string | null;
    status: OrderStatus;
    payment_status: string;
    total: number;
    paid_at: string | null;
    created_at: string;
    email: string;
    shipping_address: { name?: string; city?: string };
    stock_short: boolean;
    items: { qty: number }[];
  }[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const link = (over: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const state = { status: filter, q, from, to, page: 1, ...over };
    for (const [k, v] of Object.entries(state)) if (v && !(k === "page" && v === 1) && !(k === "status" && v === "all")) params.set(k, String(v));
    const s = params.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <div>
      <PageHeader title="Orders" description={`${count ?? 0} ${filter === "unpaid" ? "unpaid checkouts" : "orders"}`} />

      <nav aria-label="Order status" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2 pb-1">
          {FILTERS.map((f) => (
            <li key={f.value} className="shrink-0">
              <Link
                href={link({ status: f.value })}
                aria-current={filter === f.value ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-sm whitespace-nowrap",
                  filter === f.value ? "border-ink bg-ink text-cream" : "bg-white hover:bg-peach-soft",
                )}
              >
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form method="get" className="mb-6 grid gap-3 rounded-3xl border border-border/70 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end">
        <input type="hidden" name="status" value={filter} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Search</span>
          <span className="relative block">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-ink" aria-hidden="true" />
            <input name="q" defaultValue={q} placeholder="Order number, name, email or phone" className={cn(fieldClass, "h-11 pl-10")} />
          </span>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">From</span>
          <input type="date" name="from" defaultValue={from} className={cn(fieldClass, "h-11")} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">To</span>
          <input type="date" name="to" defaultValue={to} className={cn(fieldClass, "h-11")} />
        </label>
        <div className="flex gap-2">
          <button type="submit" className={buttonClass.primary}>
            Apply
          </button>
          {(q || from || to) && (
            <Link href={link({ q: undefined, from: undefined, to: undefined })} className={buttonClass.secondary}>
              Clear
            </Link>
          )}
        </div>
      </form>

      {orders.length === 0 ? (
        <EmptyState title="No orders here">
          {q || from || to ? "Try a different search or dates." : filter === "to-pack" ? "Everything is packed. ✿" : "Paid orders will appear here."}
        </EmptyState>
      ) : (
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-border" aria-label="Orders">
            {orders.map((o) => {
              const items = o.items.reduce((n, i) => n + i.qty, 0);
              return (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="grid gap-1 px-5 py-4 hover:bg-peach-soft/40 sm:grid-cols-[10rem_minmax(0,1fr)_8rem_6rem] sm:items-center sm:gap-4">
                    <span className="font-medium">{o.order_number ?? <span className="text-muted-ink">Unpaid</span>}</span>
                    <span className="min-w-0">
                      <span className="block truncate">{o.shipping_address?.name ?? "—"}</span>
                      <span className="block truncate text-sm text-muted-ink">
                        {o.email} · {items} {items === 1 ? "item" : "items"}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {o.payment_status === "paid" ? (
                        <Pill tone={o.status === "delivered" ? "ink" : o.status === "cancelled" ? "warn" : "soft"}>{STATUS_LABELS[o.status]}</Pill>
                      ) : (
                        <Pill tone={o.payment_status === "failed" ? "warn" : "muted"}>{o.payment_status === "refunded" ? "Refunded" : o.payment_status === "failed" ? "Payment failed" : "Not paid"}</Pill>
                      )}
                      {o.stock_short && <Pill tone="warn">Stock ran out</Pill>}
                    </span>
                    <span className="flex justify-between gap-3 text-sm sm:block sm:text-right">
                      <span className="font-medium">{formatINR(o.total)}</span>
                      <span className="block text-muted-ink">{formatWhen(o.paid_at ?? o.created_at)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Pager page={page} totalPages={totalPages} href={(p) => link({ page: p })} />
    </div>
  );
}
