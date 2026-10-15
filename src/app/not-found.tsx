import Link from "next/link";
import { HandDoodle } from "@/components/shop/icons";
import { SiteFooter } from "@/components/shop/site-footer";
import { SiteHeader } from "@/components/shop/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:py-28">
        <HandDoodle className="size-16" />
        <p className="mt-6 text-sm tracking-widest text-peach-deep uppercase">Error 404</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">This page wandered off</h1>
        <p className="mt-4 text-muted-ink">
          We couldn’t find what you were looking for. It may have sold out or moved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/shop" className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 font-medium text-cream hover:bg-ink/85">
            Browse the shop
          </Link>
          <Link href="/" className="inline-flex h-12 items-center justify-center rounded-full border border-ink/20 px-7 font-medium hover:bg-peach-soft">
            Go home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
