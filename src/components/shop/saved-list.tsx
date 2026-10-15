"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ShoppingBagIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { removeSavedAction } from "@/app/(shop)/saved/actions";
import { track } from "@/lib/analytics/client";
import { maxQtyFor } from "@/lib/cart/quote";
import { cartStore } from "@/lib/cart/store";
import { formatINR, fromPrice } from "@/lib/pricing";
import type { Product } from "@/lib/types";

/** The signed-in customer's saved items, with "Move to cart" and "Remove". */
export function SavedList({ products }: { products: Product[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(product: Product, quiet = false) {
    startTransition(async () => {
      const result = await removeSavedAction(product.id);
      if (!result.ok) {
        toast.error("Couldn't update your saved items. Please try again.");
        return;
      }
      if (!quiet) toast(`Removed ${product.name} from your saved items`);
      router.refresh();
    });
  }

  function moveToCart(product: Product) {
    // Items with options (e.g. print sizes) need a choice first.
    if (product.variants.length > 0) {
      router.push(`/product/${product.slug}`);
      return;
    }
    const max = maxQtyFor(product, null);
    if (max <= 0) {
      toast("Sorry, this one is sold out right now.");
      return;
    }
    cartStore.add({ productId: product.id, variantId: null, qty: 1 }, max);
    track("add_to_cart", { productId: product.id, metadata: { qty: 1, variant_id: null, source: "saved" } });
    toast.success("Moved to your cart", { action: { label: "View cart", onClick: () => router.push("/cart") } });
    remove(product, true);
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={pending}>
      {products.map((product) => {
        const image = product.images[0];
        const soldOut = product.stock <= 0;
        return (
          <li key={product.id} className="flex gap-4 rounded-2xl bg-white/70 p-4 ring-1 ring-border">
            <Link
              href={`/product/${product.slug}`}
              className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-peach-soft"
              tabIndex={-1}
              aria-hidden="true"
            >
              {image && (
                <Image src={image.url} alt="" fill sizes="96px" unoptimized={image.url.endsWith(".svg")} className="object-cover" />
              )}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 className="font-sans text-base leading-snug font-medium">
                <Link href={`/product/${product.slug}`} className="hover:underline hover:underline-offset-4">
                  {product.name}
                </Link>
              </h2>
              <p className="text-sm text-muted-ink">
                {product.variants.length > 0 && "From "}
                {formatINR(fromPrice(product))}
                {soldOut && " · Sold out"}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => moveToCart(product)}
                  disabled={soldOut || pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-sm font-medium text-cream hover:bg-ink/85 disabled:bg-ink/40"
                >
                  <ShoppingBagIcon className="size-4" aria-hidden="true" />
                  {product.variants.length > 0 ? "Choose size" : "Move to cart"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(product)}
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm hover:bg-peach-soft"
                >
                  <Trash2Icon className="size-4" aria-hidden="true" />
                  Remove
                  <span className="sr-only"> {product.name}</span>
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
