import type { Metadata } from "next";
import { InfoPage } from "@/components/shop/info-page";
import { DAMAGE_REPORT_HOURS, REFUND_DAYS, business } from "@/content/policies";
import { getSettings } from "@/lib/catalog";
import { whatsappLink } from "@/lib/whatsapp";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Returns & refunds",
  description: "Cancellations, damaged parcels and refunds for handmade orders from Yours Crafts Woman.",
  alternates: { canonical: "/returns" },
};

export default async function ReturnsPage() {
  const s = await getSettings();
  const wa = whatsappLink(s.whatsapp_number, "Hi Monisha! I need help with my order ");
  return (
    <InfoPage
      title="Returns & refunds"
      intro="Everything is handmade, and much of it is edible or personalised, so here's exactly how changes and problems are handled."
      current="/returns"
      updated={business.updated}
    >
      <h2>Changing or cancelling an order</h2>
      <p>
        You can change or cancel within <strong>{s.cancellation_window_hours} hours</strong> of ordering, as long as we
        haven&rsquo;t started making it.{" "}
        <a href={wa} target="_blank" rel="noopener noreferrer">
          Message us on WhatsApp
        </a>{" "}
        with your order number. After that, the materials are bought and the work has begun, so we can&rsquo;t cancel.
      </p>
      <h2>What can&rsquo;t be returned</h2>
      <ul>
        <li>Chocolate bouquets, hampers and anything edible (for food safety).</li>
        <li>Personalised and custom-made pieces.</li>
        <li>Small differences from the photos: every piece is made by hand, so colours and details vary a little.</li>
      </ul>
      <h2>Damaged, wrong or missing items</h2>
      <p>
        If your parcel arrives damaged, or something is wrong or missing, tell us within{" "}
        <strong>{DAMAGE_REPORT_HOURS} hours</strong> of delivery on WhatsApp, with your order number and photos (an
        unboxing video helps a lot). We&rsquo;ll send a replacement or give you a full refund, whichever you prefer.
      </p>
      <h2>Paintings and prints</h2>
      <p>
        Original paintings and prints can be returned within 7 days of delivery if they arrive in their original
        condition and packaging. Message us first so we can arrange it; return shipping is paid by you unless the
        piece arrived damaged.
      </p>
      <h2>Refunds</h2>
      <p>
        Approved refunds go back to the way you paid (UPI, card, netbanking or wallet) through Razorpay. They usually
        reach you within <strong>{REFUND_DAYS}</strong>, depending on your bank.
      </p>
    </InfoPage>
  );
}
