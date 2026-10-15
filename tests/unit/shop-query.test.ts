import { describe, expect, it } from "vitest";
import { effectivePrice } from "@/lib/pricing";
import { seedCategories, seedCollections, seedProducts } from "@/lib/seed/data";
import { buildDemoProducts } from "@/lib/seed/demo";
import { applyProductQuery, PAGE_SIZE, parseShopParams } from "@/lib/shop-query";

describe("parseShopParams", () => {
  it("uses sensible defaults", () => {
    expect(parseShopParams({})).toEqual({
      category: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      inStock: false,
      sort: "new",
      page: 1,
      pageSize: PAGE_SIZE,
    });
  });

  it("converts rupees in the URL to paise", () => {
    const q = parseShopParams({ min: "500", max: "1500", stock: "1", sort: "price-asc", page: "2" });
    expect(q).toMatchObject({ minPrice: 50000, maxPrice: 150000, inStock: true, sort: "price-asc", page: 2 });
  });

  it("swaps min and max when reversed", () => {
    const q = parseShopParams({ min: "2000", max: "100" });
    expect(q).toMatchObject({ minPrice: 10000, maxPrice: 200000 });
  });

  it("ignores junk instead of erroring", () => {
    const q = parseShopParams({ category: "'; drop table", min: "-5", sort: "random", page: "abc" });
    expect(q).toMatchObject({ category: undefined, minPrice: undefined, sort: "new", page: 1 });
  });
});

describe("applyProductQuery (demo mode)", () => {
  const products = buildDemoProducts(Date.parse("2026-10-16T00:00:00Z"));
  const base = parseShopParams({});

  it("filters by category", () => {
    const { items, total } = applyProductQuery(products, { ...base, category: "gift-hampers" });
    expect(total).toBe(5);
    expect(items.every((p) => p.category?.slug === "gift-hampers")).toBe(true);
  });

  it("filters by effective (sale) price range", () => {
    const { items } = applyProductQuery(products, { ...base, minPrice: 50000, maxPrice: 100000, pageSize: 50 });
    expect(items.length).toBeGreaterThan(0);
    for (const p of items) {
      expect(effectivePrice(p)).toBeGreaterThanOrEqual(50000);
      expect(effectivePrice(p)).toBeLessThanOrEqual(100000);
    }
  });

  it("can hide sold-out items", () => {
    const all = applyProductQuery(products, { ...base, pageSize: 50 });
    const inStock = applyProductQuery(products, { ...base, inStock: true, pageSize: 50 });
    expect(inStock.total).toBe(all.total - 1);
  });

  it("sorts by price", () => {
    const { items } = applyProductQuery(products, { ...base, sort: "price-asc", pageSize: 50 });
    const prices = items.map(effectivePrice);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("paginates", () => {
    const page1 = applyProductQuery(products, { ...base, page: 1 });
    const page3 = applyProductQuery(products, { ...base, page: 3 });
    expect(page1.items).toHaveLength(PAGE_SIZE);
    expect(page3.items).toHaveLength(products.length - 2 * PAGE_SIZE);
  });
});

describe("seed data matches the spec", () => {
  it("has ~20 products across 4 gift categories, 6 artworks, 2 collections", () => {
    const gifts = seedProducts.filter((p) => p.type === "product");
    const art = seedProducts.filter((p) => p.type !== "product");
    expect(gifts).toHaveLength(20);
    expect(new Set(gifts.map((p) => p.category)).size).toBe(4);
    expect(art).toHaveLength(6);
    expect(art.filter((p) => p.type === "original_art").every((p) => p.stock === 1)).toBe(true);
    expect(art.filter((p) => p.type === "print").every((p) => (p.variants ?? []).length > 1)).toBe(true);
    expect(seedCollections).toHaveLength(2);
  });

  it("has unique slugs and valid categories", () => {
    expect(new Set(seedProducts.map((p) => p.slug)).size).toBe(seedProducts.length);
    const categoryNs = new Set(seedCategories.map((c) => c.n));
    expect(seedProducts.every((p) => categoryNs.has(p.category))).toBe(true);
    expect(seedProducts.every((p) => p.saleRupees === undefined || p.saleRupees < p.priceRupees)).toBe(true);
  });
});
