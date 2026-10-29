import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliseProduct, PRODUCT_COLUMNS } from "@/lib/catalog";
import type { Product } from "@/lib/types";

/**
 * "Save for later" data access. Every function takes a Supabase client acting
 * as the signed-in customer, so Row Level Security limits it to their own rows.
 */

export async function listSavedProducts(client: SupabaseClient, userId: string): Promise<Product[]> {
  // Filter on the customer explicitly: the owner (admin) can read everyone's rows.
  const { data, error } = await client
    .from("saved_items")
    .select(`created_at, product:products (${PRODUCT_COLUMNS})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load saved items: ${error.message}`);
  // Archived products come back as null (hidden by RLS) and are skipped.
  return (data ?? []).flatMap((row) => {
    const product = (row as unknown as { product: Product | null }).product;
    return product ? [normaliseProduct(product)] : [];
  });
}

export async function saveProduct(client: SupabaseClient, userId: string, productId: string) {
  const { error } = await client
    .from("saved_items")
    .upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
  if (error) throw new Error(`Could not save item: ${error.message}`);
}

export async function unsaveProduct(client: SupabaseClient, userId: string, productId: string) {
  const { error } = await client.from("saved_items").delete().eq("user_id", userId).eq("product_id", productId);
  if (error) throw new Error(`Could not remove saved item: ${error.message}`);
}
