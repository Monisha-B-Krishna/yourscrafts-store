/**
 * Phase 6 admin functions against the LOCAL Supabase (npm run db:start).
 * Skipped unless .env.local points at 127.0.0.1.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url);
const reachable =
  isLocal && anonKey && serviceKey
    ? await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey } })
        .then((r) => r.ok)
        .catch(() => false)
    : false;
const options = { auth: { persistSession: false, autoRefreshToken: false } };

describe.skipIf(!reachable)("local Supabase: admin panel", () => {
  const service = createClient(url, serviceKey, options);
  const users: string[] = [];
  const products: string[] = [];
  let owner: SupabaseClient;
  let customer: SupabaseClient;
  let categoryId: string;

  async function signIn(role: "admin" | "customer") {
    const email = `${role}-${randomUUID()}@example.test`;
    const { data } = await service.auth.admin.createUser({ email, password: "pass1234word", email_confirm: true, user_metadata: { full_name: `Test ${role}` } });
    users.push(data.user!.id);
    if (role === "admin") await service.from("profiles").update({ role: "admin" }).eq("user_id", data.user!.id);
    const client = createClient(url, anonKey, options);
    await client.auth.signInWithPassword({ email, password: "pass1234word" });
    return client;
  }

  const productPayload = (overrides: Record<string, unknown> = {}) => ({
    id: "",
    name: "Test Lantern",
    slug: `test-lantern-${randomUUID().slice(0, 8)}`,
    description: "Hand-painted",
    category_id: categoryId,
    type: "product",
    price: 50000,
    sale_price: "",
    stock: 4,
    sku: "",
    tags: ["diwali", "light"],
    is_featured: false,
    is_active: true,
    weight_g: 300,
    dimensions: "10 cm",
    variants: [],
    images: [
      { url: "https://x.test/a.webp", alt: "Front" },
      { url: "https://x.test/b.webp", alt: "Side" },
    ],
    ...overrides,
  });

  beforeAll(async () => {
    owner = await signIn("admin");
    customer = await signIn("customer");
    categoryId = (await service.from("categories").select("id").limit(1).single()).data!.id;
  });

  afterAll(async () => {
    await service.from("deals").delete().like("name", "Test %");
    if (products.length) await service.from("products").delete().in("id", products);
    await service.from("collections").delete().like("slug", "test-edition-%");
    for (const id of users) await service.auth.admin.deleteUser(id);
  });

  it("keeps every admin function owner-only", async () => {
    const guest = createClient(url, anonKey, options);
    for (const client of [customer, guest]) {
      expect((await client.rpc("admin_dashboard")).error).not.toBeNull();
      expect((await client.rpc("admin_customers", {})).error).not.toBeNull();
      expect((await client.rpc("admin_save_product", { p: productPayload() })).error).not.toBeNull();
      expect((await client.rpc("admin_duplicate_product", { p_id: randomUUID() })).error).not.toBeNull();
      expect((await client.rpc("admin_set_order_status", { p_order_id: randomUUID(), p_status: "shipped" })).error).not.toBeNull();
      expect((await client.rpc("admin_save_collection", { c: { name: "x", slug: "x" } })).error).not.toBeNull();
    }
    const write = await customer.from("store_settings").upsert({ key: "flat_shipping_rate", value: 0 }, { onConflict: "key" });
    expect(write.error).not.toBeNull();
  });

  it("saves a product with photos in order, and edits options without losing them", async () => {
    const { data: id, error } = await owner.rpc("admin_save_product", { p: productPayload() });
    expect(error).toBeNull();
    products.push(id);
    const { data: images } = await owner.from("product_images").select("url, sort_order").eq("product_id", id).order("sort_order");
    expect(images!.map((i) => i.url)).toEqual(["https://x.test/a.webp", "https://x.test/b.webp"]);

    // Add two sizes, then rename one and drop the other.
    await owner.rpc("admin_save_product", {
      p: productPayload({ id, slug: (await owner.from("products").select("slug").eq("id", id).single()).data!.slug, variants: [
        { id: "", name: "Small", price_delta: 0, stock: 2, sku: "" },
        { id: "", name: "Large", price_delta: 20000, stock: 1, sku: "" },
      ], images: [{ url: "https://x.test/b.webp", alt: "Side" }] }),
    });
    const { data: v1 } = await owner.from("product_variants").select("id, name").eq("product_id", id).order("price_delta");
    expect(v1!.map((v) => v.name)).toEqual(["Small", "Large"]);
    const small = v1![0];
    const slug = (await owner.from("products").select("slug").eq("id", id).single()).data!.slug;
    await owner.rpc("admin_save_product", {
      p: productPayload({ id, slug, variants: [{ id: small.id, name: "Petite", price_delta: 0, stock: 5, sku: "" }] }),
    });
    const { data: v2 } = await owner.from("product_variants").select("id, name, stock").eq("product_id", id);
    expect(v2).toEqual([{ id: small.id, name: "Petite", stock: 5 }]);
    expect((await owner.from("products").select("stock").eq("id", id).single()).data!.stock).toBe(5);
  });

  it("refuses a web address that's already taken", async () => {
    const taken = (await service.from("products").select("slug").limit(1).single()).data!.slug;
    const { error } = await owner.rpc("admin_save_product", { p: productPayload({ slug: taken }) });
    expect(error?.code).toBe("23505");
  });

  it("duplicates a product as a hidden copy with its photos and options", async () => {
    const source = products[0];
    const { data: copy } = await owner.rpc("admin_duplicate_product", { p_id: source });
    products.push(copy);
    const { data } = await owner.from("products").select("name, slug, is_active, images:product_images (url), variants:product_variants (name)").eq("id", copy).single();
    expect(data!.name).toBe("Test Lantern (copy)");
    expect(data!.slug).toMatch(/-copy$/);
    expect(data!.is_active).toBe(false);
    expect(data!.variants).toHaveLength(1);
    expect(data!.images.length).toBeGreaterThan(0);
  });

  it("applies the best live deal to prices (and ignores paused or future ones)", async () => {
    const { data: id } = await owner.rpc("admin_save_product", { p: productPayload({ price: 100000, category_id: categoryId }) });
    products.push(id);
    const price = async () => (await createClient(url, anonKey, options).from("products").select("deal_price").eq("id", id).single()).data!.deal_price;
    expect(await price()).toBeNull();
    const now = new Date(Date.now() - 1000).toISOString();
    const deal = (name: string, type: string, value: number, target: Record<string, string | null>, extra: Record<string, unknown> = {}) => ({
      name, type, value, product_id: null, category_id: null, starts_at: now, is_active: true, ...target, ...extra,
    });
    const { error } = await owner.from("deals").insert([
      deal("Test category 10%", "percentage", 10, { category_id: categoryId }),
      deal("Test product ₹250 off", "flat", 25000, { product_id: id }),
      deal("Test paused 50%", "percentage", 50, { product_id: id }, { is_active: false }),
      deal("Test future 60%", "percentage", 60, { product_id: id }, { starts_at: new Date(Date.now() + 864e5).toISOString() }),
    ]);
    expect(error).toBeNull();
    expect(await price()).toBe(75000);
  });

  it("moves an order through statuses, recording who and when, and can restock on cancel", async () => {
    const pid = products[0];
    const { data: orderId } = await service.rpc("create_pending_order", {
      order_row: { user_id: "", email: "buyer@example.test", phone: "9876543210", shipping_address: { name: "B" }, subtotal: 50000, discount: 0, shipping_fee: 8000, total: 58000, coupon_code: "", checkout_session_id: "" },
      items: [{ product_id: pid, variant_id: (await service.from("product_variants").select("id").eq("product_id", pid).single()).data!.id, name: "Lantern", price: 50000, qty: 2 }],
    });
    const rzp = `order_${randomUUID().replace(/-/g, "").slice(0, 14)}`;
    await service.from("orders").update({ razorpay_order_id: rzp }).eq("id", orderId);
    await service.rpc("mark_order_paid", { p_razorpay_order_id: rzp, p_razorpay_payment_id: `pay_adm${randomUUID().slice(0, 8)}` });
    const stockAfterSale = (await service.from("products").select("stock").eq("id", pid).single()).data!.stock;

    expect((await owner.rpc("admin_set_order_status", { p_order_id: orderId, p_status: "packed", p_note: "Wrapped in red" })).error).toBeNull();
    expect((await owner.rpc("admin_set_order_status", { p_order_id: orderId, p_status: "cancelled", p_restock: true })).error).toBeNull();
    // Setting the same status again changes nothing.
    await owner.rpc("admin_set_order_status", { p_order_id: orderId, p_status: "cancelled", p_restock: true });

    const { data: history } = await owner.from("order_status_history").select("status, note, changed_by").eq("order_id", orderId).order("created_at");
    expect(history!.map((h) => h.status)).toEqual(["placed", "packed", "cancelled"]);
    expect(history![1].note).toBe("Wrapped in red");
    expect(history![1].changed_by).not.toBeNull();
    expect((await service.from("products").select("stock").eq("id", pid).single()).data!.stock).toBe(stockAfterSale + 2);
  });

  it("gives the dashboard and customer list real numbers", async () => {
    const { data: dash, error } = await owner.rpc("admin_dashboard");
    expect(error).toBeNull();
    expect(dash).toHaveProperty("today.revenue");
    expect(dash.daily).toHaveLength(14);
    const { data: people } = await owner.rpc("admin_customers", { p_search: "buyer@example.test" });
    expect(people![0]).toMatchObject({ email: "buyer@example.test", registered: false });
  });

  it("saves an edition with its pieces, which the shop can then read", async () => {
    const slug = `test-edition-${randomUUID().slice(0, 6)}`;
    const { data: cid, error } = await owner.rpc("admin_save_collection", {
      c: { id: "", name: "Test Edition", slug, description: "", is_active: true, product_ids: [products[0], products[2]] },
    });
    expect(error).toBeNull();
    const guest = createClient(url, anonKey, options);
    const { data } = await guest.from("collections").select("items:collection_products (product_id)").eq("id", cid).single();
    expect(data!.items).toHaveLength(2);
    await owner.rpc("admin_save_collection", { c: { id: cid, name: "Test Edition", slug, is_active: false, product_ids: [products[0]] } });
    expect((await guest.from("collections").select("id").eq("id", cid)).data).toEqual([]); // hidden from the shop
  });
});
