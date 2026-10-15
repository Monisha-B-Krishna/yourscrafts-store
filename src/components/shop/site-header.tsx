import Link from "next/link";
import { HeartIcon } from "lucide-react";
import { getSettings, isDemoMode } from "@/lib/catalog";
import { CUSTOM_ORDER_MESSAGE, whatsappLink } from "@/lib/whatsapp";
import { CartButton } from "./cart-button";
import { WhatsAppIcon } from "./icons";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { MobileSearch } from "./mobile-search";
import { NAV_LINKS } from "./nav-links";
import { SearchBox } from "./search-box";

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
        {/* Phones/tablets: one row. Desktop: search · logo · actions, with the menu below. */}
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-1 px-2 sm:h-20 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-6 lg:px-8">
          <div className="flex items-center">
            <MobileMenu customOrderHref={customOrderHref} instagramUrl={settings.instagram_url} />
            <div className="hidden w-full max-w-xs lg:block">
              <SearchBox />
            </div>
          </div>

          <Logo className="mr-auto ml-1 lg:mx-0 lg:justify-self-center" />

          <div className="flex items-center justify-end gap-0.5 sm:gap-1">
            <MobileSearch />
            <Link
              href="/saved"
              aria-label="Saved for later"
              className="hidden size-11 items-center justify-center rounded-full text-ink hover:bg-peach-soft lg:inline-flex"
            >
              <HeartIcon className="size-[22px]" aria-hidden="true" />
            </Link>
            <a
              href={customOrderHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 hidden h-10 items-center gap-2 rounded-full bg-peach px-4 text-sm font-medium text-ink hover:bg-peach/85 md:inline-flex"
            >
              <WhatsAppIcon className="size-4" />
              Custom order
            </a>
            <CartButton />
          </div>
        </div>

        <nav aria-label="Main" className="hidden border-t border-border/70 lg:block">
          <ul className="mx-auto flex h-11 max-w-7xl items-center justify-center gap-1 px-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-full px-3 py-1.5 text-sm text-ink/80 hover:bg-peach-soft hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
    </>
  );
}
