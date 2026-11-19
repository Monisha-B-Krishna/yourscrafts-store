import { describe, expect, it } from "vitest";
import { escapeHtml, orderConfirmationEmail, orderStatusEmail, type EmailOrder } from "@/lib/email/templates";
import { buildTimeline, expectedDelivery, normaliseOrderNumber, trackingUrl } from "@/lib/orders/timeline";

const at = (h: number) => new Date(Date.UTC(2026, 10, 19, h)).toISOString();

describe("order timeline", () => {
  it("shows a new order as placed, with the rest still to come", () => {
    const steps = buildTimeline("placed", [{ status: "placed", created_at: at(9) }]);
    expect(steps.map((s) => `${s.status}:${s.state}`)).toEqual([
      "placed:current",
      "confirmed:upcoming",
      "packed:upcoming",
      "shipped:upcoming",
      "delivered:upcoming",
    ]);
    expect(steps[0].at).toBe(at(9));
  });

  it("marks skipped steps as done, without a time", () => {
    const steps = buildTimeline("shipped", [
      { status: "placed", created_at: at(9) },
      { status: "shipped", created_at: at(15) },
    ]);
    expect(steps.map((s) => `${s.status}:${s.state}:${s.at ? "time" : "-"}`)).toEqual([
      "placed:done:time",
      "confirmed:done:-",
      "packed:done:-",
      "shipped:current:time",
      "delivered:upcoming:-",
    ]);
  });

  it("shows delivered as complete", () => {
    expect(buildTimeline("delivered", []).every((s) => s.state === "done")).toBe(true);
  });

  it("stops a cancelled order where it got to", () => {
    const steps = buildTimeline("cancelled", [
      { status: "placed", created_at: at(9) },
      { status: "confirmed", created_at: at(10) },
      { status: "cancelled", created_at: at(12) },
    ]);
    expect(steps.map((s) => `${s.status}:${s.state}`)).toEqual(["placed:done", "confirmed:done", "cancelled:current"]);
  });

  it("uses the latest time if a status was set twice", () => {
    const steps = buildTimeline("packed", [
      { status: "packed", created_at: at(11) },
      { status: "confirmed", created_at: at(10) },
      { status: "packed", created_at: at(13) },
    ]);
    expect(steps.find((s) => s.status === "packed")!.at).toBe(at(13));
  });
});

describe("tracking details", () => {
  it("turns a courier link into a link, and leaves plain IDs alone", () => {
    expect(trackingUrl("https://www.delhivery.com/track/package/123")).toBe("https://www.delhivery.com/track/package/123");
    expect(trackingUrl("DLV123456789")).toBeNull();
    expect(trackingUrl("javascript:alert(1)")).toBeNull();
    expect(trackingUrl(null)).toBeNull();
  });

  it.each([
    ["YCW-2026-00001", "YCW-2026-00001"],
    [" ycw-2026-00001 ", "YCW-2026-00001"],
    ["YCW 2026 00001", "YCW-2026-00001"],
    ["#YCW-2026-00042", "YCW-2026-00042"],
    ["ycw202600007", "YCW-2026-00007"],
  ])("reads the order number %s", (input, expected) => {
    expect(normaliseOrderNumber(input)).toBe(expected);
  });

  it.each(["", "12345", "ABC-2026-00001", "YCW-26-1"])("rejects %s", (input) => {
    expect(normaliseOrderNumber(input)).toBeNull();
  });

  it("estimates delivery from the slowest item", () => {
    const placed = new Date("2026-11-19T10:00:00Z");
    expect(expectedDelivery(["product"], placed)).toMatchObject({ dispatchMin: 1, dispatchMax: 3 });
    expect(expectedDelivery(["product", "original_art"], placed)).toMatchObject({ dispatchMin: 2, dispatchMax: 4 });
    expect(expectedDelivery([null, "unknown"], placed)).toMatchObject({ dispatchMin: 1, dispatchMax: 3 });
  });
});

describe("order emails", () => {
  const order: EmailOrder = {
    order_number: "YCW-2026-00001",
    status: "placed",
    subtotal: 144800,
    discount: 14480,
    shipping_fee: 0,
    total: 130320,
    coupon_code: "WELCOME10",
    courier: null,
    tracking_id: null,
    shipping_address: {
      name: "Meera <b>Iyer</b>",
      phone: "9123456789",
      line1: "7, Temple Street",
      line2: null,
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600004",
    },
    items: [
      { name_snapshot: "Blush Rose Chocolate Bouquet", price_snapshot: 109900, qty: 1 },
      { name_snapshot: "Diyas & <script>", price_snapshot: 34900, qty: 1 },
    ],
  };
  const links = { orderUrl: "https://shop.test/orders/YCW-2026-00001?key=abc", whatsappUrl: "https://wa.me/919999999999", expectedDelivery: "Mon, 23 Nov – Sat, 28 Nov" };

  it("escapes anything a customer typed", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });

  it("builds a receipt with items, totals, address and a tracking link", () => {
    const email = orderConfirmationEmail(order, links);
    expect(email.subject).toBe("Order YCW-2026-00001 confirmed · Yours Crafts Woman");
    for (const part of ["₹1,099", "−₹144.80", "₹1,303.20", "WELCOME10", "Chennai, Tamil Nadu 600004", "+91 91234 56789", "Mon, 23 Nov – Sat, 28 Nov", links.orderUrl.replace("&", "&amp;")]) {
      expect(email.html).toContain(part);
    }
    expect(email.html).toContain("Meera &lt;b&gt;Iyer&lt;/b&gt;");
    expect(email.html).not.toContain("<script>");
    expect(email.text).toContain("Total paid: ₹1,303.20");
    expect(email.text).toContain(links.orderUrl);
  });

  it("has no status email for a just-placed order", () => {
    expect(orderStatusEmail(order, links)).toBeNull();
  });

  it("tells the customer when it ships, with courier details", () => {
    const shipped = orderStatusEmail({ ...order, status: "shipped", courier: "Delhivery", tracking_id: "https://track.example/123" }, links)!;
    expect(shipped.subject).toBe("Order YCW-2026-00001: Shipped · Yours Crafts Woman");
    expect(shipped.html).toContain("Delhivery");
    expect(shipped.html).toContain("https://track.example/123");
    expect(shipped.text).toContain("Courier: Delhivery");
  });

  it("explains refunds on cancellation", () => {
    expect(orderStatusEmail({ ...order, status: "cancelled" }, links)!.text).toMatch(/refund/);
  });
});
