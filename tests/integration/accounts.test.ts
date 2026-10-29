/**
 * Phase 3 database rules, tested against the LOCAL Supabase (npm run db:start).
 * Skipped automatically unless .env.local points at a local (127.0.0.1) database.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listAddresses } from "@/lib/addresses";
import { listSavedProducts } from "@/lib/saved";

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
const BOUQUET_ID = "20000000-0000-4000-8000-000000000001";
const DIYAS_ID = "20000000-0000-4000-8000-000000000011";
const LOTUS_PRINT_ID = "20000000-0000-4000-8000-000000000026";
const LOTUS_A4_ID = "40000000-0000-4000-8000-000000000007";

const address = (overrides: Record<string, unknown> = {}) => ({
  name: "Asha Rao",
  phone: "9876543210",
  line1: "12, 3rd Cross",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560003",
  ...overrides,
});

describe.skipIf(!reachable)("local Supabase: accounts", () => {
  const admin = createClient(url, serviceKey, options);
  const userIds: string[] = [];

  async function signedInClient(metadata: Record<string, unknown> = {}) {
    const email = `test-${randomUUID()}@example.test`;
    const password = randomUUID();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    userIds.push(data.user.id);
    const client = createClient(url, anonKey, options);
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
    return { client, userId: data.user.id };
  }

  afterAll(async () => {
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  });

  describe("profiles", () => {
    it("creates a profile from the sign-up details, tidying the phone number", async () => {
      const { client, userId } = await signedInClient({ full_name: "  Asha Rao ", phone: "+91 98765 43210" });
      const { data } = await client.from("profiles").select("full_name, phone, role").eq("user_id", userId).single();
      expect(data).toEqual({ full_name: "Asha Rao", phone: "9876543210", role: "customer" });
    });

    it("never lets junk sign-up details block a sign-up", async () => {
      const { client, userId } = await signedInClient({ full_name: "x".repeat(500), phone: "not a phone" });
      const { data } = await client.from("profiles").select("full_name, phone").eq("user_id", userId).single();
      expect(data?.full_name).toHaveLength(100);
      expect(data?.phone).toBeNull();
    });

    it("rejects an invalid phone number on update", async () => {
      const { client, userId } = await signedInClient();
      const bad = await client.from("profiles").update({ phone: "12345" }).eq("user_id", userId);
      expect(bad.error).not.toBeNull();
      const good = await client.from("profiles").update({ phone: "6123456789" }).eq("user_id", userId);
      expect(good.error).toBeNull();
    });

    it("stops a customer from making themselves admin", async () => {
      const { client, userId } = await signedInClient();
      const { error } = await client.from("profiles").update({ role: "admin" }).eq("user_id", userId);
      expect(error).not.toBeNull();
      const { data: isAdmin } = await client.rpc("is_admin");
      expect(isAdmin).toBe(false);
    });

    it("recognises the owner once the server grants the role", async () => {
      const { client, userId } = await signedInClient();
      await admin.from("profiles").update({ role: "admin" }).eq("user_id", userId);
      const { data: isAdmin } = await client.rpc("is_admin");
      expect(isAdmin).toBe(true);
    });
  });

  describe("addresses", () => {
    let asha: { client: SupabaseClient; userId: string };
    let ravi: { client: SupabaseClient; userId: string };

    beforeAll(async () => {
      asha = await signedInClient();
      ravi = await signedInClient();
    });

    const list = async (c: SupabaseClient) =>
      (await c.from("addresses").select("id, name, is_default").order("created_at")).data ?? [];

    it("makes the first address the default", async () => {
      await asha.client.from("addresses").insert({ ...address({ name: "Home" }), user_id: asha.userId });
      expect(await list(asha.client)).toMatchObject([{ name: "Home", is_default: true }]);
    });

    it("keeps exactly one default when a new default is chosen", async () => {
      await asha.client
        .from("addresses")
        .insert({ ...address({ name: "Office" }), user_id: asha.userId, is_default: true });
      expect(await list(asha.client)).toMatchObject([
        { name: "Home", is_default: false },
        { name: "Office", is_default: true },
      ]);
      const home = (await list(asha.client))[0];
      await asha.client.from("addresses").update({ is_default: true }).eq("id", home.id);
      expect((await list(asha.client)).filter((a) => a.is_default).map((a) => a.name)).toEqual(["Home"]);
    });

    it("picks a new default when the default is deleted", async () => {
      const home = (await list(asha.client)).find((a) => a.name === "Home")!;
      await asha.client.from("addresses").delete().eq("id", home.id);
      expect(await list(asha.client)).toMatchObject([{ name: "Office", is_default: true }]);
    });

    it("rejects a bad PIN code or phone", async () => {
      const pin = await asha.client.from("addresses").insert({ ...address({ pincode: "012345" }), user_id: asha.userId });
      expect(pin.error).not.toBeNull();
      const phone = await asha.client.from("addresses").insert({ ...address({ phone: "123" }), user_id: asha.userId });
      expect(phone.error).not.toBeNull();
    });

    it("keeps each customer's addresses private", async () => {
      expect(await list(ravi.client)).toEqual([]);
      const sneaky = await ravi.client.from("addresses").insert({ ...address(), user_id: asha.userId });
      expect(sneaky.error).not.toBeNull();
      const office = (await list(asha.client))[0];
      const { data } = await ravi.client.from("addresses").update({ name: "Hacked" }).eq("id", office.id).select();
      expect(data).toEqual([]);
    });

    it("shows the owner only her own addresses and saved items on her account pages", async () => {
      const owner = await signedInClient();
      await admin.from("profiles").update({ role: "admin" }).eq("user_id", owner.userId);
      await owner.client.from("addresses").insert({ ...address({ name: "Owner studio" }), user_id: owner.userId });
      await asha.client.from("saved_items").insert({ user_id: asha.userId, product_id: BOUQUET_ID });
      // As admin she CAN read everyone's rows (needed for the admin panel)…
      expect(((await owner.client.from("addresses").select("id")).data ?? []).length).toBeGreaterThan(1);
      // …but her account pages ask only for her own.
      expect((await listAddresses(owner.client, owner.userId)).map((a) => a.name)).toEqual(["Owner studio"]);
      expect(await listSavedProducts(owner.client, owner.userId)).toEqual([]);
    });

    it("limits a customer to 20 addresses", async () => {
      const { client, userId } = await signedInClient();
      const rows = Array.from({ length: 20 }, (_, i) => ({ ...address({ name: `Place ${i}` }), user_id: userId }));
      expect((await client.from("addresses").insert(rows)).error).toBeNull();
      const extra = await client.from("addresses").insert({ ...address(), user_id: userId });
      expect(extra.error?.message).toMatch(/up to 20/);
    });
  });

  describe("database cart (sync_cart)", () => {
    const line = (productId: string, qty: number, variantId: string | null = null) => ({ productId, variantId, qty });

    it("merges a guest cart into the saved cart, adding quantities", async () => {
      const { client } = await signedInClient();
      const first = await client.rpc("sync_cart", { items: [line(BOUQUET_ID, 1), line(LOTUS_PRINT_ID, 1, LOTUS_A4_ID)], mode: "merge" });
      expect(first.error).toBeNull();
      const second = await client.rpc("sync_cart", { items: [line(BOUQUET_ID, 2), line(DIYAS_ID, 1)], mode: "merge" });
      expect(second.data).toEqual([line(BOUQUET_ID, 3), line(LOTUS_PRINT_ID, 1, LOTUS_A4_ID), line(DIYAS_ID, 1)]);
    });

    it("replaces the saved cart exactly", async () => {
      const { client } = await signedInClient();
      await client.rpc("sync_cart", { items: [line(BOUQUET_ID, 2), line(DIYAS_ID, 1)], mode: "merge" });
      const { data } = await client.rpc("sync_cart", { items: [line(DIYAS_ID, 4)], mode: "replace" });
      expect(data).toEqual([line(DIYAS_ID, 4)]);
      const empty = await client.rpc("sync_cart", { items: [], mode: "replace" });
      expect(empty.data).toEqual([]);
    });

    it("loads the saved cart without changing it", async () => {
      const { client } = await signedInClient();
      await client.rpc("sync_cart", { items: [line(BOUQUET_ID, 2)], mode: "merge" });
      const { data } = await client.rpc("sync_cart", { items: [], mode: "merge" });
      expect(data).toEqual([line(BOUQUET_ID, 2)]);
    });

    it("skips unknown products, wrong options and junk", async () => {
      const { client } = await signedInClient();
      const { data, error } = await client.rpc("sync_cart", {
        items: [
          line(randomUUID(), 1),
          line(BOUQUET_ID, 1, LOTUS_A4_ID), // option from a different product
          { productId: "not-a-uuid", variantId: null, qty: 1 },
          { productId: DIYAS_ID, variantId: null, qty: "lots" },
          "nonsense",
          line(DIYAS_ID, 500),
        ],
        mode: "merge",
      });
      expect(error).toBeNull();
      expect(data).toEqual([line(DIYAS_ID, 99)]);
    });

    it("is only for signed-in customers, and only ever touches their own cart", async () => {
      const guest = createClient(url, anonKey, options);
      expect((await guest.rpc("sync_cart", { items: [line(BOUQUET_ID, 1)], mode: "merge" })).error).not.toBeNull();

      const a = await signedInClient();
      const b = await signedInClient();
      await a.client.rpc("sync_cart", { items: [line(BOUQUET_ID, 5)], mode: "merge" });
      const bCart = await b.client.rpc("sync_cart", { items: [], mode: "merge" });
      expect(bCart.data).toEqual([]);
      const aCart = await a.client.rpc("sync_cart", { items: [], mode: "merge" });
      expect(aCart.data).toEqual([line(BOUQUET_ID, 5)]);
    });
  });
});
