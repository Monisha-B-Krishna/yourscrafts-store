/**
 * Public Supabase settings. When they are missing the store runs in
 * "demo mode" and reads the example catalogue from src/lib/seed instead.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return supabaseUrl.startsWith("http") && supabaseAnonKey.length > 20;
}

/**
 * The site's public address, used for links in emails, the sitemap and link
 * previews. Set NEXT_PUBLIC_SITE_URL; on Vercel it falls back to the
 * project's production address automatically.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "http://localhost:3000"
).replace(/\/$/, "");
