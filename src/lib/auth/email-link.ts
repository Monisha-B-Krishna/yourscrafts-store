import "server-only";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { syncAdminRole } from "@/lib/auth/admin-role";
import { NEXT_COOKIE, safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

type Verify = (supabase: Awaited<ReturnType<typeof createClient>>) => Promise<{ ok: boolean; user?: import("@supabase/supabase-js").User | null }>;

/**
 * Shared ending for both email-link routes: sign the customer in, make the
 * owner an admin, then send them to the page they were heading for.
 */
export async function finishEmailLink(request: NextRequest, verify: Verify, defaultNext: string) {
  const url = request.nextUrl;
  const cookieStore = await cookies();
  const next = safeNextPath(url.searchParams.get("next") ?? cookieStore.get(NEXT_COOKIE)?.value, defaultNext);

  const supabase = await createClient();
  const result = await verify(supabase).catch((error) => {
    console.error("Email link failed:", error);
    return { ok: false as const, user: null };
  });

  const target = new URL(result.ok ? next : "/login?error=link", url.origin);
  if (result.ok && result.user) await syncAdminRole(result.user);
  const response = NextResponse.redirect(target, { status: 303 });
  response.cookies.delete(NEXT_COOKIE);
  return response;
}
