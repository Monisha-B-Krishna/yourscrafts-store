import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Address } from "@/lib/validation/account";

/**
 * Saved delivery addresses. Every function takes a Supabase client acting as
 * the signed-in customer, so Row Level Security limits it to their own rows.
 * The database keeps exactly one default address (see the accounts migration).
 * Every query also filters on the customer's own user id: Row Level Security
 * lets the owner (admin) see everyone's rows, but her own account pages must
 * only ever show her own.
 */

export interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

const COLUMNS = "id, name, phone, line1, line2, city, state, pincode, is_default";

export async function listAddresses(client: SupabaseClient, userId: string): Promise<SavedAddress[]> {
  const { data, error } = await client
    .from("addresses")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load addresses: ${error.message}`);
  return (data ?? []) as SavedAddress[];
}

const toRow = (a: Address) => ({
  name: a.name,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2,
  city: a.city,
  state: a.state,
  pincode: a.pincode,
});

export async function createAddress(client: SupabaseClient, userId: string, address: Address) {
  const { error } = await client
    .from("addresses")
    .insert({ ...toRow(address), user_id: userId, is_default: address.isDefault });
  if (error) throw new AddressError(error.message);
}

export async function updateAddress(client: SupabaseClient, userId: string, id: string, address: Address) {
  // Un-ticking "default" isn't allowed: there must always be one default,
  // so the box only ever turns a different address into the default.
  const row = address.isDefault ? { ...toRow(address), is_default: true } : toRow(address);
  const { data, error } = await client.from("addresses").update(row).eq("id", id).eq("user_id", userId).select("id");
  if (error) throw new AddressError(error.message);
  if (!data?.length) throw new AddressError("not found");
}

export async function setDefaultAddress(client: SupabaseClient, userId: string, id: string) {
  const { data, error } = await client
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (error) throw new AddressError(error.message);
  if (!data?.length) throw new AddressError("not found");
}

export async function deleteAddress(client: SupabaseClient, userId: string, id: string) {
  const { error } = await client.from("addresses").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new AddressError(error.message);
}

export class AddressError extends Error {
  /** A message that's safe to show to the customer. */
  get friendly(): string {
    if (this.message.includes("up to 20 addresses")) return "You can save up to 20 addresses. Please remove one first.";
    if (this.message === "not found") return "We couldn't find that address. Please refresh the page.";
    return "We couldn't save that address. Please try again.";
  }
}
