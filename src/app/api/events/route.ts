import { parseClientEvent } from "@/lib/analytics/events";
import { getCurrentUser } from "@/lib/auth";
import { unitPrice } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BODY_BYTES = 4096;
const noContent = () => new Response(null, { status: 204 });

/** Receives one analytics event from the browser, validates it and stores it. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  const event = parseClientEvent(body);
  if (!event) return new Response(null, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return noContent(); // demo mode or no service key: analytics off

  const metadata = { ...event.metadata };

  // Record the price the shopper saw, looked up on the server (never trusted from the browser).
  if (event.event_name === "add_to_cart" && event.product_id) {
    const { data: product } = await admin
      .from("products")
      .select("price, sale_price, variants:product_variants (id, price_delta)")
      .eq("id", event.product_id)
      .maybeSingle();
    if (!product) return new Response(null, { status: 400 });
    const variant = product.variants.find((v) => v.id === metadata.variant_id) ?? null;
    metadata.unit_price = unitPrice(product, variant);
  }

  const user = await getCurrentUser();
  const { error } = await admin.from("events").insert({
    session_id: event.session_id,
    user_id: user?.user.id ?? null,
    event_name: event.event_name,
    product_id: event.product_id,
    metadata,
  });
  if (error) {
    console.error("Could not store analytics event:", error.message);
    return new Response(null, { status: 400 });
  }
  return noContent();
}
