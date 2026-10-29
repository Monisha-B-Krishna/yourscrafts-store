/**
 * Where to send someone after they sign in. Only paths on this site are
 * allowed, so a link like /login?next=https://evil.example can't bounce a
 * customer to another website (an "open redirect").
 */
export function safeNextPath(next: unknown, fallback = "/account"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return fallback;
  // Must be a single-slash path: no "//host", no "/\host", no scheme, no control characters.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  try {
    const url = new URL(next, "http://same.origin");
    if (url.origin !== "http://same.origin") return fallback;
    // Never send people back to the sign-in pages themselves.
    if (/^\/(login|signup|forgot-password|auth)(\/|$)/.test(url.pathname)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

/** /login?next=/checkout — the sign-in page link that brings them back here. */
export function loginHref(next?: string): string {
  const path = next ? safeNextPath(next, "") : "";
  return path ? `/login?next=${encodeURIComponent(path)}` : "/login";
}

/** Cookie that remembers where to go after an email link is clicked (same device). */
export const NEXT_COOKIE = "ycw_next";
