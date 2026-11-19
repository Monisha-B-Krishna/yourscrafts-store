import type { Metadata } from "next";
import { InstagramIcon, WhatsAppIcon } from "@/components/shop/icons";
import { InfoPage } from "@/components/shop/info-page";
import { business } from "@/content/policies";
import { getSettings } from "@/lib/catalog";
import { CUSTOM_ORDER_MESSAGE, whatsappLink } from "@/lib/whatsapp";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Contact",
  description: "Message Yours Crafts Woman on WhatsApp or Instagram for orders, custom pieces and help.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const s = await getSettings();
  const card = "flex items-center gap-4 rounded-3xl border border-border/70 bg-white p-5 hover:border-peach sm:p-6";
  return (
    <InfoPage title="Say hello" intro={`Questions, custom ideas or help with an order: we usually reply ${business.replyTime}.`} current="/contact">
      <div className="not-prose grid gap-4 sm:grid-cols-2">
        <a href={whatsappLink(s.whatsapp_number, "Hi Monisha! ")} target="_blank" rel="noopener noreferrer" className={card}>
          <WhatsAppIcon className="size-8 shrink-0 text-peach-deep" />
          <span>
            <span className="block font-medium">WhatsApp</span>
            <span className="text-sm text-muted-ink">Fastest for orders and questions</span>
          </span>
        </a>
        <a href={s.instagram_url} target="_blank" rel="noopener noreferrer" className={card}>
          <InstagramIcon className="size-8 shrink-0 text-peach-deep" />
          <span>
            <span className="block font-medium">@yours.craftswoman</span>
            <span className="text-sm text-muted-ink">New pieces and behind the scenes</span>
          </span>
        </a>
      </div>
      <h2>Custom orders</h2>
      <p>
        Want something made just for you, like a bouquet in particular colours, a name, or a painting of a place you love?
        Custom pieces are arranged on WhatsApp so we can talk through the details.{" "}
        <a href={whatsappLink(s.whatsapp_number, CUSTOM_ORDER_MESSAGE)} target="_blank" rel="noopener noreferrer">
          Request a custom piece
        </a>
        .
      </p>
      <h2>Already ordered?</h2>
      <p>
        You can check where your order is on the <a href="/track">Track an order</a> page, using your order number and
        email.
      </p>
      <h2>Grievance officer</h2>
      <p>
        If something has gone wrong and you&rsquo;d like to raise a complaint, contact {business.ownerName}
        {business.email ? (
          <>
            {" "}at <a href={`mailto:${business.email}`}>{business.email}</a>
          </>
        ) : (
          " on WhatsApp"
        )}
        . We acknowledge complaints within 48 hours and aim to resolve them within a month.
      </p>
      <p className="text-muted-ink">Yours Crafts Woman · {business.city}, India</p>
    </InfoPage>
  );
}
