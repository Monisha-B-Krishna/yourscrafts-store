import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const HELP_LINKS = [
  { href: "/contact", label: "Contact" },
  { href: "/shipping", label: "Shipping" },
  { href: "/returns", label: "Returns & refunds" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/** Layout for the help pages: title, a side menu between them, and readable text. */
export function InfoPage({
  title,
  intro,
  current,
  updated,
  children,
}: {
  title: string;
  intro?: ReactNode;
  current: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-8 sm:px-6 sm:pt-12 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Help pages" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <ul className="flex gap-2 lg:sticky lg:top-28 lg:flex-col lg:gap-1">
            {HELP_LINKS.map((l) => (
              <li key={l.href} className="shrink-0">
                <Link
                  href={l.href}
                  aria-current={current === l.href ? "page" : undefined}
                  className={cn(
                    "block rounded-full px-4 py-2 text-sm whitespace-nowrap lg:rounded-xl",
                    current === l.href ? "bg-ink text-cream" : "bg-peach-soft/70 hover:bg-peach-soft lg:bg-transparent",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="min-w-0 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl">{title}</h1>
          {intro && <p className="mt-3 text-lg text-muted-ink">{intro}</p>}
          <div className="prose-info mt-8">{children}</div>
          {updated && <p className="mt-12 text-sm text-muted-ink">Last updated {updated}.</p>}
        </article>
      </div>
    </div>
  );
}
