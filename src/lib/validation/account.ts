import { z } from "zod";

/**
 * Validation for accounts, profiles and addresses. Shared by the forms (instant
 * feedback in the browser) and the server actions (the check that counts).
 */

// ---------------------------------------------------------------------------
// Phone: a 10-digit Indian mobile number, stored without +91
// ---------------------------------------------------------------------------

/** "+91 98765 43210", "098765-43210" → "9876543210". Returns null if it isn't a mobile number. */
export function normaliseIndianPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** "9876543210" → "+91 98765 43210" for display. */
export function formatIndianPhone(phone: string | null | undefined): string {
  if (!phone || !/^\d{10}$/.test(phone)) return phone ?? "";
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Please enter your mobile number")
  .transform((value, ctx) => {
    const phone = normaliseIndianPhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Enter a 10-digit Indian mobile number, like 98765 43210" });
      return z.NEVER;
    }
    return phone;
  });

// ---------------------------------------------------------------------------
// Names, email, password
// ---------------------------------------------------------------------------

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Please enter your name")
  .max(100, "That name is a little long (100 characters max)");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Please enter your email")
  .max(254, "That email is too long")
  .pipe(z.email("Please enter a valid email address"));

export const PASSWORD_MIN = 8;

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(72, "Use 72 characters or fewer")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Use a mix of letters and numbers");

export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: newPasswordSchema,
});
export type SignUpInput = z.input<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Please enter your password").max(72),
});
export type SignInInput = z.input<typeof signInSchema>;

export const emailOnlySchema = z.object({ email: emailSchema });
export type EmailOnlyInput = z.input<typeof emailOnlySchema>;

export const newPasswordFormSchema = z
  .object({ password: newPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match" });
export type NewPasswordInput = z.input<typeof newPasswordFormSchema>;

export const profileSchema = z.object({ fullName: fullNameSchema, phone: phoneSchema });
export type ProfileInput = z.input<typeof profileSchema>;

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

/** All 28 states and 8 union territories, as shown in the dropdown. */
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

// Optional, so blank becomes null. It also accepts null, because the browser
// sends the already-tidied form values and the server checks them again.
const optionalLine = z
  .string()
  .trim()
  .max(200, "Please keep this under 200 characters")
  .nullish()
  .transform((v) => (v ? v : null));

export const addressSchema = z.object({
  name: fullNameSchema,
  phone: phoneSchema,
  line1: z.string().trim().min(3, "Please enter the house/flat number and street").max(200, "Please keep this under 200 characters"),
  line2: optionalLine,
  city: z.string().trim().min(2, "Please enter the city or town").max(80, "Please keep this under 80 characters"),
  state: z.enum(INDIAN_STATES, { error: "Please choose a state" }),
  pincode: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^[1-9]\d{5}$/, "PIN codes have 6 digits and don't start with 0")),
  isDefault: z.boolean(),
});
export type AddressInput = z.input<typeof addressSchema>;
export type Address = z.output<typeof addressSchema>;

/** Field errors keyed by field name, for showing next to each input. */
export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
