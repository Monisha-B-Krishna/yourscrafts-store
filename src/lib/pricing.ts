import type { Paise } from "@/lib/types";

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 49900 → "₹499", 49950 → "₹499.50" */
export function formatINR(paise: Paise): string {
  return paise % 100 === 0 ? inrWhole.format(paise / 100) : inrPaise.format(paise / 100);
}

export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

/** The price a customer actually pays for one unit (before coupons). */
export function effectivePrice(p: { price: Paise; sale_price: Paise | null }): Paise {
  return p.sale_price !== null && p.sale_price < p.price ? p.sale_price : p.price;
}

export function isOnSale(p: { price: Paise; sale_price: Paise | null }): boolean {
  return effectivePrice(p) < p.price;
}

/** Whole-number percentage saved, e.g. 20 for 20% off. 0 when not on sale. */
export function discountPercent(p: { price: Paise; sale_price: Paise | null }): number {
  if (!isOnSale(p)) return 0;
  return Math.round(((p.price - effectivePrice(p)) / p.price) * 100);
}

/** Price of one unit of a product, including the chosen variant's price difference. */
export function unitPrice(
  p: { price: Paise; sale_price: Paise | null },
  variant?: { price_delta: Paise } | null,
): Paise {
  return Math.max(0, effectivePrice(p) + (variant?.price_delta ?? 0));
}

/** The pre-sale price to show struck through, or null when not on sale. */
export function compareAtPrice(
  p: { price: Paise; sale_price: Paise | null },
  variant?: { price_delta: Paise } | null,
): Paise | null {
  return isOnSale(p) ? p.price + (variant?.price_delta ?? 0) : null;
}

/** Lowest price across a product's variants, for "From ₹X" labels. */
export function fromPrice(p: {
  price: Paise;
  sale_price: Paise | null;
  variants: { price_delta: Paise }[];
}): Paise {
  if (p.variants.length === 0) return effectivePrice(p);
  return Math.min(...p.variants.map((v) => unitPrice(p, v)));
}

/** Flat shipping, free at or above the threshold. Both values come from store settings. */
export function shippingFee(
  subtotal: Paise,
  settings: { flat_shipping_rate: Paise; free_shipping_threshold: Paise },
): Paise {
  if (subtotal <= 0) return 0;
  return subtotal >= settings.free_shipping_threshold ? 0 : settings.flat_shipping_rate;
}

/** How much more the customer must add to unlock free shipping (0 if already free). */
export function amountToFreeShipping(
  subtotal: Paise,
  settings: { free_shipping_threshold: Paise },
): Paise {
  return Math.max(0, settings.free_shipping_threshold - subtotal);
}
