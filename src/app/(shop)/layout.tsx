import { CartSync } from "@/components/shop/cart-sync";
import { SiteFooter } from "@/components/shop/site-footer";
import { SiteHeader } from "@/components/shop/site-header";
import { Toaster } from "@/components/shop/toaster";
import { PageViewTracker } from "@/components/shop/trackers";
import { isSupabaseConfigured } from "@/lib/env";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
      <Toaster />
      <PageViewTracker />
      <CartSync enabled={isSupabaseConfigured()} />
    </>
  );
}
