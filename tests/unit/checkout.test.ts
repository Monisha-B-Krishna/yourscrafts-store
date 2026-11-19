import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkCoupon, checkoutTotals, normaliseCouponCode, type Coupon } from "@/lib/checkout/totals";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/razorpay";
import { checkoutSchema } from "@/lib/validation/checkout";

const settings = { flat_shipping_rate: 8000, free_shipping_threshold: 99900 };

const coupon = (overrides: Partial<Coupon> = {}): Coupon => ({
  code: "WELCOME10",
  type: "percentage",
  value: 10,
  min_order: 49900,
  starts_at: null,
  ends_at: null,
  usage_limit: null,
  used_count: 0,
  ...overrides,
});

describe("coupon codes", () => {
  it("tidies what the customer types", () => {
    expect(normaliseCouponCode("  welcome10 ")).toBe("WELCOME10");
    expect(normaliseCouponCode("DIWALI-2026")).toBe("DIWALI-2026");
    expect(normaliseCouponCode("no spaces")).toBeNull();
    expect(normaliseCouponCode("x")).toBeNull();
  });

  it("takes a percentage off, rounding down to the paisa", () => {
    expect(checkCoupon(coupon(), 64900)).toEqual({ ok: true, discount: 6490 });
    expect(checkCoupon(coupon({ value: 15 }), 49999)).toEqual({ ok: true, discount: 7499 });
  });

  it("takes a flat amount off, never more than the subtotal", () => {
    expect(checkCoupon(coupon({ type: "flat", value: 10000, min_order: 0 }), 64900)).toEqual({ ok: true, discount: 10000 });
    expect(checkCoupon(coupon({ type: "flat", value: 90000, min_order: 0 }), 64900)).toEqual({ ok: true, discount: 64900 });
  });

  it("explains why a coupon can't be used", () => {
    const now = new Date("2026-11-19T12:00:00Z");
    const msg = (c: Coupon | null, subtotal = 64900) => {
      const r = checkCoupon(c, subtotal, now);
      return r.ok ? null : r.message;
    };
    expect(msg(null)).toMatch(/isn't valid/);
    expect(msg(coupon(), 30000)).toMatch(/₹499 or more/);
    expect(msg(coupon({ starts_at: "2026-12-01T00:00:00Z" }))).toMatch(/isn't active yet/);
    expect(msg(coupon({ ends_at: "2026-11-19T11:59:59Z" }))).toMatch(/expired/);
    expect(msg(coupon({ usage_limit: 5, used_count: 5 }))).toMatch(/fully used/);
    expect(msg(coupon({ usage_limit: 5, used_count: 4 }))).toBeNull();
  });
});

describe("order totals", () => {
  it("charges flat shipping below the free-shipping amount", () => {
    expect(checkoutTotals(64900, 0, settings)).toEqual({ subtotal: 64900, discount: 0, shippingFee: 8000, total: 72900 });
  });

  it("ships free at or above the threshold, judged before the coupon", () => {
    expect(checkoutTotals(99900, 9990, settings)).toEqual({ subtotal: 99900, discount: 9990, shippingFee: 0, total: 89910 });
  });

  it("never lets a discount go below zero or above the subtotal", () => {
    expect(checkoutTotals(5000, 9000, settings).total).toBe(8000);
    expect(checkoutTotals(5000, -100, settings).discount).toBe(0);
  });
});

describe("Razorpay signatures", () => {
  const secret = "test_secret";
  const sign = (payload: string, key = secret) => createHmac("sha256", key).update(payload).digest("hex");

  it("accepts a genuine payment signature", () => {
    expect(verifyPaymentSignature("order_ABC123", "pay_XYZ789", sign("order_ABC123|pay_XYZ789"), secret)).toBe(true);
  });

  it("rejects tampered or made-up signatures", () => {
    const good = sign("order_ABC123|pay_XYZ789");
    expect(verifyPaymentSignature("order_ABC123", "pay_OTHER1", good, secret)).toBe(false);
    expect(verifyPaymentSignature("order_ABC123", "pay_XYZ789", sign("order_ABC123|pay_XYZ789", "wrong"), secret)).toBe(false);
    expect(verifyPaymentSignature("order_ABC123", "pay_XYZ789", "not-hex", secret)).toBe(false);
    expect(verifyPaymentSignature("order_ABC123", "pay_XYZ789", good, "")).toBe(false);
  });

  it("checks webhooks against the exact body received", () => {
    const body = JSON.stringify({ event: "payment.captured", payload: {} });
    expect(verifyWebhookSignature(body, sign(body), secret)).toBe(true);
    expect(verifyWebhookSignature(body + " ", sign(body), secret)).toBe(false);
  });
});

describe("checkout form", () => {
  const contact = { email: "Asha@Example.com", phone: "+91 98765 43210" };
  const address = {
    name: "Asha Rao",
    phone: "9876543210",
    line1: "12, 3rd Cross",
    line2: "",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560003",
  };

  it("accepts a new address and tidies the details", () => {
    const parsed = checkoutSchema.parse({ ...contact, addressMode: "new", address, saveAddress: false });
    expect(parsed.email).toBe("asha@example.com");
    expect(parsed.phone).toBe("9876543210");
  });

  it("needs a chosen address when using a saved one", () => {
    expect(checkoutSchema.safeParse({ ...contact, addressMode: "saved", addressId: "" }).success).toBe(false);
  });

  it("only delivers within India", () => {
    const abroad = { ...address, state: "California", pincode: "94103" };
    expect(checkoutSchema.safeParse({ ...contact, addressMode: "new", address: abroad, saveAddress: false }).success).toBe(false);
  });
});
