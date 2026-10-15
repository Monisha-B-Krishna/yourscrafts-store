"use client";

import { Toaster as Sonner } from "sonner";

/** Small pop-up messages ("Added to cart") in the brand style. */
export function Toaster() {
  return (
    <Sonner
      // Under the sticky header, next to the cart icon (full width on phones).
      position="top-right"
      offset={{ top: 136, right: 24 }}
      mobileOffset={{ top: 72 }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !border-border !bg-white !text-ink !shadow-lg !font-sans !gap-3 !px-4 !py-3",
          title: "!text-sm !font-medium",
          description: "!text-sm !text-muted-ink",
          actionButton: "!rounded-full !bg-ink !text-cream !px-3 !h-8 !text-xs !font-medium",
        },
      }}
    />
  );
}
