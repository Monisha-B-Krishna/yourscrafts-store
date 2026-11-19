"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { productFormSchema, toProductPayload } from "@/lib/admin/forms";
import { fieldErrors, type FieldErrors } from "@/lib/validation/account";

export type SaveProductResult = { ok: true; id: string } | { ok: false; message: string; fields?: FieldErrors };

/** Refreshes every shop page, so changes show straight away. */
function refreshShop() {
  revalidatePath("/", "layout");
}

export async function saveProductAction(input: unknown): Promise<SaveProductResult> {
  const { supabase } = await requireAdmin();
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  }
  const { data, error } = await supabase.rpc("admin_save_product", { p: toProductPayload(parsed.data) });
  if (error || typeof data !== "string") {
    if (error?.code === "23505") {
      if (error.message.includes("slug")) {
        return { ok: false, message: "Another product already uses that web address.", fields: { slug: "Already used by another product" } };
      }
      if (error.message.includes("sku")) {
        return { ok: false, message: "Another product already uses that SKU.", fields: { sku: "Already used" } };
      }
    }
    console.error("Product save failed:", error?.message);
    return { ok: false, message: "Couldn't save. Please try again." };
  }
  refreshShop();
  return { ok: true, id: data };
}

const idSchema = z.uuid();

export async function duplicateProductAction(id: string): Promise<SaveProductResult> {
  const { supabase } = await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Unknown product." };
  const { data, error } = await supabase.rpc("admin_duplicate_product", { p_id: id });
  if (error || typeof data !== "string") return { ok: false, message: "Couldn't make a copy. Please try again." };
  return { ok: true, id: data };
}

/** Archive (hide from the shop) or bring back. Past orders keep their details either way. */
export async function setProductActiveAction(id: string, active: boolean): Promise<SaveProductResult> {
  const { supabase } = await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Unknown product." };
  const { error } = await supabase.from("products").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, message: "Couldn't update. Please try again." };
  refreshShop();
  revalidatePath("/admin/products");
  revalidatePath("/admin/artworks");
  return { ok: true, id };
}
