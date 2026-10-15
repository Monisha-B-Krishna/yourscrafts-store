import type { Category, Collection, Product } from "@/lib/types";
import {
  ID_KIND,
  seedCategories,
  seedCollections,
  seedId,
  seedProductImages,
  seedProducts,
} from "./data";

const DAY_MS = 24 * 60 * 60 * 1000;
const toPaise = (rupees: number) => Math.round(rupees * 100);

export const demoCategories: Category[] = seedCategories.map((c) => ({
  id: seedId(ID_KIND.category, c.n),
  name: c.name,
  slug: c.slug,
  parent_id: null,
  sort_order: c.n,
}));

let variantCounter = 0;

/** The example catalogue in the same shape the Supabase queries return. */
export function buildDemoProducts(now = Date.now()): Product[] {
  variantCounter = 0;
  return seedProducts.map((p) => {
    const category = seedCategories.find((c) => c.n === p.category) ?? null;
    return {
      id: seedId(ID_KIND.product, p.n),
      name: p.name,
      slug: p.slug,
      description: p.description,
      category_id: category ? seedId(ID_KIND.category, category.n) : null,
      type: p.type,
      price: toPaise(p.priceRupees),
      sale_price: p.saleRupees === undefined ? null : toPaise(p.saleRupees),
      stock: p.stock,
      tags: p.tags,
      is_featured: p.featured ?? false,
      sales_count: p.salesCount,
      dimensions: p.dimensions ?? null,
      created_at: new Date(now - p.daysAgo * DAY_MS).toISOString(),
      images: seedProductImages(p),
      variants: (p.variants ?? []).map((v) => ({
        id: seedId(ID_KIND.variant, ++variantCounter),
        name: v.name,
        price_delta: toPaise(v.priceDeltaRupees),
        stock: v.stock,
      })),
      category: category ? { name: category.name, slug: category.slug } : null,
    };
  });
}

export function buildDemoCollections(now = Date.now()): Collection[] {
  return seedCollections
    .filter((c) => Date.parse(c.startsAt) <= now && Date.parse(c.endsAt) > now)
    .map((c) => ({
      id: seedId(ID_KIND.collection, c.n),
      name: c.name,
      slug: c.slug,
      description: c.description,
      banner_image: null,
    }));
}
