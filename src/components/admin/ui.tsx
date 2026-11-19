import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Building blocks shared by the admin pages, so every screen feels the same. */

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-sm text-muted-ink hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-muted-ink">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  children,
  className,
  action,
}: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("rounded-3xl border border-border/70 bg-white p-5 sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-xl sm:text-2xl">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted-ink">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-white p-5">
      <p className="text-sm text-muted-ink">{label}</p>
      <p className="mt-1 font-serif text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-ink">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-peach-soft/50 px-6 py-12 text-center">
      <p className="font-serif text-2xl">{title}</p>
      {children && <div className="mt-2 text-sm text-muted-ink">{children}</div>}
    </div>
  );
}

export const buttonClass = {
  primary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-cream hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink/20 bg-white px-5 text-sm font-medium text-ink hover:bg-peach-soft disabled:cursor-not-allowed disabled:opacity-60",
  danger:
    "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-destructive/30 bg-white px-5 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60",
  small:
    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-ink/15 bg-white px-3.5 text-sm font-medium text-ink hover:bg-peach-soft disabled:opacity-60",
};

export function Pill({ children, tone = "soft" }: { children: ReactNode; tone?: "soft" | "ink" | "muted" | "warn" | "good" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tone === "soft" && "bg-peach-soft text-ink",
        tone === "ink" && "bg-ink text-cream",
        tone === "muted" && "bg-muted text-muted-ink",
        tone === "warn" && "bg-destructive/10 text-destructive",
        tone === "good" && "bg-emerald-50 text-emerald-800",
      )}
    >
      {children}
    </span>
  );
}

/** Previous / next page links for long admin lists. */
export function Pager({ page, totalPages, href }: { page: number; totalPages: number; href: (page: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonClass.small}>
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-ink">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={buttonClass.small}>
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

const ist = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});
const istDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
export const formatWhen = (iso: string | null | undefined) => (iso ? ist.format(new Date(iso)) : "—");
export const formatDay = (iso: string | null | undefined) => (iso ? istDate.format(new Date(iso)) : "—");
