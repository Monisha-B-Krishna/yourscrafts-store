import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Cookie-less anon client for public catalogue reads. Because it doesn't touch
 * cookies, pages using it can be cached and statically regenerated.
 */
export function createPublicClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
