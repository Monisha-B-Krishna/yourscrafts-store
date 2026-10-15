import Link from "next/link";
import { getSettings, isDemoMode } from "@/lib/catalog";
import { CUSTOM_ORDER_MESSAGE, whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./icons";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NAV_LINKS } from "./nav-links";

export async function SiteHeader() {
  const settings = await getSettings();
  const customOrderHref = whatsappLink(settings.whatsapp_number, CUSTOM_ORDER_MESSAGE);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      {settings.announcement_text && (
        <p className="bg-ink px-4 py-2 text-center text-xs text-cream sm:text-sm">
          {settings.announcement_text}
        </p>
      )}
      {isDemoMode() && (
        <p className="bg-peach-soft px-4 py-1.5 text-center text-xs text-ink">
          Demo mode: showing example products. Add your Supabase keys to use the real database.
        </p>
      )}
      <header className="sticky top-0 z-40 border-b bg-cream/95 backdrop-blur supports-backdrop-filter:bg-cream/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:h-20 sm:px-6 lg:px-8">
          <MobileMenu customOrderHref={customOrderHref} instagramUrl={settings.instagram_url} />
          <Logo className="mr-auto lg:mr-8" />
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-full px-3 py-2 text-sm text-ink/80 hover:bg-peach-soft hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <a
            href={customOrderHref}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto hidden h-10 items-center gap-2 rounded-full bg-peach px-4 text-sm font-medium text-ink hover:bg-peach/85 md:inline-flex"
          >
            <WhatsAppIcon className="size-4" />
            Custom order
          </a>
          <a
            href={customOrderHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Request a custom piece on WhatsApp"
            className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-peach-soft md:hidden"
          >
            <WhatsAppIcon className="size-6" />
          </a>
        </div>
      </header>
    </>
  );
}
