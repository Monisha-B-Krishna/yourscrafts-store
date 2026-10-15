"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HeartIcon, LockIcon, Trash2Icon, TruckIcon } from "lucide-react";
import { toast } from "sonner";
import { quoteCartAction } from "@/app/(shop)/cart/actions";
import { saveForLaterAction } from "@/app/(shop)/saved/actions";
import { track } from "@/lib/analytics/client";
import type { CartQuote, QuotedLine } from "@/lib/cart/quote";
import { cartStore, useCartLines, type CartLine } from "@/lib/cart/store";
import { formatINR } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { QtyStepper } from "./qty-stepper";
import { toastSignInToSave } from "./save-button";

const sameLine = (a: Pick<CartLine, "productId" | "variantId">, b: Pick<CartLine, "productId" | "variantId">) =>
  a.productId === b.productId && a.variantId === b.variantId;

export function CartView() {
  const lines = useCartLines();
  const [hydrated, setHydrated] = useState(false);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [notices, setNotices] = useState<Record<string, string>>({});
  const requestId = useRef(0);
  const linesKey = JSON.stringify(lines);

  useEffect(() => setHydrated(true), []);

  // Re-price the cart on the server whenever it changes.
  useEffect(() => {
    if (!hydrated) return;
    const id = ++requestId.current;
    const current = JSON.parse(linesKey) as CartLine[];
    if (current.length === 0) {
      setQuote(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const next = await quoteCartAction(current);
        if (id !== requestId.current) return; // a newer request is on its way
        setQuote(next);
        // Quantities above what's in stock are reduced, and we say so.
        for (const line of next.lines) {
          if (line.status === "adjusted") {
            cartStore.setQty(line, line.qty);
            setNotices((n) => ({
              ...n,
              [line.key]: `Only ${line.maxQty} available, so we've updated the quantity.`,
            }));
          }
        }
      } catch {
        if (id === requestId.current) toast.error("Couldn't refresh your cart. Please check your connection.");
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [linesKey, hydrated]);

  if (!hydrated || (lines.length > 0 && quote === null)) {
    return <CartSkeleton />;
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-3xl bg-peach-soft/60 px-6 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl">Your cart is empty</h2>
        <p className="mt-2 text-muted-ink">Find something handmade to love.</p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-7 font-medium text-cream hover:bg-ink/85"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  const shown = quote!;
  const quoted = new Map(shown.lines.map((l) => [l.key, l]));
  // Keep the customer's order of items; prices/stock come from the latest quote.
  const rows = lines.flatMap((line) => {
    const q = [...quoted.values()].find((l) => sameLine(l, line));
    return q ? [{ line, q }] : [];
  });
  const progress = Math.min(100, Math.round((shown.subtotal / shown.freeShippingThreshold) * 100));

  function changeQty(q: QuotedLine, line: CartLine, next: number) {
    const delta = next - line.qty;
    if (delta === 0) return;
    cartStore.setQty(line, next);
    setNotices((current) => {
      const rest = { ...current };
      delete rest[q.key];
      return rest;
    });
    track(delta > 0 ? "add_to_cart" : "remove_from_cart", {
      productId: line.productId,
      metadata: { qty: Math.abs(delta), variant_id: line.variantId, source: "cart" },
    });
  }

  function remove(q: QuotedLine, line: CartLine) {
    cartStore.remove(line);
    if (q.status === "unavailable" || q.status === "sold_out") {
      // Nothing to undo or track: it couldn't be bought anyway.
      toast("Removed from your cart");
      return;
    }
    track("remove_from_cart", {
      productId: line.productId,
      metadata: { qty: line.qty, variant_id: line.variantId, source: "cart" },
    });
    toast(`Removed ${q.name}`, {
      action: {
        label: "Undo",
        onClick: () => {
          cartStore.add(line, q.maxQty || line.qty);
          track("add_to_cart", {
            productId: line.productId,
            metadata: { qty: line.qty, variant_id: line.variantId, source: "cart" },
          });
        },
      },
    });
  }

  async function moveToSaved(q: QuotedLine, line: CartLine) {
    const result = await saveForLaterAction(line.productId);
    if (result.ok) {
      cartStore.remove(line);
      track("save_for_later", { productId: line.productId, metadata: { source: "cart" } });
      toast.success("Moved to Saved for later");
    } else if (result.reason === "signed_out") {
      toastSignInToSave();
    } else {
      toast.error("Couldn't save that just now. Please try again.");
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <div>
        {/* Free shipping progress (CLAUDE.md §5: "₹X more for free shipping") */}
        <div className="mb-6 rounded-2xl bg-white/70 p-4 ring-1 ring-border" aria-live="polite">
          <p className="flex items-center gap-2 text-sm">
            <TruckIcon className="size-5 shrink-0" aria-hidden="true" />
            {shown.amountToFreeShipping > 0 ? (
              <span>
                Add <strong>{formatINR(shown.amountToFreeShipping)}</strong> more for free shipping
              </span>
            ) : (
              <span>
                <strong>Yay!</strong> Your order ships free.
              </span>
            )}
          </p>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-peach-soft"
            role="progressbar"
            aria-label="Progress towards free shipping"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="h-full rounded-full bg-peach transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <ul className="divide-y divide-border border-y border-border">
          {rows.map(({ line, q }) => {
            const blocked = q.status === "sold_out" || q.status === "unavailable";
            return (
              <li key={q.key} className="flex gap-4 py-5 sm:gap-6">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-peach-soft sm:size-28">
                  {q.image && (
                    <Image
                      src={q.image.url}
                      alt={q.image.alt || q.name}
                      fill
                      sizes="112px"
                      unoptimized={q.image.url.endsWith(".svg")}
                      className={cn("object-cover", blocked && "opacity-50")}
                    />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-sans text-base leading-snug font-medium">
                        {q.slug ? (
                          <Link href={`/product/${q.slug}`} className="hover:underline hover:underline-offset-4">
                            {q.name}
                          </Link>
                        ) : (
                          q.name
                        )}
                      </h2>
                      {q.variantName && <p className="text-sm text-muted-ink">{q.variantName}</p>}
                    </div>
                    {!blocked && (
                      <p className="shrink-0 text-right font-semibold">
                        {formatINR(q.unitPrice * line.qty)}
                      </p>
                    )}
                  </div>

                  {!blocked && (
                    <p className="text-sm text-muted-ink">
                      {formatINR(q.unitPrice)} each
                      {q.compareAtPrice !== null && (
                        <span className="ml-2 line-through">
                          <span className="sr-only">was </span>
                          {formatINR(q.compareAtPrice)}
                        </span>
                      )}
                    </p>
                  )}

                  {blocked && (
                    <p className="text-sm font-medium text-peach-deep">
                      {q.status === "sold_out"
                        ? "Sold out. Please remove it to continue."
                        : "No longer available. Please remove it to continue."}
                    </p>
                  )}
                  {notices[q.key] && !blocked && <p className="text-sm text-peach-deep">{notices[q.key]}</p>}

                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                    {!blocked && q.type !== "original_art" && (
                      <QtyStepper
                        size="sm"
                        value={line.qty}
                        max={Math.max(1, q.maxQty)}
                        onChange={(next) => changeQty(q, line, next)}
                        label={`Quantity of ${q.name}`}
                      />
                    )}
                    {!blocked && q.type === "original_art" && (
                      <span className="text-sm text-muted-ink">One of a kind</span>
                    )}
                    {!blocked && (
                      <button
                        type="button"
                        onClick={() => moveToSaved(q, line)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-sm text-ink hover:bg-peach-soft"
                      >
                        <HeartIcon className="size-4" aria-hidden="true" />
                        Save for later
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(q, line)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-sm text-ink hover:bg-peach-soft"
                    >
                      <Trash2Icon className="size-4" aria-hidden="true" />
                      Remove
                      <span className="sr-only"> {q.name}</span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-sm">
          <Link href="/saved" className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline">
            <HeartIcon className="size-4" aria-hidden="true" />
            View your saved items
          </Link>
        </p>
      </div>

      <aside aria-labelledby="summary-title" className="rounded-3xl bg-white/80 p-6 ring-1 ring-border lg:sticky lg:top-40">
        <h2 id="summary-title" className="text-2xl">
          Order summary
        </h2>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt>
              Subtotal ({shown.itemCount} {shown.itemCount === 1 ? "item" : "items"})
            </dt>
            <dd className="font-medium">{formatINR(shown.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd className="font-medium">{shown.shippingFee === 0 ? "Free" : formatINR(shown.shippingFee)}</dd>
          </div>
          <div className="flex justify-between border-t pt-3 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold">{formatINR(shown.total)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted-ink">Have a coupon? You can add it at checkout.</p>

        {/* Checkout and Razorpay payments arrive in Phase 4. */}
        <button
          type="button"
          disabled
          aria-describedby="checkout-soon"
          className="mt-6 inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-ink/40 px-6 font-medium text-cream"
        >
          <LockIcon className="size-4" aria-hidden="true" />
          Checkout
        </button>
        <p id="checkout-soon" className="mt-2 text-center text-xs text-muted-ink">
          {shown.hasIssues && shown.lines.some((l) => l.status === "sold_out" || l.status === "unavailable")
            ? "Remove unavailable items to continue."
            : "Checkout is being set up and opens soon."}
        </p>
      </aside>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]" aria-busy="true" aria-label="Loading your cart">
      <div className="space-y-5">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-5">
            <div className="size-24 animate-pulse rounded-2xl bg-peach-soft sm:size-28" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-peach-soft" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-peach-soft" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-3xl bg-peach-soft/70" />
    </div>
  );
}
