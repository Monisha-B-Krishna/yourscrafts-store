import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/shop/logo";
import { Toaster } from "@/components/shop/toaster";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: { template: "%s · Admin · Yours Crafts Woman", default: "Admin" },
  robots: { index: false, follow: false },
};

// Owner-only, always fresh, never cached.
export const dynamic = "force-dynamic";

/**
 * Three locks keep /admin private: middleware (src/middleware.ts), this
 * server-side check, and Row Level Security in the database. Every admin
 * action checks again before changing anything.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b bg-white print:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-cream">Admin</span>
          </div>
          <Link href="/" aria-label="View store" className="shrink-0 text-sm font-medium text-muted-ink hover:text-ink">
            <span className="hidden sm:inline">View store </span>↗
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:py-10 print:block print:p-0">
        <aside className="min-w-0 print:hidden">
          <div className="lg:sticky lg:top-6">
            <AdminNav />
          </div>
        </aside>
        <main id="main" className="min-w-0">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
