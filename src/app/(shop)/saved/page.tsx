import type { Metadata } from "next";
import Link from "next/link";
import { HeartIcon } from "lucide-react";
import { SavedList } from "@/components/shop/saved-list";
import { getCurrentUser } from "@/lib/auth";
import { loginHref } from "@/lib/auth/redirect";
import { listSavedProducts } from "@/lib/saved";

export const metadata: Metadata = {
  title: "Saved for later",
  robots: { index: false },
};

// Personal page: always rendered fresh for the signed-in customer.
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const session = await getCurrentUser();
  const products = session ? await listSavedProducts(session.supabase, session.user.id) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl">Saved for later</h1>

      {!session ? (
        <div className="mt-8 rounded-3xl bg-peach-soft/60 px-6 py-14 text-center">
          <HeartIcon className="mx-auto size-10 text-peach-deep" aria-hidden="true" />
          <h2 className="mt-4 text-2xl sm:text-3xl">Sign in to see your saved items</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-ink">
            Saved items are kept in your account, so you can come back to them on any device.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={loginHref("/saved")}
              className="inline-flex h-12 items-center rounded-full bg-ink px-7 font-medium text-cream hover:bg-ink/85"
            >
              Sign in
            </Link>
            <Link
              href="/signup?next=%2Fsaved"
              className="inline-flex h-12 items-center rounded-full border border-ink/20 px-7 font-medium hover:bg-peach-soft"
            >
              Create an account
            </Link>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-peach-soft/60 px-6 py-14 text-center">
          <h2 className="text-2xl sm:text-3xl">Nothing saved yet</h2>
          <p className="mt-2 text-muted-ink">Tap “Save for later” on anything you love to keep it here.</p>
          <Link
            href="/shop"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-7 font-medium text-cream hover:bg-ink/85"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <p className="mb-5 text-muted-ink">
            {products.length} {products.length === 1 ? "item" : "items"} saved
          </p>
          <SavedList products={products} />
        </div>
      )}
    </div>
  );
}
