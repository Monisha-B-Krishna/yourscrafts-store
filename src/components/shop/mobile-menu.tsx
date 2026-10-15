"use client";

import Link from "next/link";
import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { InstagramIcon, WhatsAppIcon } from "./icons";
import { NAV_LINKS } from "./nav-links";

export function MobileMenu({
  customOrderHref,
  instagramUrl,
}: {
  customOrderHref: string;
  instagramUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-lg" className="size-11 lg:hidden" />}
        aria-label="Open menu"
      >
        <MenuIcon className="size-6" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-sm bg-cream p-6">
        <SheetTitle className="font-serif text-2xl">Menu</SheetTitle>
        <nav aria-label="Mobile" className="mt-2">
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  className="block rounded-lg px-2 py-3 text-lg hover:bg-peach-soft"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t pt-6">
          <a
            href={customOrderHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-peach px-5 font-medium text-ink hover:bg-peach/85"
          >
            <WhatsAppIcon className="size-5" />
            Request a custom piece
          </a>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 py-2 text-muted-ink hover:text-ink"
          >
            <InstagramIcon className="size-5" />
            @yours.craftswoman
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
