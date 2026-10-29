import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/** True when this account is the owner's (ADMIN_EMAIL) and its email has been confirmed. */
export function isOwnerAccount(user: Pick<User, "email" | "email_confirmed_at">, adminEmail = process.env.ADMIN_EMAIL): boolean {
  const owner = adminEmail?.trim().toLowerCase();
  if (!owner || !user.email || !user.email_confirmed_at) return false;
  return user.email.trim().toLowerCase() === owner;
}

/**
 * Makes the owner's account an admin the first time she signs in (CLAUDE.md §6:
 * "seed the owner's email as admin from ADMIN_EMAIL"). Only a confirmed email
 * counts, so nobody can claim the role by signing up with her address.
 * Safe to call on every sign-in; it never removes a role.
 */
export async function syncAdminRole(user: User): Promise<void> {
  if (!isOwnerAccount(user)) return;
  const admin = createAdminClient();
  if (!admin) {
    console.warn("ADMIN_EMAIL is set but SUPABASE_SERVICE_ROLE_KEY is missing, so the admin role can't be granted.");
    return;
  }
  const { error } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("user_id", user.id)
    .neq("role", "admin");
  if (error) console.error("Could not grant the admin role:", error.message);
}
