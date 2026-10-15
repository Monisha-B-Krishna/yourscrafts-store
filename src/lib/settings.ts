import { z } from "zod";

/**
 * Owner-editable store settings (CLAUDE.md §4). Stored as one row per key in
 * the `store_settings` table; anything missing or invalid falls back to these defaults.
 */
export const storeSettingsSchema = z.object({
  whatsapp_number: z.string().regex(/^\d{10,15}$/).catch("919999999999"),
  flat_shipping_rate: z.number().int().nonnegative().catch(8000), // ₹80 in paise
  free_shipping_threshold: z.number().int().nonnegative().catch(99900), // ₹999 in paise
  announcement_text: z
    .string()
    .catch("Free shipping across India on orders above ₹999 ✿ Handmade with love"),
  instagram_url: z.string().url().catch("https://www.instagram.com/yours.craftswoman/"),
  cancellation_window_hours: z.number().int().nonnegative().catch(12),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

export const DEFAULT_SETTINGS: StoreSettings = storeSettingsSchema.parse({});

/** Turns `store_settings` rows ({ key, value }) into a validated settings object. */
export function parseSettingsRows(rows: { key: string; value: unknown }[]): StoreSettings {
  const raw: Record<string, unknown> = {};
  for (const row of rows) raw[row.key] = row.value;
  return storeSettingsSchema.parse(raw);
}
