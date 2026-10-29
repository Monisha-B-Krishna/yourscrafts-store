/**
 * Integration tests against the LOCAL Supabase (npm run db:start).
 * They create throwaway test users and rows, and clean up after themselves.
 * Skipped automatically unless .env.local points at a local (127.0.0.1) database,
 * so they can never touch the live store.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

describe.skipIf(!reachable)("local Supabase", () => {
  const anon = createClient(url, anonKey, options);
  const admin = createClient(url, serviceKey, options);
  const userIds: string[] = [];

  /** Creates a confirmed test user with a random password and returns a client signed in as them. */
  async function signedInClient(): Promise<{ client: SupabaseClient; userId: string }> {
    const email = `test-${randomUUID()}@example.test`;
    const password = randomUUID();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userIds.push(data.user.id);
    const client = createClient(url, anonKey, options);
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
    return { client, userId: data.user.id };
  }

  afterAll(async () => {
    for (const id of userIds) await admin.auth.admin.deleteUser(id); // cascades their saved items
  });

  describe("search_products()", () => {
    const search = async (q: string) => {
      const { data, error } = await anon.rpc("search_products", { search_query: q, max_results: 5 });
      expect(error).toBeNull();
      return (data as { name: string; images: unknown[]; variants: unknown[] }[]) ?? [];
    };

    it("finds products from part of a word", async () => {
      expect((await search("chocolat")).map((p) => p.name)).toContain("Blush Rose Chocolate Bouquet");
    });

    it("returns the full product shape (images, variants)", async () => {
      const [lotus] = await search("lotus");
      expect(lotus.images).toHaveLength(3);
      expect(lotus.variants).toHaveLength(3);
    });

    it("treats odd input as plain words", async () => {
      expect(await search("")).toEqual([]);
      expect(await search("'); drop table products; --")).toBeInstanceOf(Array);
    });

    it("never shows archived products", async () => {
      const id = randomUUID();
      await admin.from("products").insert({
        id, name: "Zzyzx Test Lamp", slug: `zzyzx-${id.slice(0, 8)}`, price: 10000, stock: 1, is_active: false,
      });
      try {
        expect(await search("zzyzx")).toEqual([]);
        await admin.from("products").update({ is_active: true }).eq("id", id);
        expect((await search("zzyzx")).map((p) => p.name)).toEqual(["Zzyzx Test Lamp"]);
      } finally {
        await admin.from("products").delete().eq("id", id);
      }
    });
  });

  it("keeps a product's stock equal to the total of its variants", async () => {
    const id = randomUUID();
    await admin.from("products").insert({ id, name: "Stock Sync Test", slug: `stock-${id.slice(0, 8)}`, price: 10000, stock: 0 });
    try {
      await admin.from("product_variants").insert([
        { product_id: id, name: "Small", stock: 3 },
        { product_id: id, name: "Large", stock: 4 },
      ]);
      const stockOf = async () => (await admin.from("products").select("stock").eq("id", id).single()).data?.stock;
      expect(await stockOf()).toBe(7);
      await admin.from("product_variants").update({ stock: 10 }).eq("product_id", id).eq("name", "Large");
      expect(await stockOf()).toBe(13);
      await admin.from("product_variants").delete().eq("product_id", id).eq("name", "Small");
      expect(await stockOf()).toBe(10);
    } finally {
      await admin.from("products").delete().eq("id", id);
    }
  });

  describe("saved items (Row Level Security)", () => {
    let alice: { client: SupabaseClient; userId: string };
    let bob: { client: SupabaseClient; userId: string };

    beforeAll(async () => {
      alice = await signedInClient();
      bob = await signedInClient();
    });

    it("lets a customer save items and read them back", async () => {
      const { error } = await alice.client.from("saved_items").insert([
        { user_id: alice.userId, product_id: BOUQUET_ID },
        { user_id: alice.userId, product_id: DIYAS_ID },
      ]);
      expect(error).toBeNull();
      const saved = await listSavedProducts(alice.client, alice.userId);
      expect(saved.map((p) => p.id).sort()).toEqual([BOUQUET_ID, DIYAS_ID].sort());
      expect(saved[0].images.length).toBeGreaterThan(0);
    });

    it("hides one customer's saved items from another", async () => {
      expect(await listSavedProducts(bob.client, bob.userId)).toEqual([]);
      await bob.client.from("saved_items").delete().eq("user_id", alice.userId);
      expect(await listSavedProducts(alice.client, alice.userId)).toHaveLength(2);
    });

    it("stops a customer saving items into someone else's account", async () => {
      const { error } = await bob.client.from("saved_items").insert({ user_id: alice.userId, product_id: BOUQUET_ID });
      expect(error).not.toBeNull();
    });

    it("stops guests reading saved items", async () => {
      const { data } = await anon.from("saved_items").select("id");
      expect(data).toEqual([]);
    });
  });

  describe("locked-down write paths", () => {
    it("rejects analytics events written directly with the public key", async () => {
      const { error } = await anon
        .from("events")
        .insert({ session_id: "integration-test-1", event_name: "page_view", metadata: { path: "/" } });
      expect(error).not.toBeNull();
    });

    it("does not let the public burn order numbers", async () => {
      const { error } = await anon.rpc("next_order_number");
      expect(error).not.toBeNull();
    });

    it("does not let the public list coupon codes", async () => {
      const { data } = await anon.from("coupons").select("code");
      expect(data).toEqual([]);
    });
  });
});
