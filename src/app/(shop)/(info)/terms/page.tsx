import type { Metadata } from "next";
import { InfoPage } from "@/components/shop/info-page";
import { business } from "@/content/policies";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for buying from Yours Crafts Woman.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <InfoPage title="Terms" intro="The simple rules for buying from this shop." current="/terms" updated={business.updated}>
      <h2>Who we are</h2>
      <p>
        Yours Crafts Woman is a small handmade business run by {business.ownerName} in {business.city}, India. By placing
        an order you agree to these terms.
      </p>
      <h2>Handmade pieces</h2>
      <p>
        Everything is made by hand. Colours, sizes and details may vary slightly from the photos, and screens show
        colours differently. That&rsquo;s part of the charm, not a defect.
      </p>
      <h2>Prices and payment</h2>
      <ul>
        <li>Prices are in Indian rupees (₹). Shipping is shown separately before you pay.</li>
        <li>Payment is taken in full at checkout through Razorpay. There is no cash on delivery.</li>
        <li>
          If a price is clearly wrong because of a mistake on our side, we&rsquo;ll contact you before making your order,
          and refund you in full if you&rsquo;d rather not continue.
        </li>
      </ul>
      <h2>Your order</h2>
      <p>
        Your order is confirmed once payment succeeds and you see your order number. Very occasionally a one-of-a-kind
        piece sells out at the same moment; if that happens we&rsquo;ll offer an alternative or a full refund.
      </p>
      <p>
        Custom orders are agreed with you on WhatsApp, including the price and timing, before any work starts.
      </p>
      <h2>Cancellations, returns and refunds</h2>
      <p>
        See <a href="/returns">Returns &amp; refunds</a> and <a href="/shipping">Shipping</a>.
      </p>
      <h2>Artwork</h2>
      <p>
        Buying a painting or print gives you the piece itself. The copyright in the artwork stays with the artist, so it
        may not be reproduced or sold as copies without permission.
      </p>
      <h2>Disputes</h2>
      <p>
        These terms are governed by the laws of India. If we can&rsquo;t resolve a problem together, the courts of{" "}
        {business.jurisdiction} have jurisdiction.
      </p>
    </InfoPage>
  );
}
