"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { saveProduct, unsaveProduct } from "@/lib/saved";

export type SavedActionResult = { ok: true } | { ok: false; reason: "signed_out" | "invalid" | "error" };

const productIdSchema = z.uuid();

/** Saves a product for later. Requires a signed-in customer (CLAUDE.md §5). */
export async function saveForLaterAction(productId: string): Promise<SavedActionResult> {
  if (!productIdSchema.safeParse(productId).success) return { ok: false, reason: "invalid" };
  const session = await getCurrentUser();
  if (!session) return { ok: false, reason: "signed_out" };
  try {
    await saveProduct(session.supabase, session.user.id, productId);
  } catch (error) {
    console.error(error);
    return { ok: false, reason: "error" };
  }
  revalidatePath("/saved");
  return { ok: true };
}

export async function removeSavedAction(productId: string): Promise<SavedActionResult> {
  if (!productIdSchema.safeParse(productId).success) return { ok: false, reason: "invalid" };
  const session = await getCurrentUser();
  if (!session) return { ok: false, reason: "signed_out" };
  try {
    await unsaveProduct(session.supabase, session.user.id, productId);
  } catch (error) {
    console.error(error);
    return { ok: false, reason: "error" };
  }
  revalidatePath("/saved");
  return { ok: true };
}
