"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { CartLine } from "@/lib/cart/store";
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

export type CartSyncResult = { ok: true; lines: CartLine[] } | { ok: false; reason: "signed_out" | "error" };

/**
 * Keeps a signed-in customer's database cart in step with the browser.
 *   "merge"   — at login: adds the guest cart to the saved one (quantities add up)
 *   "replace" — after any change: the saved cart becomes exactly these lines
 * Returns the saved cart, which the browser then shows.
 */
export async function syncCartAction(input: unknown, mode: "merge" | "replace"): Promise<CartSyncResult> {
  if (mode !== "merge" && mode !== "replace") return { ok: false, reason: "error" };
  const session = await getCurrentUser();
  if (!session) return { ok: false, reason: "signed_out" };

  const items = Array.isArray(input) ? input.slice(0, 50) : [];
  const lines = items.flatMap((item) => {
    const parsed = lineSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });

  const { data, error } = await session.supabase.rpc("sync_cart", { items: lines, mode });
  if (error) {
    console.error("Cart sync failed:", error.message);
    return { ok: false, reason: "error" };
  }
  const saved = z.array(lineSchema.extend({ qty: z.number().int().min(1) })).safeParse(data);
  return saved.success ? { ok: true, lines: saved.data } : { ok: false, reason: "error" };
}
