import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { loginHref } from "@/lib/auth/redirect";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Pages only signed-in customers can open. */
const SIGNED_IN_ONLY = /^\/(account|reset-password)(\/|$)/;
const ADMIN_ONLY = /^\/admin(\/|$)/;

/**
 * Runs before every page. It keeps the login session fresh (Supabase sessions
 * expire hourly and are renewed here) and guards private areas:
 *   /account, /reset-password → guests are sent to /login
 *   /admin                    → anyone who isn't the owner gets "page not found"
 * The admin pages check again on the server, and the database's Row Level
 * Security checks a third time, so this is never the only lock.
 */
export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdminPath = ADMIN_ONLY.test(pathname);

  if (!isSupabaseConfigured()) {
    // Demo mode has no accounts, so there is no owner to let in.
    return isAdminPath ? notFoundResponse(request) : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Don't put code between createServerClient and getUser: getUser is what
  // refreshes an expired session.
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user && SIGNED_IN_ONLY.test(pathname)) {
    return withCookies(NextResponse.redirect(new URL(loginHref(pathname + search), request.url)), response);
  }

  if (isAdminPath) {
    if (!user) return withCookies(notFoundResponse(request), response);
    const { data: isAdmin, error } = await supabase.rpc("is_admin");
    if (error || isAdmin !== true) return withCookies(notFoundResponse(request), response);
  }

  // Private pages must never be stored by shared caches.
  if (user && (SIGNED_IN_ONLY.test(pathname) || isAdminPath)) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

/** Shows the normal 404 page without revealing that /admin exists. */
function notFoundResponse(request: NextRequest) {
  return NextResponse.rewrite(new URL("/_not-found-admin", request.url), { status: 404 });
}

/** Keeps any refreshed session cookies when we return a different response. */
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}
