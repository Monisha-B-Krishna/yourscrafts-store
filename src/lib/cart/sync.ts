/**
 * Who this browser's cart belongs to. The cart lives in localStorage; once a
 * customer signs in it becomes a copy of their database cart, and we note
 * their user id here so we know:
 *   - a guest cart (no owner) must be MERGED into their saved cart, once;
 *   - their own copy just needs refreshing from the database (another device
 *     may have changed it);
 *   - after sign-out, the copy must be cleared (it's safe in their account,
 *     and the next person on a shared computer shouldn't see it).
 */

export const CART_OWNER_KEY = "ycw_cart_owner_v1";

export type SyncStep = "merge" | "load" | "clear" | "none";

/** What to do with this browser's cart, given who owns it and who is signed in. */
export function nextSyncStep(owner: string | null, userId: string | null): SyncStep {
  if (userId) return owner === userId ? "load" : owner === null ? "merge" : "load";
  return owner ? "clear" : "none";
}

export function readCartOwner(): string | null {
  try {
    return window.localStorage.getItem(CART_OWNER_KEY);
  } catch {
    return null;
  }
}

export function writeCartOwner(userId: string) {
  try {
    window.localStorage.setItem(CART_OWNER_KEY, userId);
  } catch {
    // Storage blocked: the cart can't be kept between visits either, so there's nothing to double-count.
  }
}

export function clearCartOwner() {
  try {
    window.localStorage.removeItem(CART_OWNER_KEY);
  } catch {
    // ignore
  }
}
