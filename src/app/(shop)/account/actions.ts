"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AddressError,
  createAddress,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
} from "@/lib/addresses";
import { getCurrentUser } from "@/lib/auth";
import { addressSchema, fieldErrors, profileSchema, type FieldErrors } from "@/lib/validation/account";

export type AccountResult = { ok: true } | { ok: false; message: string; fields?: FieldErrors };

const SIGNED_OUT: AccountResult = { ok: false, message: "Your session has ended. Please sign in again." };
const idSchema = z.uuid();

export async function updateProfileAction(input: unknown): Promise<AccountResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const session = await getCurrentUser();
  if (!session) return SIGNED_OUT;

  const { error } = await session.supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq("user_id", session.user.id);
  if (error) {
    console.error("Profile update failed:", error.message);
    return { ok: false, message: "We couldn't save your details. Please try again." };
  }
  revalidatePath("/account", "layout");
  return { ok: true };
}

export async function saveAddressAction(id: string | null, input: unknown): Promise<AccountResult> {
  if (id !== null && !idSchema.safeParse(id).success) return { ok: false, message: "Please refresh the page and try again." };
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const session = await getCurrentUser();
  if (!session) return SIGNED_OUT;

  try {
    if (id) await updateAddress(session.supabase, session.user.id, id, parsed.data);
    else await createAddress(session.supabase, session.user.id, parsed.data);
  } catch (error) {
    if (error instanceof AddressError) {
      console.error("Address save failed:", error.message);
      return { ok: false, message: error.friendly };
    }
    throw error;
  }
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function setDefaultAddressAction(id: string): Promise<AccountResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Please refresh the page and try again." };
  const session = await getCurrentUser();
  if (!session) return SIGNED_OUT;
  try {
    await setDefaultAddress(session.supabase, session.user.id, id);
  } catch (error) {
    if (error instanceof AddressError) return { ok: false, message: error.friendly };
    throw error;
  }
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddressAction(id: string): Promise<AccountResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Please refresh the page and try again." };
  const session = await getCurrentUser();
  if (!session) return SIGNED_OUT;
  try {
    await deleteAddress(session.supabase, session.user.id, id);
  } catch (error) {
    if (error instanceof AddressError) return { ok: false, message: "We couldn't remove that address. Please try again." };
    throw error;
  }
  revalidatePath("/account/addresses");
  return { ok: true };
}
