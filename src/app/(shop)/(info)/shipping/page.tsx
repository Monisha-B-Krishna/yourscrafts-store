import type { Metadata } from "next";
import { InfoPage } from "@/components/shop/info-page";
import { business } from "@/content/policies";
import { getSettings } from "@/lib/catalog";
import { DISPATCH_DAYS, TRANSIT_DAYS } from "@/lib/delivery";
import { formatINR } from "@/lib/pricing";
import { INTERNATIONAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Shipping",
  description: "Shipping across India: charges, free shipping, how long handmade orders take, and tracking.",
  alternates: { canonical: "/shipping" },
};

export default async function ShippingPage() {
  const s = await getSettings();
  const [pMin, pMax] = DISPATCH_DAYS.product;
  const [aMin, aMax] = DISPATCH_DAYS.original_art;
  return (
    <InfoPage title="Shipping" intro="Every piece is made and packed by hand, then shipped anywhere in India." current="/shipping" updated={business.updated}>
      <h2>Charges</h2>
      <ul>
        <li>
          <strong>Free shipping</strong> on orders of {formatINR(s.free_shipping_threshold)} or more.
        </li>
        <li>
          A flat {formatINR(s.flat_shipping_rate)} on smaller orders, wherever you are in India.
        </li>
        <li>The exact amount is always shown in your cart and at checkout before you pay.</li>
      </ul>
      <h2>How long it takes</h2>
      <ul>
        <li>
          <strong>Making and packing:</strong> {pMin}–{pMax} days for gifts and decor, {aMin}–{aMax} days for paintings
          and prints (they are wrapped extra carefully).
        </li>
        <li>
          <strong>On the way:</strong> usually {TRANSIT_DAYS[0]}–{TRANSIT_DAYS[1]} days with the courier, depending on
          your PIN code.
        </li>
        <li>Each product page shows an expected delivery date, and your order confirmation does too.</li>
      </ul>
      <p>
        Festivals and sales get busy. If you need something by a particular date, message us on WhatsApp before
        ordering and we&rsquo;ll tell you honestly whether we can make it.
      </p>
      <h2>Tracking</h2>
      <p>
        When your order ships, we add the courier and tracking details to your order page (and email you, if you
        have email updates). Find it any time from <a href="/account/orders">My orders</a> or{" "}
        <a href="/track">Track an order</a>.
      </p>
      <h2>Chocolate in hot weather</h2>
      <p>
        Chocolate bouquets are packed to travel, but chocolate can soften in heat. Please make sure someone can receive
        the parcel, and keep it somewhere cool once it arrives.
      </p>
      <h2>Outside India</h2>
      <p>
        Online checkout is for Indian addresses only for now. Living abroad?{" "}
        <a href={whatsappLink(s.whatsapp_number, INTERNATIONAL_MESSAGE)} target="_blank" rel="noopener noreferrer">
          Message us on WhatsApp
        </a>{" "}
        and we&rsquo;ll see what we can do.
      </p>
    </InfoPage>
  );
}
