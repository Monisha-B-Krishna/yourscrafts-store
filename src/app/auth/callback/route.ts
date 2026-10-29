import type { NextRequest } from "next/server";
import { finishEmailLink } from "@/lib/auth/email-link";

/**
 * Fallback landing page for Supabase's built-in email links (?code=…). These
 * only work in the same browser that asked for the link, which is why our own
 * email templates point at /auth/confirm instead.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  return finishEmailLink(
    request,
    async (supabase) => {
      if (!code) return { ok: false };
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      return { ok: !error, user: data.user };
    },
    "/account",
  );
}
