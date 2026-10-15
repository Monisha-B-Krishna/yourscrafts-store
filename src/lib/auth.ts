import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in customer (from the session cookie) plus a Supabase client
 * acting as them, or null for guests. Sign-up and login pages arrive in Phase 3.
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}
