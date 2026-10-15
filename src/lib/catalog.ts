import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { buildDemoCollections, buildDemoProducts, demoCategories } from "@/lib/seed/demo";
import { DEFAULT_SETTINGS, parseSettingsRows, type StoreSettings } from "@/lib/settings";
import { applyProductQuery, type ProductQuery } from "@/lib/shop-query";
import { createPublicClient } from "@/lib/supabase/public";
import type { Category, Collection, Product } from "@/lib/types";

/**
 * Storefront data access. Reads from Supabase when it is configured; otherwise
 * serves the example catalogue ("demo mode") so the site can be previewed
 * before any accounts are set up.
 */

const PRODUCT_COLUMNS = `
  id, name, slug, description, category_id, type, price, sale_price, stock, tags,
  is_featured, sales_count, dimensions, created_at,
  images:product_images (url, alt, sort_order),
  variants:product_variants (id, name, price_delta, stock),
  category:categories (name, slug)
`;

function normaliseProduct(row: Product): Product {
  return {
    ...row,
    tags: row.tags ?? [],
    images: [...(row.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    variants: row.variants ?? [],
  };
}

function fail(what: string, error: { message: string }): never {
  throw new Error(`Could not load ${what} from Supabase: ${error.message}`);
}

export const isDemoMode = () => !isSupabaseConfigured();

export const getSettings = cache(async (): Promise<StoreSettings> => {
  if (isDemoMode()) return DEFAULT_SETTINGS;
  const { data, error } = await createPublicClient().from("store_settings").select("key, value");
  if (error) fail("store settings", error);
  return parseSettingsRows(data ?? []);
});

export const getCategories = cache(async (): Promise<Category[]> => {
  if (isDemoMode()) return demoCategories;
  const { data, error } = await createPublicClient()
    .from("categories")
    .select("id, name, slug, parent_id, sort_order")
    .order("sort_order");
  if (error) fail("categories", error);
  return data ?? [];
});

export async function listProducts(q: ProductQuery): Promise<{ items: Product[]; total: number }> {
  if (isDemoMode()) return applyProductQuery(buildDemoProducts(), q);

  let query = createPublicClient().from("products").select(PRODUCT_COLUMNS, { count: "exact" });

  if (q.category) {
    const category = (await getCategories()).find((c) => c.slug === q.category);
    if (!category) return { items: [], total: 0 };
    query = query.eq("category_id", category.id);
  }
  if (q.minPrice !== undefined) query = query.gte("effective_price", q.minPrice);
  if (q.maxPrice !== undefined) query = query.lte("effective_price", q.maxPrice);
  if (q.inStock) query = query.gt("stock", 0);

  switch (q.sort) {
    case "price-asc":
      query = query.order("effective_price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("effective_price", { ascending: false });
      break;
    case "popular":
      query = query.order("sales_count", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }
  query = query.order("id"); // stable pagination

  const from = (q.page - 1) * q.pageSize;
  const { data, error, count } = await query.range(from, from + q.pageSize - 1);
  // Asking for a page past the end returns a range error; treat it as empty.
  if (error && error.code !== "PGRST103") fail("products", error);
  return {
    items: ((data ?? []) as unknown as Product[]).map(normaliseProduct),
    total: count ?? 0,
  };
}

type HomeList = "new" | "bestsellers" | "deals" | "artwork";

/** Small product lists for the home page sections. */
export async function getHomeProducts(list: HomeList, limit = 8): Promise<Product[]> {
  if (isDemoMode()) {
    const all = buildDemoProducts();
    const pick = {
      new: () => [...all].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
      bestsellers: () =>
        all.filter((p) => p.type === "product").sort((a, b) => b.sales_count - a.sales_count),
      deals: () => all.filter((p) => p.sale_price !== null),
      artwork: () => all.filter((p) => p.type !== "product" && p.is_featured),
    }[list];
    return pick().slice(0, limit);
  }

  let query = createPublicClient().from("products").select(PRODUCT_COLUMNS);
  if (list === "new") query = query.order("created_at", { ascending: false });
  if (list === "bestsellers")
    query = query.eq("type", "product").order("sales_count", { ascending: false });
  if (list === "deals")
    query = query.not("sale_price", "is", null).order("sales_count", { ascending: false });
  if (list === "artwork")
    query = query
      .in("type", ["original_art", "print"])
      .eq("is_featured", true)
      .order("created_at", { ascending: false });

  const { data, error } = await query.limit(limit);
  if (error) fail(`${list} products`, error);
  return ((data ?? []) as unknown as Product[]).map(normaliseProduct);
}

export const getActiveCollections = cache(async (): Promise<Collection[]> => {
  if (isDemoMode()) return buildDemoCollections();
  // RLS already hides inactive and out-of-date collections from the public.
  const { data, error } = await createPublicClient()
    .from("collections")
    .select("id, name, slug, description, banner_image")
    .order("starts_at", { ascending: false });
  if (error) fail("collections", error);
  return data ?? [];
});
