import { z } from "zod";
import { effectivePrice } from "@/lib/pricing";
import type { Product } from "@/lib/types";

export const SORT_OPTIONS = [
  { value: "new", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const PAGE_SIZE = 12;

const optionalRupees = z.coerce.number().int().min(0).max(1_000_000).optional().catch(undefined);

/** Shop URL params, e.g. /shop?category=gift-hampers&min=500&max=1500&stock=1&sort=price-asc&page=2 */
const shopParamsSchema = z.object({
  category: z
    .string()
    .regex(/^[a-z0-9-]{1,80}$/)
    .optional()
    .catch(undefined),
  min: optionalRupees,
  max: optionalRupees,
  stock: z
    .enum(["1"])
    .optional()
    .catch(undefined)
    .transform((v) => v === "1"),
  sort: z.enum(["new", "popular", "price-asc", "price-desc"]).catch("new"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

export interface ProductQuery {
  category?: string;
  /** Prices in paise. */
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  sort: SortOption;
  page: number;
  pageSize: number;
}

type RawParams = Record<string, string | string[] | undefined>;

/** Validates untrusted URL params; anything invalid quietly falls back to a default. */
export function parseShopParams(params: RawParams): ProductQuery {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const parsed = shopParamsSchema.parse({
    category: first(params.category),
    min: first(params.min),
    max: first(params.max),
    stock: first(params.stock),
    sort: first(params.sort),
    page: first(params.page),
  });

  let { min, max } = parsed;
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];

  return {
    category: parsed.category,
    minPrice: min === undefined ? undefined : min * 100,
    maxPrice: max === undefined ? undefined : max * 100,
    inStock: parsed.stock,
    sort: parsed.sort,
    page: parsed.page,
    pageSize: PAGE_SIZE,
  };
}

/** Quick price ranges shown in the filters (in rupees). */
export const PRICE_PRESETS = [
  { label: "Under ₹500", min: undefined, max: 499 },
  { label: "₹500 – ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 – ₹2,000", min: 1000, max: 2000 },
  { label: "Over ₹2,000", min: 2000, max: undefined },
] as const;

type ShopLinkState = Pick<ProductQuery, "category" | "minPrice" | "maxPrice" | "inStock" | "sort"> & { page?: number };

/**
 * A clean /shop URL for a given filter state, leaving out defaults so links
 * stay short and shareable. Prices in the state are paise; the URL uses rupees.
 */
export function shopHref(state: ShopLinkState): string {
  const params = new URLSearchParams();
  if (state.category) params.set("category", state.category);
  if (state.minPrice !== undefined) params.set("min", String(Math.round(state.minPrice / 100)));
  if (state.maxPrice !== undefined) params.set("max", String(Math.round(state.maxPrice / 100)));
  if (state.inStock) params.set("stock", "1");
  if (state.sort !== "new") params.set("sort", state.sort);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

/** In-memory version of the shop query, used by demo mode (and tests). */
export function applyProductQuery(
  products: Product[],
  q: ProductQuery,
): { items: Product[]; total: number } {
  const filtered = products.filter((p) => {
    const price = effectivePrice(p);
    if (q.category && p.category?.slug !== q.category) return false;
    if (q.minPrice !== undefined && price < q.minPrice) return false;
    if (q.maxPrice !== undefined && price > q.maxPrice) return false;
    if (q.inStock && p.stock <= 0) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (q.sort) {
      case "price-asc":
        return effectivePrice(a) - effectivePrice(b);
      case "price-desc":
        return effectivePrice(b) - effectivePrice(a);
      case "popular":
        return b.sales_count - a.sales_count;
      case "new":
      default:
        return Date.parse(b.created_at) - Date.parse(a.created_at);
    }
  });

  const start = (q.page - 1) * q.pageSize;
  return { items: sorted.slice(start, start + q.pageSize), total: filtered.length };
}
