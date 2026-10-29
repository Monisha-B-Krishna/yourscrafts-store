import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { finishEmailLink } from "@/lib/auth/email-link";

const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Landing page for the links in our emails (see supabase/templates). Works on
 * any device, even if the link is opened somewhere other than where it was asked for.
 *   /auth/confirm?token_hash=…&type=email|recovery|email_change[&next=/path]
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const defaultNext = type === "recovery" ? "/reset-password" : "/account";

  return finishEmailLink(
    request,
    async (supabase) => {
      if (!tokenHash || !type || !TYPES.includes(type)) return { ok: false };
      const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      return { ok: !error, user: data.user };
    },
    defaultNext,
  );
}
