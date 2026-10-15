import Link from "next/link";
import { getCategories, getSettings } from "@/lib/catalog";
import { INTERNATIONAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";
import { InstagramIcon, WhatsAppIcon } from "./icons";
import { Logo } from "./logo";

export async function SiteFooter() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);

  return (
    <footer className="mt-20 border-t bg-peach-soft/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-ink">
            Handmade gifts, chocolate bouquets and original paintings, made with love by Monisha.
          </p>
        </div>

        <nav aria-labelledby="footer-shop">
          <h2 id="footer-shop" className="mb-3 font-sans text-sm font-semibold tracking-wide uppercase">
            Shop
          </h2>
          <ul className="space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/shop?category=${c.slug}`} className="text-muted-ink hover:text-ink">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold tracking-wide uppercase">Say hello</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href={whatsappLink(settings.whatsapp_number)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-muted-ink hover:text-ink"
              >
                <WhatsAppIcon className="size-4" /> WhatsApp
              </a>
            </li>
            <li>
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-muted-ink hover:text-ink"
              >
                <InstagramIcon className="size-4" /> @yours.craftswoman
              </a>
            </li>
          </ul>
          <p className="mt-5 rounded-xl bg-cream p-4 text-sm text-muted-ink">
            We ship within India only. Outside India?{" "}
            <a
              href={whatsappLink(settings.whatsapp_number, INTERNATIONAL_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink underline underline-offset-4"
            >
              Contact us on WhatsApp
            </a>
          </p>
        </div>
      </div>
      <p className="border-t px-4 py-5 text-center text-xs text-muted-ink">
        © {new Date().getFullYear()} Yours Crafts Woman. All prices in INR.
      </p>
    </footer>
  );
}
