import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/admin/csv";
import {
  couponFormSchema,
  dealFormSchema,
  istInputToIso,
  isoToIstInput,
  paiseToRupeesInput,
  parseTags,
  productFormSchema,
  rupeesToPaiseInput,
  settingsFormSchema,
  slugify,
  toProductPayload,
  type ProductFormInput,
} from "@/lib/admin/forms";
import { compareAtPrice, effectivePrice, isOnSale, unitPrice } from "@/lib/pricing";

describe("rupees in admin forms", () => {
  it.each([
    ["1299", 129900],
    ["1,299", 129900],
    ["₹ 1,299.50", 129950],
    ["0.5", 50],
  ])("reads %s as %i paise", (input, paise) => {
    expect(rupeesToPaiseInput(input)).toBe(paise);
  });
  it.each(["", "abc", "12.345", "-5", "1.2.3"])("rejects %s", (input) => {
    expect(rupeesToPaiseInput(input)).toBeNull();
  });
  it("fills forms back in rupees", () => {
    expect(paiseToRupeesInput(129900)).toBe("1299");
    expect(paiseToRupeesInput(129950)).toBe("1299.50");
    expect(paiseToRupeesInput(null)).toBe("");
  });
});

describe("web addresses and tags", () => {
  it("makes clean web addresses from names", () => {
    expect(slugify("Diwali Hamper — Gold!")).toBe("diwali-hamper-gold");
    expect(slugify("Rose & Lily Bouquet")).toBe("rose-and-lily-bouquet");
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });
  it("tidies tags", () => {
    expect(parseTags(" Diwali, gift ,diwali,, Birthday ")).toEqual(["diwali", "gift", "birthday"]);
  });
});

const product = (overrides: Partial<ProductFormInput> = {}): ProductFormInput => ({
  id: null,
  name: "Rose Bouquet",
  slug: "rose-bouquet",
  description: "Lovely",
  categoryId: "",
  type: "product",
  price: "1299",
  salePrice: "",
  stock: "5",
  sku: "",
  tags: "rose, gift",
  isFeatured: false,
  isActive: true,
  weightG: "",
  dimensions: "",
  variants: [],
  images: [{ url: "https://example.supabase.co/storage/v1/object/public/product-images/a.webp", alt: "" }],
  ...overrides,
});

describe("product form", () => {
  it("turns the form into what the database stores", () => {
    const data = productFormSchema.parse(product({ salePrice: "999" }));
    const payload = toProductPayload(data);
    expect(payload).toMatchObject({ price: 129900, sale_price: 99900, stock: 5, tags: ["rose", "gift"] });
    expect(payload.images[0].alt).toBe("Rose Bouquet"); // empty description falls back to the name
  });

  it("needs the sale price to be lower than the price", () => {
    const r = productFormSchema.safeParse(product({ salePrice: "1299" }));
    expect(r.success).toBe(false);
  });

  it("counts stock per option when there are options", () => {
    const data = productFormSchema.parse(
      product({
        stock: "99",
        variants: [
          { id: "", name: "A4", priceDelta: "0", stock: "3", sku: "" },
          { id: "", name: "A3", priceDelta: "+200", stock: "1", sku: "" },
        ],
      }),
    );
    const payload = toProductPayload(data);
    expect(payload.stock).toBe(0);
    expect(payload.variants.map((v) => v.price_delta)).toEqual([0, 20000]);
  });

  it("rejects duplicate option names and options that make the price zero", () => {
    expect(productFormSchema.safeParse(product({ variants: [{ id: "", name: "A4", priceDelta: "0", stock: "1", sku: "" }, { id: "", name: "a4", priceDelta: "0", stock: "1", sku: "" }] })).success).toBe(false);
    expect(productFormSchema.safeParse(product({ variants: [{ id: "", name: "Mini", priceDelta: "-1299", stock: "1", sku: "" }] })).success).toBe(false);
  });

  it("keeps originals one of a kind", () => {
    expect(productFormSchema.safeParse(product({ type: "original_art", stock: "2" })).success).toBe(false);
    expect(productFormSchema.safeParse(product({ type: "original_art", stock: "1" })).success).toBe(true);
  });

  it("only accepts clean web addresses", () => {
    expect(productFormSchema.safeParse(product({ slug: "Rose Bouquet!" })).success).toBe(false);
  });
});

