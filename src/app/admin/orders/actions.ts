"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { sendOrderStatusUpdate } from "@/lib/email/order-emails";

export type AdminResult = { ok: true; message?: string } | { ok: false; message: string };

const updateSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"]),
  courier: z.string().trim().max(80),
  trackingId: z.string().trim().max(300),
  note: z.string().trim().max(500),
  restock: z.boolean(),
  notify: z.boolean(),
});

/**
 * Saves courier details and moves the order to a new status (recorded with the
 * time in its history). Optionally emails the customer the update.
 */
export async function updateOrderAction(input: unknown): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the details and try again." };
  const v = parsed.data;

  const { data: current, error: loadError } = await supabase
    .from("orders")
    .select("status, courier, tracking_id")
    .eq("id", v.orderId)
    .maybeSingle();
  if (loadError || !current) return { ok: false, message: "We couldn't find that order." };

  if ((current.courier ?? "") !== v.courier || (current.tracking_id ?? "") !== v.trackingId) {
    const { error } = await supabase
      .from("orders")
      .update({ courier: v.courier || null, tracking_id: v.trackingId || null })
      .eq("id", v.orderId);
    if (error) return { ok: false, message: "Couldn't save the courier details. Please try again." };
  }

  const statusChanged = current.status !== v.status;
  if (statusChanged) {
    const { error } = await supabase.rpc("admin_set_order_status", {
      p_order_id: v.orderId,
      p_status: v.status,
      p_note: v.note || null,
      p_restock: v.status === "cancelled" && v.restock,
    });
    if (error) {
      console.error("Status update failed:", error.message);
      return { ok: false, message: "Couldn't update the status. Please try again." };
    }
    if (v.notify) after(() => sendOrderStatusUpdate(v.orderId));
  }

  revalidatePath(`/admin/orders/${v.orderId}`);
  revalidatePath("/admin");
  if (v.status === "cancelled" && v.restock && statusChanged) revalidatePath("/", "layout");
  return {
    ok: true,
    message: statusChanged
      ? `Order marked ${v.status}${v.notify ? " and the customer has been emailed" : ""}.`
      : "Saved.",
  };
}

const notesSchema = z.object({ orderId: z.uuid(), notes: z.string().max(2000) });

/** Private notes about an order. Customers never see these. */
export async function saveOrderNotesAction(input: unknown): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Notes are limited to 2,000 characters." };
  const { error } = await supabase
    .from("orders")
    .update({ notes: parsed.data.notes.trim() || null })
    .eq("id", parsed.data.orderId);
  if (error) return { ok: false, message: "Couldn't save the notes. Please try again." };
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { ok: true, message: "Notes saved." };
}
