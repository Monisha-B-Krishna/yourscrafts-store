/**
 * Writes supabase/seed.sql from src/lib/seed/data.ts.
 * Run: npm run seed:generate
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ID_KIND,
  seedCategories,
  seedCollections,
  seedCoupon,
  seedId,
  seedProductImages,
  seedProducts,
} from "../src/lib/seed/data";
import { DEFAULT_SETTINGS } from "../src/lib/settings";

const q = (v: string | null | undefined) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);
const paise = (rupees: number) => Math.round(rupees * 100);
const textArray = (items: string[]) =>
  items.length ? `array[${items.map(q).join(", ")}]::text[]` : "'{}'::text[]";

const lines: string[] = [
  "-- =============================================================================",
  "-- Example data for Yours Crafts Woman. GENERATED FILE — do not edit by hand.",
  "-- Source: src/lib/seed/data.ts  →  npm run seed:generate",
  "-- Prices are in paise (₹1 = 100 paise).",
  "-- =============================================================================",
  "",
  "begin;",
  "",
  "-- Store settings (owner edits these in /admin/settings)",
];

for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
  lines.push(
    `insert into public.store_settings (key, value) values (${q(key)}, ${q(JSON.stringify(value))}::jsonb)`,
    "  on conflict (key) do nothing;",
  );
}

lines.push("", "-- Categories");
for (const c of seedCategories) {
  lines.push(
    `insert into public.categories (id, name, slug, sort_order) values (${q(seedId(ID_KIND.category, c.n))}, ${q(c.name)}, ${q(c.slug)}, ${c.n})`,
    "  on conflict (id) do nothing;",
  );
}

lines.push("", "-- Products, images and variants");
let variantN = 0;
for (const p of seedProducts) {
  const id = seedId(ID_KIND.product, p.n);
  const sku = `YCW-${String(p.n).padStart(3, "0")}`;
  lines.push(
    "insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (",
    `  ${q(id)}, ${q(p.name)}, ${q(p.slug)}, ${q(p.description)}, ${q(seedId(ID_KIND.category, p.category))},`,
    `  '${p.type}', ${paise(p.priceRupees)}, ${p.saleRupees === undefined ? "null" : paise(p.saleRupees)}, ${p.stock}, ${q(sku)},`,
    `  ${textArray(p.tags)}, ${p.featured ? "true" : "false"}, true, ${p.weightG}, ${q(p.dimensions)}, ${p.salesCount},`,
    `  now() - interval '${p.daysAgo} days'`,
    ") on conflict (id) do nothing;",
  );
  for (const img of seedProductImages(p)) {
    lines.push(
      `insert into public.product_images (id, product_id, url, alt, sort_order) values (${q(seedId(ID_KIND.image, p.n * 10 + img.sort_order))}, ${q(id)}, ${q(img.url)}, ${q(img.alt)}, ${img.sort_order})`,
      "  on conflict (id) do nothing;",
    );
  }
  for (const [i, v] of (p.variants ?? []).entries()) {
    variantN += 1;
    lines.push(
      `insert into public.product_variants (id, product_id, name, price_delta, stock, sku) values (${q(seedId(ID_KIND.variant, variantN))}, ${q(id)}, ${q(v.name)}, ${paise(v.priceDeltaRupees)}, ${v.stock}, ${q(`${sku}-${i + 1}`)})`,
      "  on conflict (id) do nothing;",
    );
  }
}

lines.push("", "-- Collections (editions)");
for (const c of seedCollections) {
  const id = seedId(ID_KIND.collection, c.n);
  lines.push(
    `insert into public.collections (id, name, slug, description, starts_at, ends_at, is_active) values (${q(id)}, ${q(c.name)}, ${q(c.slug)}, ${q(c.description)}, ${q(c.startsAt)}, ${q(c.endsAt)}, true)`,
    "  on conflict (id) do nothing;",
  );
  for (const pn of c.products) {
    lines.push(
      `insert into public.collection_products (collection_id, product_id) values (${q(id)}, ${q(seedId(ID_KIND.product, pn))})`,
      "  on conflict (collection_id, product_id) do nothing;",
    );
  }
}

lines.push(
  "",
  "-- Coupon",
  `insert into public.coupons (id, code, type, value, min_order) values (${q(seedId(ID_KIND.coupon, seedCoupon.n))}, ${q(seedCoupon.code)}, '${seedCoupon.type}', ${seedCoupon.value}, ${paise(seedCoupon.minOrderRupees)})`,
  "  on conflict (id) do nothing;",
  "",
  "commit;",
  "",
);

const out = resolve(import.meta.dirname, "../supabase/seed.sql");
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Wrote ${out}`);
