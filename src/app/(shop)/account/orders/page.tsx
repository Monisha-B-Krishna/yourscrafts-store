import type { Metadata } from "next";
import Link from "next/link";
import { PackageIcon } from "lucide-react";

export const metadata: Metadata = { title: "Orders" };

// Order history and tracking arrive with checkout (Phases 4 and 5).
export default function OrdersPage() {
  return (
    <div className="rounded-3xl bg-peach-soft/60 px-6 py-14 text-center">
      <PackageIcon className="mx-auto size-10 text-peach-deep" aria-hidden="true" />
      <h2 className="mt-4 text-2xl sm:text-3xl">No orders yet</h2>
      <p className="mx-auto mt-2 max-w-md text-muted-ink">
        When you place an order, you’ll find it here with its status and tracking details.
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
