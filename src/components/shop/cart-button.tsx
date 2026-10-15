"use client";

import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";
import { cartCount, useCartLines } from "@/lib/cart/store";

export function CartButton() {
  const count = cartCount(useCartLines());
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart, empty"}
      className="relative inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-peach-soft sm:size-11"
    >
      <ShoppingBagIcon className="size-[22px]" aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-peach px-1 text-[11px] leading-none font-semibold text-ink ring-2 ring-cream"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
