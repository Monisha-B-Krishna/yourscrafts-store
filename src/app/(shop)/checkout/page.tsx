import type { Metadata } from "next";
import { CheckoutView } from "@/components/shop/checkout/checkout-view";
import { listAddresses } from "@/lib/addresses";
import { getCurrentUser, getProfile } from "@/lib/auth";
import { getSettings } from "@/lib/catalog";
import { razorpayConfig } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [session, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const [profile, addresses] = session
    ? await Promise.all([getProfile(session), listAddresses(session.supabase, session.user.id)])
    : [null, []];
  const config = razorpayConfig();

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12 lg:px-8">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl">Checkout</h1>
      <p className="mt-2 text-muted-ink">Almost there. Every piece is handmade and packed with care.</p>
      <div className="mt-8">
        <CheckoutView
          signedIn={Boolean(session)}
          email={session?.user.email ?? ""}
          phone={profile?.phone ?? ""}
          addresses={addresses}
          paymentsOn={config.configured && createAdminClient() !== null}
          testMode={config.testMode}
          whatsappHref={whatsappLink(settings.whatsapp_number, "Hi Monisha! I'd like to place an order from Yours Crafts Woman.")}
        />
      </div>
    </div>
  );
}
