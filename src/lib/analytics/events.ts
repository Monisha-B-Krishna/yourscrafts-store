import { z } from "zod";

/**
 * Analytics event contract (see docs/data-dictionary.md). Events are validated
 * here on the server before they are stored, so the `events` table only ever
 * holds known event names with known metadata keys — and no personal data.
 */

/** Events a browser may send. Payment events are written by the server only (Phase 4). */
export const CLIENT_EVENT_NAMES = [
  "page_view",
  "product_view",
  "search",
  "add_to_cart",
  "remove_from_cart",
  "save_for_later",
  "begin_checkout",
] as const;

export type ClientEventName = (typeof CLIENT_EVENT_NAMES)[number];

/** Lower-cases a search query and masks anything that looks like an email or phone number. */
export function scrubQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[^\s@]+@[^\s@]+/g, "[email]")
    // Phone-number shapes: 98765 43210, +91-98765-43210, 987 654 3210, or 7+ digits in a row.
    .replace(/(\+?\d{1,3}[\s-]?)?\d{5}[\s-]\d{5}/g, "[number]")
    .replace(/\d{3}[\s-]\d{3}[\s-]\d{4}/g, "[number]")
    .replace(/\+?\d{7,}/g, "[number]")
    .slice(0, 100);
}

const uuid = z.uuid();
const qty = z.number().int().min(1).max(99);

// z.object() drops any keys not listed, so unexpected data never reaches the table.
const metadataSchemas = {
  page_view: z.object({
    path: z.string().startsWith("/").max(200),
    referrer_host: z.string().max(100).regex(/^[a-z0-9.-]+$/i).optional(),
  }),
  product_view: z.object({}),
  search: z.object({
    query: z.string().min(1).max(200).transform(scrubQuery),
    results: z.number().int().min(0).max(1000),
    source: z.enum(["results_page", "suggestion"]),
  }),
  add_to_cart: z.object({
    qty,
    variant_id: uuid.nullable().optional(),
    source: z.enum(["product_page", "cart", "saved"]),
  }),
  remove_from_cart: z.object({
    qty,
    variant_id: uuid.nullable().optional(),
    source: z.enum(["cart"]),
  }),
  save_for_later: z.object({
    source: z.enum(["product_page", "cart"]),
  }),
  begin_checkout: z.object({
    items: z.number().int().min(1).max(999),
    subtotal: z.number().int().min(0),
  }),
} satisfies Record<ClientEventName, z.ZodType>;

/** Events about one product must say which product. */
const NEEDS_PRODUCT: ReadonlySet<ClientEventName> = new Set([
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "save_for_later",
]);

const requestSchema = z.object({
  session_id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  event_name: z.enum(CLIENT_EVENT_NAMES),
  product_id: uuid.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export interface ValidEvent {
  session_id: string;
  event_name: ClientEventName;
  product_id: string | null;
  metadata: Record<string, unknown>;
}

export function parseClientEvent(body: unknown): ValidEvent | null {
  const base = requestSchema.safeParse(body);
  if (!base.success) return null;
  const { session_id, event_name, product_id, metadata } = base.data;

  if (NEEDS_PRODUCT.has(event_name) && !product_id) return null;

  const meta = metadataSchemas[event_name].safeParse(metadata ?? {});
  if (!meta.success) return null;

  return {
    session_id,
    event_name,
    product_id: NEEDS_PRODUCT.has(event_name) ? (product_id ?? null) : null,
    metadata: meta.data as Record<string, unknown>,
  };
}
