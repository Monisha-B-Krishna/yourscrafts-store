import Link from "next/link";
import { cn } from "@/lib/utils";
import { HandDoodle } from "./icons";

/**
 * Text wordmark placeholder. When the real logo file is added to
 * /public/brand/, swap the contents of this component for an <Image>.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-1.5 rounded-md text-ink", className)}
      aria-label="Yours Crafts Woman — home"
    >
      <span className="font-serif text-xl leading-none font-semibold tracking-tight whitespace-nowrap sm:text-2xl">
        Yours Crafts Woman
      </span>
      <HandDoodle className="size-6 shrink-0 sm:size-7" />
    </Link>
  );
}
