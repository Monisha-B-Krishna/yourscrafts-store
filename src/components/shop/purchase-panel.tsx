"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckIcon, ShoppingBagIcon } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics/client";
import { maxQtyFor } from "@/lib/cart/quote";
import { cartStore, findLine, useCartLines } from "@/lib/cart/store";
import { compareAtPrice, formatINR, unitPrice } from "@/lib/pricing";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { QtyStepper } from "./qty-stepper";
import { SaveButton } from "./save-button";

function stockMessage(product: Product, available: number): { text: string; tone: "ok" | "low" | "out" } {
  if (product.type === "original_art") {
    return available > 0
      ? { text: "One of a kind · only 1 available", tone: "low" }
      : { text: "Sold: this original has found its home", tone: "out" };
  }
  if (available <= 0) return { text: "Sold out", tone: "out" };
  if (available <= 3) return { text: `Only ${available} left`, tone: "low" };
  return { text: "In stock", tone: "ok" };
}

export function PurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const lines = useCartLines();
  const hasVariants = product.variants.length > 0;
  const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0] ?? null;

  const [variantId, setVariantId] = useState<string | null>(firstAvailable?.id ?? null);
  const [qty, setQty] = useState(1);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const price = unitPrice(product, variant);
  const wasPrice = compareAtPrice(product, variant);
  const maxQty = maxQtyFor(product, variant);
  const inCart = findLine(lines, { productId: product.id, variantId: hasVariants ? variantId : null })?.qty ?? 0;
  const canAddMore = Math.max(0, maxQty - inCart);
  const stock = stockMessage(product, maxQty);
  const soldOut = maxQty <= 0;

  function addToCart() {
    const line = { productId: product.id, variantId: hasVariants ? variantId : null, qty };
    const before = inCart;
    const after = cartStore.add(line, maxQty);
    const added = after - before;
    setQty(1);

    if (added <= 0) {
      toast("You already have all we have of this in your cart", {
        action: { label: "View cart", onClick: () => router.push("/cart") },
      });
      return;
    }
    track("add_to_cart", {
      productId: product.id,
      metadata: { qty: added, variant_id: line.variantId, source: "product_page" },
    });
    toast.success(added < qty ? `Added ${added} (that's all we have)` : "Added to your cart", {
      description: variant ? `${product.name} · ${variant.name}` : product.name,
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-semibold text-ink">{formatINR(price)}</span>
          {wasPrice !== null && (
            <>
              <span className="text-lg text-muted-ink line-through">
                <span className="sr-only">Was </span>
                {formatINR(wasPrice)}
              </span>
              <span className="rounded-full bg-peach px-2.5 py-1 text-xs font-medium text-ink">
                Save {Math.round(((wasPrice - price) / wasPrice) * 100)}%
              </span>
            </>
          )}
        </p>
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-2 text-sm",
            stock.tone === "ok" && "text-ink",
            stock.tone === "low" && "text-peach-deep",
            stock.tone === "out" && "text-muted-ink",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2 rounded-full",
              stock.tone === "ok" && "bg-[#3F7D4E]",
              stock.tone === "low" && "bg-peach",
              stock.tone === "out" && "bg-muted-ink",
            )}
          />
          {stock.text}
        </p>
      </div>

      {hasVariants && (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">
            {product.type === "print" ? "Print size" : "Option"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const out = v.stock <= 0;
              return (
                <label
                  key={v.id}
                  className={cn(
                    "relative inline-flex min-h-11 cursor-pointer flex-col justify-center rounded-2xl border px-4 py-2 text-sm",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                    v.id === variantId ? "border-ink bg-ink text-cream" : "border-input bg-white hover:bg-peach-soft",
                    out && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input
                    type="radio"
                    name="variant"
                    value={v.id}
                    checked={v.id === variantId}
                    disabled={out}
                    onChange={() => {
                      setVariantId(v.id);
                      setQty(1);
                    }}
                    className="sr-only"
                  />
                  <span className="font-medium">{v.name}</span>
                  <span className={cn("text-xs", v.id === variantId ? "text-cream/80" : "text-muted-ink")}>
                    {out ? "Sold out" : formatINR(unitPrice(product, v))}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        {!soldOut && product.type !== "original_art" && (
          <QtyStepper value={Math.min(qty, Math.max(1, canAddMore))} max={Math.max(1, canAddMore)} onChange={setQty} />
        )}
        <button
          type="button"
          onClick={addToCart}
          disabled={soldOut || canAddMore === 0}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 font-medium text-cream hover:bg-ink/85 disabled:cursor-not-allowed disabled:bg-ink/40"
        >
          {soldOut ? (
            "Sold out"
          ) : canAddMore === 0 ? (
            <>
              <CheckIcon className="size-5" aria-hidden="true" /> In your cart
            </>
          ) : (
            <>
              <ShoppingBagIcon className="size-5" aria-hidden="true" /> Add to cart
            </>
          )}
        </button>
      </div>
      {inCart > 0 && canAddMore > 0 && (
        <p className="-mt-3 text-sm text-muted-ink">
          {inCart} already in your cart.
        </p>
      )}

      <SaveButton productId={product.id} className="w-full sm:w-auto" />
    </div>
  );
}
