import { SiteFooter } from "@/components/shop/site-footer";
import { SiteHeader } from "@/components/shop/site-header";
import { Toaster } from "@/components/shop/toaster";
import { PageViewTracker } from "@/components/shop/trackers";

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
    </>
  );
}
