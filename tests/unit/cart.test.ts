import { describe, expect, it } from "vitest";
import { lineKey, MAX_QTY_PER_LINE, maxQtyFor, quoteCart } from "@/lib/cart/quote";
import { addLine, cartCount, parseStoredCart, removeLine, setLineQty, type CartLine } from "@/lib/cart/store";
import { buildDemoProducts } from "@/lib/seed/demo";
import { DEFAULT_SETTINGS } from "@/lib/settings";

const products = buildDemoProducts(Date.parse("2026-10-16T00:00:00Z"));
const bySlug = (slug: string) => products.find((p) => p.slug === slug)!;

const bouquet = bySlug("blush-rose-chocolate-bouquet"); // ₹1,299 → sale ₹1,099, stock 8
const soldOut = bySlug("personalised-name-chocolate-bouquet"); // stock 0
const original = bySlug("monsoon-over-marine-drive"); // original art, stock 1
const print = bySlug("peach-bloom-print"); // A4 +0 (20), A3 +₹500 (10), A2 +₹1,200 (5)
const a3 = print.variants.find((v) => v.name.startsWith("A3"))!;

describe("cart line helpers (localStorage cart)", () => {
  const a: CartLine = { productId: "p1", variantId: null, qty: 1 };

  it("merges the same product + option into one line", () => {
    const lines = addLine(addLine([], a), { ...a, qty: 2 });
    expect(lines).toEqual([{ productId: "p1", variantId: null, qty: 3 }]);
  });

  it("keeps different options as separate lines", () => {
    const lines = addLine(addLine([], a), { ...a, variantId: "v2" });
    expect(lines).toHaveLength(2);
  });

  it("caps quantities", () => {
    expect(addLine([], { ...a, qty: 50 })[0].qty).toBe(MAX_QTY_PER_LINE);
    expect(addLine([], { ...a, qty: 5 }, 2)[0].qty).toBe(2);
    expect(setLineQty([a], a, 0)[0].qty).toBe(1);
  });

  it("removes and counts lines", () => {
    const lines = addLine([a], { productId: "p2", variantId: null, qty: 4 });
    expect(cartCount(lines)).toBe(5);
    expect(removeLine(lines, a)).toEqual([{ productId: "p2", variantId: null, qty: 4 }]);
  });

  it("survives corrupted or tampered storage", () => {
    expect(parseStoredCart(null)).toEqual([]);
    expect(parseStoredCart("not json")).toEqual([]);
    expect(parseStoredCart('{"a":1}')).toEqual([]);
    expect(
      parseStoredCart(
        JSON.stringify([
          { productId: "p1", variantId: null, qty: 2 },
          { productId: "p1", variantId: null, qty: 1 },
          { productId: "p2", variantId: null, qty: -3 },
          { productId: "p3", qty: 1 },
          "junk",
        ]),
      ),
    ).toEqual([{ productId: "p1", variantId: null, qty: 3 }]);
  });
});

describe("quoteCart (server-side pricing)", () => {
  it("prices lines from product data, including sale prices and variants", () => {
    const quote = quoteCart(
      [
        { productId: bouquet.id, variantId: null, qty: 2 },
        { productId: print.id, variantId: a3.id, qty: 1 },
      ],
      products,
      DEFAULT_SETTINGS,
    );
    const [b, p] = quote.lines;
    expect(b).toMatchObject({ status: "ok", qty: 2, unitPrice: 109900, compareAtPrice: 129900, lineTotal: 219800 });
    expect(p).toMatchObject({ status: "ok", qty: 1, unitPrice: 79900 + 50000, variantName: a3.name });
    expect(quote.subtotal).toBe(219800 + 129900);
    expect(quote.shippingFee).toBe(0); // above ₹999
    expect(quote.total).toBe(quote.subtotal);
    expect(quote.itemCount).toBe(3);
  });

  it("charges flat shipping below the free-shipping threshold", () => {
    const keychain = bySlug("custom-name-keychain"); // ₹299
    const quote = quoteCart([{ productId: keychain.id, variantId: null, qty: 1 }], products, DEFAULT_SETTINGS);
    expect(quote.subtotal).toBe(29900);
    expect(quote.shippingFee).toBe(8000);
    expect(quote.total).toBe(37900);
    expect(quote.amountToFreeShipping).toBe(99900 - 29900);
  });

  it("reduces quantities to what's in stock", () => {
    const quote = quoteCart([{ productId: bouquet.id, variantId: null, qty: 9 }], products, DEFAULT_SETTINGS);
    expect(quote.lines[0]).toMatchObject({ status: "adjusted", qty: 8, requestedQty: 9, maxQty: 8 });
  });

  it("allows only one of an original painting", () => {
    expect(maxQtyFor(original, null)).toBe(1);
    const quote = quoteCart([{ productId: original.id, variantId: null, qty: 3 }], products, DEFAULT_SETTINGS);
    expect(quote.lines[0]).toMatchObject({ status: "adjusted", qty: 1 });
  });

  it("excludes sold-out and unknown items from the total", () => {
    const quote = quoteCart(
      [
        { productId: soldOut.id, variantId: null, qty: 1 },
        { productId: "00000000-0000-4000-8000-00000000dead", variantId: null, qty: 1 },
      ],
      products,
      DEFAULT_SETTINGS,
    );
    expect(quote.lines.map((l) => l.status)).toEqual(["sold_out", "unavailable"]);
    expect(quote.subtotal).toBe(0);
    expect(quote.shippingFee).toBe(0);
    expect(quote.hasIssues).toBe(true);
  });

  it("rejects a missing or made-up option for products with options", () => {
    const quote = quoteCart(
      [
        { productId: print.id, variantId: null, qty: 1 },
        { productId: print.id, variantId: "40000000-0000-4000-8000-0000000000ff", qty: 1 },
        { productId: bouquet.id, variantId: a3.id, qty: 1 },
      ],
      products,
      DEFAULT_SETTINGS,
    );
    expect(quote.lines.every((l) => l.status === "unavailable")).toBe(true);
  });

  it("merges duplicate lines defensively", () => {
    const quote = quoteCart(
      [
        { productId: bouquet.id, variantId: null, qty: 1 },
        { productId: bouquet.id, variantId: null, qty: 2 },
      ],
      products,
      DEFAULT_SETTINGS,
    );
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0].qty).toBe(3);
    expect(quote.lines[0].key).toBe(lineKey(bouquet.id, null));
  });
});
