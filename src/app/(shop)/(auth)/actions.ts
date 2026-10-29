"use server";

import { cookies } from "next/headers";
import type { AuthError } from "@supabase/supabase-js";
import { syncAdminRole } from "@/lib/auth/admin-role";
import { NEXT_COOKIE, safeNextPath } from "@/lib/auth/redirect";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  emailOnlySchema,
  fieldErrors,
  newPasswordFormSchema,
  signInSchema,
  signUpSchema,
  type FieldErrors,
} from "@/lib/validation/account";

export type AuthResult =
  | { ok: true; status: "signed_in"; next: string }
  | { ok: true; status: "check_email" }
  | { ok: true; status: "password_updated" }
  | { ok: false; message: string; fields?: FieldErrors; needsConfirmation?: boolean };

const NOT_SET_UP: AuthResult = {
  ok: false,
  message: "Accounts aren't switched on yet. The store needs its database keys first.",
};

/** Remembers where to return after an email link (signup confirmation, magic link, password reset). */
async function rememberNext(next: string) {
  (await cookies()).set(NEXT_COOKIE, next, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: siteUrl.startsWith("https://"),
    maxAge: 60 * 60,
  });
}

const callbackUrl = (next: string) => `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

/** Supabase's error codes, in words a customer understands. */
function friendly(error: AuthError, fallback = "Something went wrong. Please try again."): string {
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password don't match. Please try again.";
    case "email_not_confirmed":
      return "Please confirm your email first. Check your inbox for our link.";
    case "weak_password":
      return "Please choose a stronger password: at least 8 characters, with letters and numbers.";
    case "same_password":
      return "That's your current password. Please choose a new one.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a minute and try again.";
    case "signup_disabled":
      return "New sign-ups are paused right now. Please message us on WhatsApp.";
    case "user_banned":
      return "This account is blocked. Please contact us on WhatsApp.";
    default:
      return fallback;
  }
}

export async function signUpAction(input: unknown, nextRaw?: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_SET_UP;
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const { email, password, fullName, phone } = parsed.data;
  const next = safeNextPath(nextRaw);

  const supabase = await createClient();
  await rememberNext(next);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone }, emailRedirectTo: callbackUrl(next) },
  });
  if (error) return { ok: false, message: friendly(error) };

  if (data.session && data.user) {
    // Email confirmation is switched off, so they're signed in straight away.
    await syncAdminRole(data.user);
    return { ok: true, status: "signed_in", next };
  }
  // Also returned when the email already has an account, so this page can't be
  // used to find out who shops here. That person gets a normal "sign in" path.
  return { ok: true, status: "check_email" };
}

export async function signInAction(input: unknown, nextRaw?: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_SET_UP;
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      ok: false,
      message: friendly(error, "We couldn't sign you in. Please try again."),
      needsConfirmation: error.code === "email_not_confirmed",
    };
  }
  await syncAdminRole(data.user);
  return { ok: true, status: "signed_in", next: safeNextPath(nextRaw) };
}

/** Emails a one-tap sign-in link. Only for existing accounts (sign-up needs a phone number). */
export async function magicLinkAction(input: unknown, nextRaw?: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_SET_UP;
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const next = safeNextPath(nextRaw);

  const supabase = await createClient();
  await rememberNext(next);
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: callbackUrl(next) },
  });
  // "No account with this email" is reported as success on purpose (privacy).
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { ok: false, message: friendly(error) };
  }
  if (error && (error.status ?? 500) >= 500) console.error("Magic link failed:", error.code, error.message);
  return { ok: true, status: "check_email" };
}

export async function resendConfirmationAction(input: unknown): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_SET_UP;
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please enter a valid email.", fields: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl("/account") },
  });
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { ok: false, message: friendly(error) };
  }
  return { ok: true, status: "check_email" };
}

export async function forgotPasswordAction(input: unknown): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_SET_UP;
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };

  const supabase = await createClient();
  await rememberNext("/reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl("/reset-password"),
  });
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { ok: false, message: friendly(error) };
  }
  // Same answer whether or not the account exists (privacy).
  return { ok: true, status: "check_email" };
}

/** Sets a new password for the signed-in customer (after a reset link, or from My account). */
export async function updatePasswordAction(input: unknown): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return NOT_SET_UP;
  const parsed = newPasswordFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: current } = await supabase.auth.getUser();
  if (!current.user) return { ok: false, message: "Your reset link has expired. Please ask for a new one." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: friendly(error, "We couldn't update your password. Please try again.") };
  return { ok: true, status: "password_updated" };
}
