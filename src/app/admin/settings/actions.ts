"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { settingsFormSchema } from "@/lib/admin/forms";
import { fieldErrors, type FieldErrors } from "@/lib/validation/account";

export type SettingsResult = { ok: true } | { ok: false; message: string; fields?: FieldErrors };

/** Saves the store settings (CLAUDE.md §4). The shop reads them on every page. */
export async function saveSettingsAction(input: unknown): Promise<SettingsResult> {
  const { supabase } = await requireAdmin();
  const parsed = settingsFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const v = parsed.data;
  const rows = [
    { key: "whatsapp_number", value: v.whatsappNumber },
    { key: "flat_shipping_rate", value: v.flatShippingRate },
    { key: "free_shipping_threshold", value: v.freeShippingThreshold },
    { key: "announcement_text", value: v.announcementText },
    { key: "instagram_url", value: v.instagramUrl },
    { key: "cancellation_window_hours", value: v.cancellationWindowHours },
  ];
  const { error } = await supabase.from("store_settings").upsert(rows, { onConflict: "key" });
  if (error) {
    console.error("Settings save failed:", error.message);
    return { ok: false, message: "Couldn't save the settings. Please try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
