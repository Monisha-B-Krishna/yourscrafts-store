"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { findGuestOrder, orderLink } from "@/lib/orders/server";
import { normaliseOrderNumber } from "@/lib/orders/timeline";
import { emailSchema } from "@/lib/validation/account";

export type TrackState = { message: string | null; fields: { orderNumber?: string; email?: string }; values: { orderNumber: string; email: string } };

const schema = z.object({
  orderNumber: z
    .string()
    .max(40)
    .transform((v, ctx) => {
      const n = normaliseOrderNumber(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Order numbers look like YCW-2026-00001" });
        return z.NEVER;
      }
      return n;
    }),
  email: emailSchema,
});

/** Guest tracking: order number + checkout email. Same answer for any mismatch, so it can't be used to probe. */
export async function trackOrderAction(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const values = { orderNumber: String(formData.get("orderNumber") ?? ""), email: String(formData.get("email") ?? "") };
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fields: TrackState["fields"] = {};
    for (const issue of parsed.error.issues) fields[issue.path[0] as "orderNumber" | "email"] ??= issue.message;
    return { message: null, fields, values };
  }
  const found = await findGuestOrder(parsed.data.orderNumber, parsed.data.email);
  if (!found) {
    return {
      message: "We couldn't find a paid order with that number and email. Please check both, or message us on WhatsApp.",
      fields: {},
      values,
    };
  }
  redirect(orderLink(parsed.data.orderNumber, found.accessKey));
}