describe("Indian time in date pickers", () => {
  it("treats typed times as Indian time", () => {
    expect(istInputToIso("2026-11-20T09:00")).toBe("2026-11-20T03:30:00.000Z");
    expect(isoToIstInput("2026-11-20T03:30:00.000Z")).toBe("2026-11-20T09:00");
    expect(istInputToIso("")).toBeNull();
  });
});

describe("deals and coupons", () => {
  const cat = "11111111-1111-4111-8111-111111111111";
  it("builds a category deal", () => {
    const r = dealFormSchema.parse({
      id: "",
      name: "Diwali",
      type: "percentage",
      value: "20",
      target: "category",
      categoryId: cat,
      productId: "",
      startsAt: "2026-11-01T00:00",
      endsAt: "2026-11-15T23:59",
      isActive: true,
    });
    expect(r.id).toBeNull();
    expect(r.row).toMatchObject({ type: "percentage", value: 20, category_id: cat, product_id: null });
  });
  it("checks the amount and the dates", () => {
    const base = { id: "", name: "X", type: "percentage" as const, target: "category" as const, categoryId: cat, productId: "", startsAt: "2026-11-02T00:00", isActive: true };
    expect(dealFormSchema.safeParse({ ...base, value: "95", endsAt: "" }).success).toBe(false);
    expect(dealFormSchema.safeParse({ ...base, value: "20", endsAt: "2026-11-01T00:00" }).success).toBe(false);
    expect(dealFormSchema.safeParse({ ...base, value: "20", endsAt: "", target: "product" }).success).toBe(false);
  });
  it("builds a coupon with a minimum order and limit", () => {
    const r = couponFormSchema.parse({ id: "", code: "diwali15", type: "flat", value: "150", minOrder: "999", startsAt: "", endsAt: "", usageLimit: "50" });
    expect(r.row).toMatchObject({ code: "DIWALI15", type: "flat", value: 15000, min_order: 99900, usage_limit: 50 });
    expect(couponFormSchema.safeParse({ id: "", code: "BAD CODE", type: "flat", value: "1", minOrder: "", startsAt: "", endsAt: "", usageLimit: "" }).success).toBe(false);
  });
});

describe("settings", () => {
  const ok = {
    whatsappNumber: "98765 43210",
    flatShippingRate: "80",
    freeShippingThreshold: "999",
    announcementText: "Free shipping over ₹999",
    instagramUrl: "https://www.instagram.com/yours.craftswoman/",
    cancellationWindowHours: "12",
  };
  it("stores the WhatsApp number with 91 and money in paise", () => {
    expect(settingsFormSchema.parse(ok)).toMatchObject({ whatsappNumber: "919876543210", flatShippingRate: 8000, freeShippingThreshold: 99900, cancellationWindowHours: 12 });
  });
  it("rejects non-Instagram links and odd numbers", () => {
    expect(settingsFormSchema.safeParse({ ...ok, instagramUrl: "https://example.com" }).success).toBe(false);
    expect(settingsFormSchema.safeParse({ ...ok, whatsappNumber: "12345" }).success).toBe(false);
  });
});

describe("deal prices in the shop", () => {
  const p = { price: 129900, sale_price: 109900 as number | null, deal_price: null as number | null };
  it("charges the lowest of price, sale price and deal price", () => {
    expect(effectivePrice({ ...p, deal_price: 103920 })).toBe(103920);
    expect(effectivePrice({ ...p, deal_price: 119900 })).toBe(109900);
    expect(effectivePrice({ ...p, sale_price: null, deal_price: 103920 })).toBe(103920);
    expect(effectivePrice({ ...p, sale_price: null })).toBe(129900);
  });
  it("shows the full price struck through during a deal, and adds size differences", () => {
    const deal = { ...p, sale_price: null, deal_price: 103920 };
    expect(isOnSale(deal)).toBe(true);
    expect(compareAtPrice(deal, { price_delta: 20000 })).toBe(149900);
    expect(unitPrice(deal, { price_delta: 20000 })).toBe(123920);
  });
});

describe("CSV downloads", () => {
  it("quotes properly and neutralises spreadsheet formulas in typed text", () => {
    expect(csvCell('Asha "A" Rao, Chennai')).toBe('"Asha ""A"" Rao, Chennai"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(-500)).toBe("-500");
    expect(csvCell(null)).toBe("");
    expect(csvCell({ city: "Goa" })).toBe('"{""city"":""Goa""}"');
    expect(toCsv([{ a: 1, b: "x\ny" }], ["a", "b"])).toBe('a,b\r\n1,"x\ny"\r\n');
  });
});
