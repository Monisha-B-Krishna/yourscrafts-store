import { z } from "zod";

/**
 * Validation for the admin forms. The owner types rupees ("1,299" or
 * "1299.50"); the database stores paise (129900). Shared by the browser
 * forms and the server actions.
 */

/** "1,299.50" → 129950; returns null when it isn't a sensible amount. */
export function rupeesToPaiseInput(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** 129950 → "1299.50", 129900 → "1299" (for filling in forms). */
export function paiseToRupeesInput(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "";
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

export const rupees = (label: string) =>
  z.string().transform((v, ctx) => {
    const paise = rupeesToPaiseInput(v);
    if (paise === null) {
      ctx.addIssue({ code: "custom", message: `Enter ${label} in rupees, like 1299` });
      return z.NEVER;
    }
    return paise;
  });

const optionalRupees = (label: string) =>
  z.string().transform((v, ctx) => {
    if (v.trim() === "") return null;
    const paise = rupeesToPaiseInput(v);
    if (paise === null) {
      ctx.addIssue({ code: "custom", message: `Enter ${label} in rupees, like 999` });
      return z.NEVER;
    }
    return paise;
  });

/** Signed rupees for a size's price difference ("+200", "-100", "0"). */
const signedRupees = z.string().transform((v, ctx) => {
  const t = v.trim().replace(/^\+/, "");
  if (t === "") return 0;
  const negative = t.startsWith("-");
  const paise = rupeesToPaiseInput(negative ? t.slice(1) : t);
  if (paise === null) {
    ctx.addIssue({ code: "custom", message: "Use rupees, like 200 or -100" });
    return z.NEVER;
  }
  return negative ? -paise : paise;
});

const wholeNumber = (label: string, max = 100000) =>
  z.string().transform((v, ctx) => {
    const t = v.trim();
    if (!/^\d{1,6}$/.test(t) || Number(t) > max) {
      ctx.addIssue({ code: "custom", message: `${label} must be a whole number` });
      return z.NEVER;
    }
    return Number(t);
  });

const optionalWhole = (label: string) =>
  z.string().transform((v, ctx) => {
    const t = v.trim();
    if (t === "") return null;
    if (!/^\d{1,7}$/.test(t)) {
      ctx.addIssue({ code: "custom", message: `${label} must be a whole number` });
      return z.NEVER;
    }
    return Number(t);
  });

/** "Diwali Hamper — Gold!" → "diwali-hamper-gold" */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes, like diwali-hamper")
  .max(110);

export const PRODUCT_TYPES = ["product", "original_art", "print"] as const;

export const productFormSchema = z
  .object({
    id: z.uuid().nullable(),
    name: z.string().trim().min(2, "Please give it a name").max(120),
    slug: slugSchema,
    description: z.string().trim().max(5000, "Please keep the description under 5,000 characters"),
    categoryId: z.union([z.uuid(), z.literal("")]),
    type: z.enum(PRODUCT_TYPES),
    price: rupees("the price"),
    salePrice: optionalRupees("the sale price"),
    stock: wholeNumber("Stock"),
    sku: z.string().trim().max(60).regex(/^[A-Za-z0-9._-]*$/, "Letters, numbers, dots and dashes only"),
    tags: z.string().max(500),
    isFeatured: z.boolean(),
    isActive: z.boolean(),
    weightG: optionalWhole("Weight"),
    dimensions: z.string().trim().max(120),
    variants: z
      .array(
        z.object({
          id: z.string(),
          name: z.string().trim().min(1, "Name this option, e.g. A4").max(60),
          priceDelta: signedRupees,
          stock: wholeNumber("Stock"),
          sku: z.string().trim().max(60).regex(/^[A-Za-z0-9._-]*$/, "Letters, numbers, dots and dashes only"),
        }),
      )
      .max(20, "Up to 20 options"),
    images: z
      .array(z.object({ url: z.string().url().max(1000), alt: z.string().trim().max(200) }))
      .max(12, "Up to 12 photos"),
  })
  .superRefine((v, ctx) => {
    if (v.price <= 0) ctx.addIssue({ code: "custom", path: ["price"], message: "Price must be more than ₹0" });
    if (v.salePrice !== null && v.salePrice >= v.price) {
      ctx.addIssue({ code: "custom", path: ["salePrice"], message: "The sale price must be lower than the price" });
    }
    const names = v.variants.map((x) => x.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Each option needs a different name" });
    }
    v.variants.forEach((x, i) => {
      if (v.price + x.priceDelta <= 0) {
        ctx.addIssue({ code: "custom", path: ["variants", i, "priceDelta"], message: "That makes the price ₹0 or less" });
      }
    });
    if (v.type === "original_art" && v.variants.length === 0 && v.stock > 1) {
      ctx.addIssue({ code: "custom", path: ["stock"], message: "An original is one of a kind: stock should be 0 or 1" });
    }
  });

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormData = z.output<typeof productFormSchema>;

/** Tags typed as "gift, diwali,  Birthday " → ["gift", "diwali", "birthday"]. */
export function parseTags(raw: string): string[] {
  return [...new Set(raw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20).map((t) => t.slice(0, 40));
}

/** What the database function admin_save_product expects. */
export function toProductPayload(d: ProductFormData) {
  return {
    id: d.id ?? "",
    name: d.name,
    slug: d.slug,
    description: d.description,
    category_id: d.categoryId,
    type: d.type,
    price: d.price,
    sale_price: d.salePrice ?? "",
    stock: d.variants.length ? 0 : d.stock,
    sku: d.sku,
    tags: parseTags(d.tags),
    is_featured: d.isFeatured,
    is_active: d.isActive,
    weight_g: d.weightG ?? "",
    dimensions: d.dimensions,
    variants: d.variants.map((v) => ({ id: v.id, name: v.name, price_delta: v.priceDelta, stock: v.stock, sku: v.sku })),
    images: d.images.map((img) => ({ url: img.url, alt: img.alt || d.name })),
  };
}

// ---------------------------------------------------------------------------
// Dates: the admin types Indian time; the database stores exact moments.
// ---------------------------------------------------------------------------

/** "2026-11-20T09:00" (typed in India) → ISO timestamp; "" → null. */
export function istInputToIso(value: string): string | null {
  if (!value) return null;
  const withSeconds = /T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  const d = new Date(`${withSeconds}+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO timestamp → "2026-11-20T09:00" in Indian time, for a datetime-local input. */
export function isoToIstInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

const istDateTime = (label: string, optional: boolean) =>
  z.string().transform((v, ctx) => {
    if (!v) {
      if (!optional) ctx.addIssue({ code: "custom", message: `Please choose ${label}` });
      return optional ? null : z.NEVER;
    }
    const iso = istInputToIso(v);
    if (!iso) {
      ctx.addIssue({ code: "custom", message: `Please choose ${label}` });
      return z.NEVER;
    }
    return iso;
  });

/** Percentage (1–90) or rupees, depending on the discount type. */
const discountValue = z.object({ type: z.enum(["percentage", "flat"]), value: z.string() }).transform((v, ctx) => {
  if (v.type === "percentage") {
    const n = Number(v.value.replace("%", "").trim());
    if (!Number.isInteger(n) || n < 1 || n > 90) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "A whole percentage from 1 to 90" });
      return z.NEVER;
    }
    return { type: v.type, value: n };
  }
  const paise = rupeesToPaiseInput(v.value);
  if (!paise) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "Amount off in rupees, like 100" });
    return z.NEVER;
  }
  return { type: v.type, value: paise };
});

export const dealFormSchema = z
  .object({
    id: z.string(),
    name: z.string().trim().min(2, "Give the deal a name").max(80),
    type: z.enum(["percentage", "flat"]),
    value: z.string(),
    target: z.enum(["category", "product"]),
    categoryId: z.string(),
    productId: z.string(),
    startsAt: istDateTime("a start", false),
    endsAt: istDateTime("an end", true),
    isActive: z.boolean(),
  })
  .transform((v, ctx) => {
    const discount = discountValue.safeParse({ type: v.type, value: v.value });
    if (!discount.success) {
      ctx.addIssue({ code: "custom", path: ["value"], message: discount.error.issues[0].message });
      return z.NEVER;
    }
    const uuid = z.uuid();
    const targetId = v.target === "category" ? v.categoryId : v.productId;
    if (!uuid.safeParse(targetId).success) {
      ctx.addIssue({ code: "custom", path: [v.target === "category" ? "categoryId" : "productId"], message: `Choose a ${v.target}` });
      return z.NEVER;
    }
    if (v.endsAt && v.startsAt && v.endsAt <= v.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start" });
      return z.NEVER;
    }
    return {
      id: uuid.safeParse(v.id).success ? v.id : null,
      row: {
        name: v.name,
        type: discount.data.type,
        value: discount.data.value,
        product_id: v.target === "product" ? targetId : null,
        category_id: v.target === "category" ? targetId : null,
        starts_at: v.startsAt,
        ends_at: v.endsAt,
        is_active: v.isActive,
      },
    };
  });
export type DealFormInput = z.input<typeof dealFormSchema>;

export const couponFormSchema = z
  .object({
    id: z.string(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,32}$/, "3–32 letters, numbers, - or _ (no spaces)"),
    type: z.enum(["percentage", "flat"]),
    value: z.string(),
    minOrder: z.string(),
    startsAt: istDateTime("a start", true),
    endsAt: istDateTime("an end", true),
    usageLimit: z.string(),
  })
  .transform((v, ctx) => {
    const discount = discountValue.safeParse({ type: v.type, value: v.value });
    if (!discount.success) {
      ctx.addIssue({ code: "custom", path: ["value"], message: discount.error.issues[0].message });
      return z.NEVER;
    }
    const minOrder = v.minOrder.trim() === "" ? 0 : rupeesToPaiseInput(v.minOrder);
    if (minOrder === null) {
      ctx.addIssue({ code: "custom", path: ["minOrder"], message: "Rupees, like 499, or leave empty" });
      return z.NEVER;
    }
    const limit = v.usageLimit.trim() === "" ? null : Number(v.usageLimit);
    if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 1_000_000)) {
      ctx.addIssue({ code: "custom", path: ["usageLimit"], message: "A whole number, or leave empty for no limit" });
      return z.NEVER;
    }
    if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start" });
      return z.NEVER;
    }
    return {
      id: z.uuid().safeParse(v.id).success ? v.id : null,
      row: {
        code: v.code,
        type: discount.data.type,
        value: discount.data.value,
        min_order: minOrder,
        starts_at: v.startsAt,
        ends_at: v.endsAt,
        usage_limit: limit,
      },
    };
  });
export type CouponFormInput = z.input<typeof couponFormSchema>;

export const editionFormSchema = z
  .object({
    id: z.string(),
    name: z.string().trim().min(2, "Give the edition a name").max(80),
    slug: slugSchema,
    description: z.string().trim().max(1000),
    bannerImage: z.string().max(1000),
    startsAt: istDateTime("a start", true),
    endsAt: istDateTime("an end", true),
    isActive: z.boolean(),
    productIds: z.array(z.uuid()).max(200),
  })
  .superRefine((v, ctx) => {
    if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start" });
    }
  });
export type EditionFormInput = z.input<typeof editionFormSchema>;

export const settingsFormSchema = z.object({
  whatsappNumber: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .transform((v) => (v.length === 10 ? `91${v}` : v))
    .pipe(z.string().regex(/^91[6-9]\d{9}$/, "An Indian mobile number, like 98765 43210")),
  flatShippingRate: rupees("the shipping charge"),
  freeShippingThreshold: rupees("the free-shipping amount"),
  announcementText: z.string().trim().max(160, "Keep it under 160 characters so it fits on phones"),
  instagramUrl: z
    .string()
    .trim()
    .url("Paste the full link, like https://www.instagram.com/yours.craftswoman/")
    .refine((u) => /^https:\/\/(www\.)?instagram\.com\//.test(u), "It should be an instagram.com link"),
  cancellationWindowHours: z
    .string()
    .transform((v) => Number(v))
    .pipe(z.number().int("Whole hours").min(0).max(168, "Up to 168 hours (a week)")),
});
export type SettingsFormInput = z.input<typeof settingsFormSchema>;
