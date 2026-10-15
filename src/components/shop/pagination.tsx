import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  /** Current search params, so filters are kept when changing page. */
  params: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const next = new URLSearchParams(params);
    if (p === 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  const linkClass =
    "inline-flex size-11 items-center justify-center rounded-full text-sm hover:bg-peach-soft";

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass} aria-label="Previous page">
          <ChevronLeftIcon className="size-5" />
        </Link>
      ) : (
        <span className={cn(linkClass, "opacity-30")} aria-hidden="true">
          <ChevronLeftIcon className="size-5" />
        </span>
      )}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(linkClass, p === page && "bg-ink text-cream hover:bg-ink")}
        >
          {p}
        </Link>
      ))}
      {page < totalPages ? (
        <Link href={href(page + 1)} className={linkClass} aria-label="Next page">
          <ChevronRightIcon className="size-5" />
        </Link>
      ) : (
        <span className={cn(linkClass, "opacity-30")} aria-hidden="true">
          <ChevronRightIcon className="size-5" />
        </span>
      )}
    </nav>
  );
}
