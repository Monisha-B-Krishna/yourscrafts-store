"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { couponFormSchema, dealFormSchema, editionFormSchema } from "@/lib/admin/forms";
import { fieldErrors, type FieldErrors } from "@/lib/validation/account";

export type ManageResult = { ok: true } | { ok: false; message: string; fields?: FieldErrors };

const CHECK = "Please check the highlighted fields.";
const idSchema = z.uuid();

function refresh(path: string) {
  revalidatePath(path);
  revalidatePath("/", "layout"); // deals and editions change what the shop shows
}

export async function saveDealAction(input: unknown): Promise<ManageResult> {
  const { supabase } = await requireAdmin();
  const parsed = dealFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: CHECK, fields: fieldErrors(parsed.error) };
  const { id, row } = parsed.data;
  const { error } = id ? await supabase.from("deals").update(row).eq("id", id) : await supabase.from("deals").insert(row);
  if (error) {
    console.error("Deal save failed:", error.message);
    return { ok: false, message: "Couldn't save the deal. Please try again." };
  }
  refresh("/admin/deals");
  return { ok: true };
}

export async function deleteDealAction(id: string): Promise<ManageResult> {
  const { supabase } = await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Unknown deal." };
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) return { ok: false, message: "Couldn't delete the deal." };
  refresh("/admin/deals");
  return { ok: true };
}

export async function saveCouponAction(input: unknown): Promise<ManageResult> {
  const { supabase } = await requireAdmin();
  const parsed = couponFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: CHECK, fields: fieldErrors(parsed.error) };
  const { id, row } = parsed.data;
  const { error } = id ? await supabase.from("coupons").update(row).eq("id", id) : await supabase.from("coupons").insert(row);
  if (error) {
    if (error.code === "23505") return { ok: false, message: "That code already exists.", fields: { code: "Already used" } };
    console.error("Coupon save failed:", error.message);
    return { ok: false, message: "Couldn't save the coupon. Please try again." };
  }
  revalidatePath("/admin/deals");
  return { ok: true };
}

export async function deleteCouponAction(id: string): Promise<ManageResult> {
  const { supabase } = await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Unknown coupon." };
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) return { ok: false, message: "Couldn't delete the coupon." };
  revalidatePath("/admin/deals");
  return { ok: true };
}

export async function saveEditionAction(input: unknown): Promise<ManageResult> {
  const { supabase } = await requireAdmin();
  const parsed = editionFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: CHECK, fields: fieldErrors(parsed.error) };
  const v = parsed.data;
  const { error } = await supabase.rpc("admin_save_collection", {
    c: {
      id: idSchema.safeParse(v.id).success ? v.id : "",
      name: v.name,
      slug: v.slug,
      description: v.description,
      banner_image: v.bannerImage,
      starts_at: v.startsAt ?? "",
      ends_at: v.endsAt ?? "",
      is_active: v.isActive,
      product_ids: v.productIds,
    },
  });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Another edition uses that web address.", fields: { slug: "Already used" } };
    console.error("Edition save failed:", error.message);
    return { ok: false, message: "Couldn't save the edition. Please try again." };
  }
  refresh("/admin/editions");
  return { ok: true };
}

export async function deleteEditionAction(id: string): Promise<ManageResult> {
  const { supabase } = await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Unknown edition." };
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) return { ok: false, message: "Couldn't delete the edition." };
  refresh("/admin/editions");
  return { ok: true };
}
