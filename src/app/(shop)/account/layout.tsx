import type { Metadata } from "next";
import Link from "next/link";
import { AccountNav } from "@/components/shop/account/account-nav";
import { getProfile, requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: { template: "%s · My account · Yours Crafts Woman", default: "My account" },
  robots: { index: false },
};

// Personal pages: always rendered fresh for the signed-in customer.
export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser("/account");
  const profile = await getProfile(session);
  const firstName = profile?.full_name?.split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-4 sm:px-6 sm:pt-12 lg:px-8">
      <p className="text-sm tracking-widest text-peach-deep uppercase">My account</p>
      <h1 className="mt-1 text-3xl sm:text-4xl lg:text-5xl">{firstName ? `Hi, ${firstName}` : "Hello!"}</h1>

      {profile?.role === "admin" && (
        <p className="mt-3 text-sm text-muted-ink">
          You’re the store owner.{" "}
          <Link href="/admin" className="font-medium text-ink underline underline-offset-2">
            Open the admin panel
          </Link>
        </p>
      )}

      {!profile?.phone && (
        <div role="status" className="mt-5 rounded-2xl bg-peach-soft px-4 py-3 text-sm">
          Please add your mobile number below. We need it to arrange delivery.
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[14rem_1fr] lg:gap-12">
        {/* min-w-0 lets the tab row scroll sideways on phones instead of widening the page. */}
        <aside className="min-w-0">
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
