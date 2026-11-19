import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Card, EmptyState, PageHeader, Pager, Pill, buttonClass, formatDay } from "@/components/admin/ui";
import { fieldClass } from "@/components/shop/form/field";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { formatIndianPhone } from "@/lib/validation/account";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 50;

interface CustomerRow {
  email: string;
  full_name: string | null;
  phone: string | null;
  user_id: string | null;
  registered: boolean;
  joined_at: string;
  orders: number;
  lifetime_value: number;
  last_order_at: string | null;
  total_count: number;
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const { data, error } = await supabase.rpc("admin_customers", { p_search: q || null, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE });
  if (error) throw new Error(`Could not load customers: ${error.message}`);
  const rows = (data ?? []) as CustomerRow[];
  const total = rows[0]?.total_count ?? 0;

  return (
    <div>
      <PageHeader title="Customers" description="Everyone with an account, plus guests who have paid for an order. Highest spend first." />
      <form method="get" className="mb-6 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search customers</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-ink" aria-hidden="true" />
          <input name="q" defaultValue={q} placeholder="Name, email or phone" className={cn(fieldClass, "h-11 pl-10")} />
        </label>
        <button type="submit" className={buttonClass.primary}>
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title={q ? "No customers match" : "No customers yet"}>Customers appear here once they sign up or pay for an order.</EmptyState>
      ) : (
        <Card className="relative overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-xs tracking-wide text-muted-ink uppercase">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Customer</th>
                <th scope="col" className="px-3 py-3 font-medium">Orders</th>
                <th scope="col" className="px-3 py-3 font-medium">Spent</th>
                <th scope="col" className="px-3 py-3 font-medium">Last order</th>
                <th scope="col" className="px-5 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => (
                <tr key={c.email}>
                  <td className="px-5 py-3">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {c.full_name || "—"} {!c.registered && <Pill tone="muted">Guest</Pill>}
                    </p>
                    <p className="text-muted-ink">
                      {c.email}
                      {c.phone && ` · ${formatIndianPhone(c.phone)}`}
                    </p>
                  </td>
                  <td className="px-3 py-3">{c.orders}</td>
                  <td className="px-3 py-3 font-medium">{formatINR(c.lifetime_value)}</td>
                  <td className="px-3 py-3 text-muted-ink">{c.last_order_at ? formatDay(c.last_order_at) : "—"}</td>
                  <td className="px-5 py-3 text-right">
                    {c.orders > 0 && (
                      <Link href={`/admin/orders?q=${encodeURIComponent(c.email)}`} className={buttonClass.small}>
                        Orders
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Pager
        page={page}
        totalPages={Math.max(1, Math.ceil(Number(total) / PAGE_SIZE))}
        href={(p) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`}
      />
    </div>
  );
}
