import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Section({
  id,
  eyebrow,
  title,
  href,
  linkLabel = "View all",
  className,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
        <div>
          {eyebrow && <p className="mb-1 text-sm text-peach-deep">{eyebrow}</p>}
          <h2 id={id} className="text-2xl sm:text-3xl lg:text-4xl">
            {title}
          </h2>
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-medium text-ink underline-offset-4 hover:underline"
          >
            {linkLabel}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
