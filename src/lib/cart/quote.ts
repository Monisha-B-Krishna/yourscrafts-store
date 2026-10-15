import { amountToFreeShipping, compareAtPrice, shippingFee, unitPrice } from "@/lib/pricing";
import type { StoreSettings } from "@/lib/settings";
import type { Paise, Product, ProductImage, ProductType, ProductVariant } from "@/lib/types";

/** Most of one item a customer can buy at once (handmade, so kept small). */
export const MAX_QTY_PER_LINE = 10;

export interface CartLineInput {
  productId: string;
  variantId: string | null;
  qty: number;
}

/**
 * ok          – fine as it is
 * adjusted    – quantity reduced to what's in stock
 * sold_out    – product exists but none left
 * unavailable – product/option removed or archived
 */
export type LineStatus = "ok" | "adjusted" | "sold_out" | "unavailable";

export interface QuotedLine {
  key: string;
  productId: string;
  variantId: string | null;
  status: LineStatus;
  /** Quantity being charged (0 when the line can't be bought). */
  qty: number;
  requestedQty: number;
  maxQty: number;
  name: string;
  slug: string | null;
  type: ProductType | null;
  variantName: string | null;
  image: ProductImage | null;
  unitPrice: Paise;
  compareAtPrice: Paise | null;
  lineTotal: Paise;
}

export interface CartQuote {
  lines: QuotedLine[];
  /** Units that will be charged. */
  itemCount: number;
  subtotal: Paise;
  shippingFee: Paise;
  total: Paise;
  amountToFreeShipping: Paise;
  freeShippingThreshold: Paise;
  hasIssues: boolean;
}

export const lineKey = (productId: string, variantId: string | null) => `${productId}:${variantId ?? ""}`;

/** Units available for a product, or for one of its variants. */
export function availableStock(product: Product, variant: ProductVariant | null): number {
  if (variant) return Math.max(0, variant.stock);
  return product.variants.length > 0 ? 0 : Math.max(0, product.stock);
}

/** Highest quantity allowed for one cart line. Originals are one of a kind. */
export function maxQtyFor(product: Product, variant: ProductVariant | null): number {
  const cap = product.type === "original_art" ? 1 : MAX_QTY_PER_LINE;
  return Math.min(availableStock(product, variant), cap);
}

/**
 * Prices a cart using ONLY server-side product data. The browser sends ids and
 * quantities; it never decides a price. Checkout (Phase 4) reuses this.
 */
export function quoteCart(
  input: CartLineInput[],
  products: Product[],
  settings: Pick<StoreSettings, "flat_shipping_rate" | "free_shipping_threshold">,
): CartQuote {
  const byId = new Map(products.map((p) => [p.id, p]));

  // Merge duplicate lines defensively (same product + variant).
  const merged = new Map<string, CartLineInput>();
  for (const line of input) {
    const key = lineKey(line.productId, line.variantId);
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, qty: existing.qty + line.qty } : { ...line });
  }

  const lines: QuotedLine[] = [...merged.entries()].map(([key, line]) => {
    const product = byId.get(line.productId);
    const unavailable: QuotedLine = {
      key,
      productId: line.productId,
      variantId: line.variantId,
      status: "unavailable",
      qty: 0,
      requestedQty: line.qty,
      maxQty: 0,
      name: product?.name ?? "This item is no longer available",
      slug: product?.slug ?? null,
      type: product?.type ?? null,
      variantName: null,
      image: product?.images[0] ?? null,
      unitPrice: 0,
      compareAtPrice: null,
      lineTotal: 0,
    };
    if (!product) return unavailable;

    const variant = line.variantId ? product.variants.find((v) => v.id === line.variantId) ?? null : null;
    if (line.variantId && !variant) return unavailable; // option removed, or not one of this product's options
    if (product.variants.length > 0 && !variant) return unavailable; // an option (e.g. size) must be chosen

    const price = unitPrice(product, variant);
    const maxQty = maxQtyFor(product, variant);
    const base = {
      ...unavailable,
      variantName: variant?.name ?? null,
      unitPrice: price,
      compareAtPrice: compareAtPrice(product, variant),
      maxQty,
    };

    if (maxQty <= 0) return { ...base, status: "sold_out" as const };
    const qty = Math.min(line.qty, maxQty);
    return {
      ...base,
      status: qty < line.qty ? ("adjusted" as const) : ("ok" as const),
      qty,
      lineTotal: price * qty,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const fee = shippingFee(subtotal, settings);
  return {
    lines,
    itemCount: lines.reduce((sum, l) => sum + l.qty, 0),
    subtotal,
    shippingFee: fee,
    total: subtotal + fee,
    amountToFreeShipping: subtotal > 0 ? amountToFreeShipping(subtotal, settings) : settings.free_shipping_threshold,
    freeShippingThreshold: settings.free_shipping_threshold,
    hasIssues: lines.some((l) => l.status !== "ok"),
  };
}
