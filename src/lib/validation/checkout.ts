import { z } from "zod";
import { addressSchema, emailSchema, phoneSchema } from "@/lib/validation/account";

/** A delivery address at checkout (the "make default" box doesn't apply here). */
export const shippingAddressSchema = addressSchema.omit({ isDefault: true });
export type ShippingAddress = z.output<typeof shippingAddressSchema>;

const contact = { email: emailSchema, phone: phoneSchema };

/** Signed-in customer picking one of their saved addresses. */
export const savedAddressCheckoutSchema = z.object({
  ...contact,
  addressMode: z.literal("saved"),
  addressId: z.uuid({ error: "Please choose a delivery address" }),
});

/** Anyone typing a new address (guests always do). */
export const newAddressCheckoutSchema = z.object({
  ...contact,
  addressMode: z.literal("new"),
  address: shippingAddressSchema,
  /** Signed-in customers can keep the new address for next time. */
  saveAddress: z.boolean(),
});

export const checkoutSchema = z.discriminatedUnion("addressMode", [
  savedAddressCheckoutSchema,
  newAddressCheckoutSchema,
]);
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutDetails = z.output<typeof checkoutSchema>;

export const checkoutLineSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable(),
  qty: z.number().int().min(1).max(99),
});

export const sessionIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);

/** What the browser sends back after Razorpay says the payment went through. */
export const paymentResultSchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]{6,40}$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]{6,40}$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

export const paymentFailureSchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]{6,40}$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]{6,40}$/).nullable(),
  reason: z.string().max(80).nullable(),
});
