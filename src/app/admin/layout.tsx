import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shop/logo";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: { template: "%s · Admin · Yours Crafts Woman", default: "Admin" },
  robots: { index: false, follow: false },
};

// Owner-only, always fresh, never cached.
export const dynamic = "force-dynamic";

/**
 * Three locks keep /admin private: middleware (src/middleware.ts), this
 * server-side check, and Row Level Security in the database.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-cream">Admin</span>
          </div>
          <Link href="/" className="text-sm font-medium text-muted-ink hover:text-ink">
            View store
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
