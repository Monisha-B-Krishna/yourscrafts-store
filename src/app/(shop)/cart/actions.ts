"use server";

import { z } from "zod";
import { getProductsByIds, getSettings } from "@/lib/catalog";
import { quoteCart, type CartLineInput, type CartQuote } from "@/lib/cart/quote";

const lineSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable(),
  qty: z.number().int().min(1).max(99),
});

/**
 * Prices the browser's cart with fresh server data (current prices, stock and
 * shipping settings). Malformed lines are dropped rather than failing the cart.
 */
export async function quoteCartAction(input: unknown): Promise<CartQuote> {
  const items = Array.isArray(input) ? input.slice(0, 50) : [];
  const lines: CartLineInput[] = items.flatMap((item) => {
    const parsed = lineSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });

  const [products, settings] = await Promise.all([
    getProductsByIds(lines.map((l) => l.productId)),
    getSettings(),
  ]);
  return quoteCart(lines, products, settings);
}
