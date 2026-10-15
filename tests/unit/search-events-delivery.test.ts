import { describe, expect, it } from "vitest";
import { parseClientEvent, scrubQuery } from "@/lib/analytics/events";
import { estimateDelivery, formatDeliveryDate } from "@/lib/delivery";
import { compareAtPrice, fromPrice, unitPrice } from "@/lib/pricing";
import { searchInMemory, searchWords } from "@/lib/search";
import { buildDemoProducts } from "@/lib/seed/demo";
import { shopHref } from "@/lib/shop-query";

const products = buildDemoProducts(Date.parse("2026-10-16T00:00:00Z"));
const names = (q: string) => searchInMemory(products, q, 5).map((p) => p.name);

describe("search (demo mode)", () => {
  it("splits queries into safe words", () => {
    expect(searchWords("  Diwali, DIYAS!! ")).toEqual(["diwali", "diyas"]);
    expect(searchWords("x' OR 1=1 --")).toEqual(["x", "or", "1", "1"]);
  });

  it("matches words as you type (prefixes)", () => {
    expect(names("chocolat")).toContain("Blush Rose Chocolate Bouquet");
    expect(names("diwali diy")).toEqual(["Diwali Diya & Sweets Hamper", "Hand-painted Terracotta Diyas (Set of 4)"]);
  });

  it("uses category names and falls back to any word", () => {
    expect(names("gift hamper").length).toBeGreaterThan(0);
    expect(names("for her").slice(0, 2).sort()).toEqual(["Customised Jewellery Box", "Self-Care Spa Hamper"]);
  });

  it("returns nothing for empty or unknown queries", () => {
    expect(names("")).toEqual([]);
    expect(names("qwertyzz")).toEqual([]);
  });
});

describe("variant pricing", () => {
  const print = products.find((p) => p.slug === "peach-bloom-print")!;
  const frame = products.find((p) => p.slug === "hand-lettered-couple-frame")!; // ₹899 → ₹749

  it("adds the option's price difference", () => {
    const a2 = print.variants.find((v) => v.name.startsWith("A2"))!;
    expect(unitPrice(print, a2)).toBe(79900 + 120000);
    expect(fromPrice(print)).toBe(79900);
  });

  it("shows the struck-through price only when on sale", () => {
    expect(compareAtPrice(frame)).toBe(89900);
    expect(compareAtPrice(print)).toBeNull();
  });
});

describe("analytics events", () => {
  const base = { session_id: "abcdef1234567890" };

  it("masks personal data in search queries", () => {
    expect(scrubQuery("Gift for priya@gmail.com")).toBe("gift for [email]");
    expect(scrubQuery("call 98765 43210")).toBe("call [number]");
    expect(scrubQuery("hamper under 500 1000")).toBe("hamper under 500 1000");
  });

  it("accepts a valid event and drops unknown metadata keys", () => {
    const event = parseClientEvent({
      ...base,
      event_name: "search",
      metadata: { query: "Diwali", results: 3, source: "results_page", email: "x@y.z" },
    });
    expect(event).toEqual({
      ...base,
      event_name: "search",
      product_id: null,
      metadata: { query: "diwali", results: 3, source: "results_page" },
    });
  });

  it("rejects unknown events, browser-sent payment events and missing products", () => {
    expect(parseClientEvent({ ...base, event_name: "payment_success", metadata: {} })).toBeNull();
    expect(parseClientEvent({ ...base, event_name: "made_up", metadata: {} })).toBeNull();
    expect(parseClientEvent({ ...base, event_name: "add_to_cart", metadata: { qty: 1, source: "cart" } })).toBeNull();
    expect(parseClientEvent({ session_id: "bad id!", event_name: "page_view", metadata: { path: "/" } })).toBeNull();
  });

  it("validates per-event metadata", () => {
    const productId = "20000000-0000-4000-8000-000000000001";
    expect(
      parseClientEvent({ ...base, event_name: "add_to_cart", product_id: productId, metadata: { qty: 0, source: "cart" } }),
    ).toBeNull();
    expect(
      parseClientEvent({ ...base, event_name: "add_to_cart", product_id: productId, metadata: { qty: 2, source: "cart" } })
        ?.metadata,
    ).toEqual({ qty: 2, source: "cart" });
    expect(parseClientEvent({ ...base, event_name: "page_view", metadata: { path: "https://evil.example" } })).toBeNull();
  });
});

describe("delivery estimate", () => {
  it("adds dispatch and courier days, shown in Indian time", () => {
    const now = new Date("2026-10-16T10:00:00+05:30"); // Friday
    const est = estimateDelivery("product", now); // 1–3 dispatch + 3–6 transit
    expect(formatDeliveryDate(est.earliest)).toBe("Tue, 20 Oct");
    expect(formatDeliveryDate(est.latest)).toBe("Sun, 25 Oct");
  });
});

describe("shop links", () => {
  it("builds short, clean URLs", () => {
    expect(shopHref({ inStock: false, sort: "new" })).toBe("/shop");
    expect(
      shopHref({ category: "gift-hampers", minPrice: 50000, maxPrice: 100000, inStock: true, sort: "price-asc", page: 2 }),
    ).toBe("/shop?category=gift-hampers&min=500&max=1000&stock=1&sort=price-asc&page=2");
  });
});
