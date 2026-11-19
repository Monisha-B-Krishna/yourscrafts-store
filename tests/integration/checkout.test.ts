/**
 * Phase 4 database rules (orders, payment, stock), tested against the LOCAL
 * Supabase (npm run db:start). Skipped unless .env.local points at 127.0.0.1.
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

describe.skipIf(!reachable)("local Supabase: checkout & payments", () => {
  const admin = createClient(url, serviceKey, options);
  const cleanup: { products: string[]; users: string[]; coupons: string[] } = { products: [], users: [], coupons: [] };
  let plain: string; // a product without options, 5 in stock
  let sized: string; // a print with two sizes
  let sizeA4: string;
  let sizeA3: string;

  const address = { name: "Asha", phone: "9876543210", line1: "12 MG Road", line2: null, city: "Bengaluru", state: "Karnataka", pincode: "560001" };

  async function stock(productId: string, variantId?: string) {
    if (variantId) return (await admin.from("product_variants").select("stock").eq("id", variantId).single()).data!.stock;
    return (await admin.from("products").select("stock, sales_count").eq("id", productId).single()).data!;
  }

  /** Creates an unpaid order through the same function the checkout uses. */
  async function pendingOrder(
    items: { product_id: string; variant_id?: string; price: number; qty: number }[],
    extra: Record<string, unknown> = {},
  ) {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const discount = Number(extra.discount ?? 0);
    const { data: id, error } = await admin.rpc("create_pending_order", {
      order_row: {
        user_id: "",
        email: "asha@example.test",
        phone: "9876543210",
        shipping_address: address,
        subtotal,
        discount,
        shipping_fee: 8000,
        total: subtotal - discount + 8000,
        coupon_code: "",
        checkout_session_id: "testsession123",
        ...extra,
      },
      items: items.map((i) => ({ ...i, variant_id: i.variant_id ?? "", name: "Test item" })),
    });
    if (error) throw error;
    const rzp = `order_${randomUUID().replace(/-/g, "").slice(0, 14)}`;
    await admin.from("orders").update({ razorpay_order_id: rzp }).eq("id", id);
    return { id: id as string, rzp, total: subtotal - discount + 8000 };
  }

  const pay = (rzp: string, amount?: number) =>
    admin
      .rpc("mark_order_paid", { p_razorpay_order_id: rzp, p_razorpay_payment_id: `pay_${randomUUID().slice(0, 12)}`, p_amount: amount ?? null })
      .single<{ order_id: string; order_number: string; access_key: string; newly_paid: boolean; stock_short: boolean }>();

  beforeAll(async () => {
    const tag = randomUUID().slice(0, 8);
    const { data: p1 } = await admin
      .from("products")
      .insert({ name: `Test diya ${tag}`, slug: `test-diya-${tag}`, price: 30000, stock: 5 })
      .select("id")
      .single();
    const { data: p2 } = await admin
      .from("products")
      .insert({ name: `Test print ${tag}`, slug: `test-print-${tag}`, price: 50000, type: "print", stock: 0 })
      .select("id")
      .single();
    plain = p1!.id;
    sized = p2!.id;
    const { data: vs } = await admin
      .from("product_variants")
      .insert([
        { product_id: sized, name: "A4", price_delta: 0, stock: 3 },
        { product_id: sized, name: "A3", price_delta: 20000, stock: 1 },
      ])
      .select("id, name");
    sizeA4 = vs!.find((v) => v.name === "A4")!.id;
    sizeA3 = vs!.find((v) => v.name === "A3")!.id;
    cleanup.products.push(plain, sized);
  });

  afterAll(async () => {
    // Orders keep product_id via "on delete set null", so products can go.
    await admin.from("products").delete().in("id", cleanup.products);
    if (cleanup.coupons.length) await admin.from("coupons").delete().in("code", cleanup.coupons);
    for (const id of cleanup.users) await admin.auth.admin.deleteUser(id);
  });

  it("saves an unpaid order without a customer-facing number", async () => {
    const { id } = await pendingOrder([{ product_id: plain, price: 30000, qty: 1 }]);
    const { data } = await admin.from("orders").select("order_number, payment_status, access_key").eq("id", id).single();
    expect(data).toMatchObject({ order_number: null, payment_status: "pending" });
    expect(data!.access_key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("marks an order paid: number, stock, sales, history and analytics, all at once", async () => {
    const before = await stock(plain);
    const { id, rzp, total } = await pendingOrder([{ product_id: plain, price: 30000, qty: 2 }]);
    const { data, error } = await pay(rzp, total);
    expect(error).toBeNull();
    expect(data).toMatchObject({ order_id: id, newly_paid: true, stock_short: false });
    expect(data!.order_number).toMatch(/^YCW-\d{4}-\d{5}$/);

    const after = await stock(plain);
    expect(after).toMatchObject({ stock: (before as { stock: number }).stock - 2, sales_count: (before as { sales_count: number }).sales_count + 2 });

    const { data: history } = await admin.from("order_status_history").select("status, note").eq("order_id", id);
    expect(history).toEqual([{ status: "placed", note: "Payment received" }]);

    const { data: events } = await admin.from("events").select("event_name, session_id, metadata").eq("metadata->>order_id", id);
    expect(events).toHaveLength(1);
    expect(events![0]).toMatchObject({ event_name: "payment_success", session_id: "testsession123" });
    expect(events![0].metadata).toMatchObject({ total, items: 2, coupon_used: false });
  });

  it("only counts a payment once, however many times it is reported", async () => {
    const { rzp, total } = await pendingOrder([{ product_id: plain, price: 30000, qty: 1 }]);
    const first = await pay(rzp, total);
    const middle = await stock(plain);
    const again = await pay(rzp, total);
    const third = await pay(rzp);
    expect(first.data!.newly_paid).toBe(true);
    expect(again.data).toMatchObject({ newly_paid: false, order_number: first.data!.order_number });
    expect(third.data!.newly_paid).toBe(false);
    expect(await stock(plain)).toEqual(middle);
  });

  it("refuses a payment for the wrong amount", async () => {
    const { rzp, total } = await pendingOrder([{ product_id: plain, price: 30000, qty: 1 }]);
    const { error } = await pay(rzp, total - 100);
    expect(error?.message).toMatch(/does not match/);
    const { data } = await admin.from("orders").select("payment_status").eq("razorpay_order_id", rzp).single();
    expect(data!.payment_status).toBe("pending");
  });

  it("reduces the right size's stock, and the product total follows", async () => {
    const { rzp, total } = await pendingOrder([
      { product_id: sized, variant_id: sizeA4, price: 50000, qty: 2 },
      { product_id: sized, variant_id: sizeA3, price: 70000, qty: 1 },
    ]);
    await pay(rzp, total);
    expect(await stock(sized, sizeA4)).toBe(1);
    expect(await stock(sized, sizeA3)).toBe(0);
    expect((await stock(sized)) as { stock: number }).toMatchObject({ stock: 1 });
  });

  it("flags the order when stock ran out before payment, never going below zero", async () => {
    const { rzp, total } = await pendingOrder([{ product_id: sized, variant_id: sizeA3, price: 70000, qty: 1 }]);
    const { data } = await pay(rzp, total);
    expect(data!.stock_short).toBe(true);
    expect(await stock(sized, sizeA3)).toBe(0);
    const { data: order } = await admin.from("orders").select("notes, payment_status").eq("razorpay_order_id", rzp).single();
    expect(order).toMatchObject({ payment_status: "paid" });
    expect(order!.notes).toMatch(/refund or offer an alternative/);
  });

  it("lets a customer retry after a failed attempt, logging each failure once", async () => {
    const { id, rzp, total } = await pendingOrder([{ product_id: plain, price: 30000, qty: 1 }]);
    const failId = `pay_fail${randomUUID().slice(0, 8)}`;
    for (let i = 0; i < 2; i++) {
      await admin.rpc("record_payment_failure", { p_razorpay_order_id: rzp, p_razorpay_payment_id: failId, p_reason: "payment_failed" });
    }
    const { data: failed } = await admin.from("orders").select("payment_status").eq("id", id).single();
    expect(failed!.payment_status).toBe("failed");
    const { data: events } = await admin.from("events").select("event_name").eq("metadata->>order_id", id);
    expect(events).toEqual([{ event_name: "payment_failed" }]);

    expect((await pay(rzp, total)).data!.newly_paid).toBe(true);
    // A late failure report can't undo a successful payment.
    await admin.rpc("record_payment_failure", { p_razorpay_order_id: rzp, p_razorpay_payment_id: `pay_late${randomUUID().slice(0, 8)}`, p_reason: "x" });
    const { data: paid } = await admin.from("orders").select("payment_status").eq("id", id).single();
    expect(paid!.payment_status).toBe("paid");
  });

  it("counts a coupon use only when the order is paid", async () => {
    const code = `TEST${randomUUID().slice(0, 6).toUpperCase()}`;
    await admin.from("coupons").insert({ code, type: "flat", value: 5000, min_order: 0 });
    cleanup.coupons.push(code);
    const { rzp, total } = await pendingOrder([{ product_id: plain, price: 30000, qty: 1 }], { coupon_code: code, discount: 5000 });
    expect((await admin.from("coupons").select("used_count").eq("code", code).single()).data!.used_count).toBe(0);
    await pay(rzp, total);
    await pay(rzp, total);
    expect((await admin.from("coupons").select("used_count").eq("code", code).single()).data!.used_count).toBe(1);
  });

  describe("customers", () => {
    let asha: { client: SupabaseClient; id: string };
    let ravi: { client: SupabaseClient; id: string };

    async function customer() {
      const email = `buyer-${randomUUID()}@example.test`;
      const { data } = await admin.auth.admin.createUser({ email, password: "pass1234word", email_confirm: true });
      cleanup.users.push(data.user!.id);
      const client = createClient(url, anonKey, options);
      await client.auth.signInWithPassword({ email, password: "pass1234word" });
      return { client, id: data.user!.id };
    }

    beforeAll(async () => {
      asha = await customer();
      ravi = await customer();
    });

    it("can't create orders or mark them paid themselves", async () => {
      const create = await asha.client.rpc("create_pending_order", { order_row: {}, items: [] });
      expect(create.error).not.toBeNull();
      const paid = await asha.client.rpc("mark_order_paid", { p_razorpay_order_id: "order_x", p_razorpay_payment_id: "pay_x" });
      expect(paid.error).not.toBeNull();
      const guest = createClient(url, anonKey, options);
      expect((await guest.rpc("mark_order_paid", { p_razorpay_order_id: "order_x", p_razorpay_payment_id: "pay_x" })).error).not.toBeNull();
      const insert = await asha.client.from("orders").insert({ email: "x@y.z", phone: "9876543210", shipping_address: {}, subtotal: 0, total: 0 });
      expect(insert.error).not.toBeNull();
    });

    it("see only their own orders, and bought items leave their saved cart", async () => {
      await asha.client.rpc("sync_cart", {
        items: [
          { productId: plain, variantId: null, qty: 1 },
          { productId: sized, variantId: sizeA4, qty: 1 },
        ],
        mode: "merge",
      });
      const { id, rzp, total } = await pendingOrder([{ product_id: plain, price: 30000, qty: 1 }], { user_id: asha.id });
      await pay(rzp, total);

      const mine = await asha.client.from("orders").select("id, payment_status").eq("id", id);
      expect(mine.data).toEqual([{ id, payment_status: "paid" }]);
      expect((await ravi.client.from("orders").select("id").eq("id", id)).data).toEqual([]);

      const { data: cart } = await asha.client.rpc("sync_cart", { items: [], mode: "merge" });
      expect(cart).toEqual([{ productId: sized, variantId: sizeA4, qty: 1 }]);
    });
  });
});

describe.skipIf(!reachable)("local Supabase: order emails & tracking", () => {
  const admin = createClient(url, serviceKey, options);

  async function paidOrder() {
    const { data: id } = await admin.rpc("create_pending_order", {
      order_row: {
        user_id: "",
        email: "track@example.test",
        phone: "9876543210",
        shipping_address: { name: "A", phone: "9876543210", line1: "x", line2: null, city: "y", state: "Goa", pincode: "403001" },
        subtotal: 10000,
        discount: 0,
        shipping_fee: 8000,
        total: 18000,
        coupon_code: "",
        checkout_session_id: "",
      },
      items: [{ product_id: "20000000-0000-4000-8000-000000000011", variant_id: "", name: "Diyas", price: 10000, qty: 1 }],
    });
    const rzp = `order_${randomUUID().replace(/-/g, "").slice(0, 14)}`;
    await admin.from("orders").update({ razorpay_order_id: rzp }).eq("id", id);
    return { id: id as string, rzp };
  }

  it("lets exactly one caller claim the receipt email, and only once paid", async () => {
    const { id, rzp } = await paidOrder();
    expect((await admin.rpc("claim_confirmation_email", { p_order_id: id })).data).toBe(false); // not paid yet
    await admin.rpc("mark_order_paid", { p_razorpay_order_id: rzp, p_razorpay_payment_id: `pay_claim${randomUUID().slice(0, 8)}` });
    const claims = await Promise.all([1, 2, 3].map(() => admin.rpc("claim_confirmation_email", { p_order_id: id })));
    expect(claims.map((c) => c.data).filter(Boolean)).toHaveLength(1);
    await admin.rpc("release_confirmation_email", { p_order_id: id });
    expect((await admin.rpc("claim_confirmation_email", { p_order_id: id })).data).toBe(true);
  });

  it("keeps email claiming server-only", async () => {
    const guest = createClient(url, anonKey, options);
    const { id } = await paidOrder();
    expect((await guest.rpc("claim_confirmation_email", { p_order_id: id })).error).not.toBeNull();
    expect((await guest.rpc("release_confirmation_email", { p_order_id: id })).error).not.toBeNull();
  });

  it("never shows order details to a guest reading the table directly", async () => {
    const guest = createClient(url, anonKey, options);
    const { data } = await guest.from("orders").select("id").limit(5);
    expect(data ?? []).toEqual([]);
    expect(((await guest.from("order_status_history").select("id").limit(5)).data ?? [])).toEqual([]);
  });
});
