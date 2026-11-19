import type { Metadata } from "next";
import { DownloadIcon } from "lucide-react";
import { Card, PageHeader, buttonClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Download data" };

const FILES = [
  { name: "orders", label: "Orders", about: "One row per checkout (paid and unpaid), with totals in paise, status and payment details." },
  { name: "order_items", label: "Order items", about: "What was in each order: name and price at the time of purchase, quantity." },
  { name: "order_status_history", label: "Order status history", about: "Every status change with its time, e.g. to measure hours from placed to shipped." },
  { name: "products", label: "Products", about: "Your catalogue: prices, stock, units sold, tags." },
  { name: "customers", label: "Customers", about: "One row per customer email: orders, total spent, last order." },
  { name: "events", label: "Events (analytics)", about: "Page views, searches, add-to-carts, checkouts and payments. No personal data." },
];

export default async function ExportPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Download data"
        description="CSV files for Excel, Google Sheets or Python (pandas.read_csv). Money is in paise: divide by 100 for rupees."
      />
      <Card>
        <ul className="divide-y divide-border">
          {FILES.map((f) => (
            <li key={f.name} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{f.label}</p>
                <p className="text-sm text-muted-ink">{f.about}</p>
              </div>
              <a href={`/api/admin/export/${f.name}`} download className={buttonClass.secondary}>
                <DownloadIcon className="size-4" aria-hidden="true" /> Download CSV
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-ink">
          Every column is explained in <code>docs/data-dictionary.md</code>.
        </p>
      </Card>
    </div>
  );
}
