import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";

/**
 * Service-role client: bypasses Row Level Security. Server-only, and only for
 * trusted writes (analytics events now; orders and stock in Phase 4).
 * Returns null when the key isn't configured (e.g. demo mode).
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl.startsWith("http") || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
