import { describe, expect, it } from "vitest";
import {
  amountToFreeShipping,
  discountPercent,
  effectivePrice,
  formatINR,
  isOnSale,
  rupeesToPaise,
  shippingFee,
} from "@/lib/pricing";
import { DEFAULT_SETTINGS } from "@/lib/settings";

describe("formatINR", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatINR(49900)).toBe("₹499");
  });
  it("keeps paise when present", () => {
    expect(formatINR(49950)).toBe("₹499.50");
  });
  it("uses Indian digit grouping", () => {
    expect(formatINR(12000000)).toBe("₹1,20,000");
  });
});

describe("rupeesToPaise", () => {
  it("avoids floating point drift", () => {
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });
});

describe("sale prices", () => {
  it("uses the sale price when lower", () => {
    const p = { price: 129900, sale_price: 109900 };
    expect(effectivePrice(p)).toBe(109900);
    expect(isOnSale(p)).toBe(true);
    expect(discountPercent(p)).toBe(15);
  });
  it("ignores a missing or higher sale price", () => {
    expect(effectivePrice({ price: 50000, sale_price: null })).toBe(50000);
    expect(effectivePrice({ price: 50000, sale_price: 60000 })).toBe(50000);
    expect(discountPercent({ price: 50000, sale_price: null })).toBe(0);
  });
});

describe("shipping", () => {
  const settings = DEFAULT_SETTINGS; // ₹80 flat, free from ₹999

  it("charges the flat rate below the threshold", () => {
    expect(shippingFee(99800, settings)).toBe(8000);
  });
  it("is free at exactly the threshold and above", () => {
    expect(shippingFee(99900, settings)).toBe(0);
    expect(shippingFee(250000, settings)).toBe(0);
  });
  it("is zero for an empty cart", () => {
    expect(shippingFee(0, settings)).toBe(0);
  });
  it("reports how much more is needed for free shipping", () => {
    expect(amountToFreeShipping(64900, settings)).toBe(35000);
    expect(amountToFreeShipping(120000, settings)).toBe(0);
  });
});
