"use client";

import { useEffect } from "react";
import { syncCartAction } from "@/app/(shop)/cart/actions";
import { cartStore, type CartLine } from "@/lib/cart/store";
import { clearCartOwner, hasAuthCookie, nextSyncStep, readCartOwner, writeCartOwner } from "@/lib/cart/sync";

/**
 * Keeps a signed-in customer's cart saved in their account (CLAUDE.md §5):
 *   - at login, the guest cart is merged into the saved cart (once);
 *   - on each visit, the saved cart is loaded (it may have changed on another device);
 *   - after every change here, the saved cart is updated;
 *   - after sign-out, this browser's copy is cleared.
 * Guests are untouched: their cart stays in localStorage only.
 */
export function CartSync({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let userId: string | null | undefined = undefined; // undefined until the session is known
    let queue: Promise<void> = Promise.resolve();
    let applyingSaved = false; // true while we write the saved cart into the browser
    let pushing = false;
    let pushAgain = false;
    let lastPushed = "";
    let cancelled = false;

    function showSaved(lines: CartLine[]) {
      applyingSaved = true;
      cartStore.replaceAll(lines);
      applyingSaved = false;
      lastPushed = JSON.stringify(cartStore.getSnapshot());
    }

    // Session news can arrive twice at start-up (the initial check and the
    // auth listener). Acting once per change of customer, one step at a time,
    // stops a guest cart being merged twice.
    function onUser(nextUserId: string | null) {
      if (nextUserId === userId) return;
      userId = nextUserId;
      queue = queue.then(() => reconcile(nextUserId)).catch(() => undefined);
    }

    async function reconcile(nextUserId: string | null) {
      if (cancelled || userId !== nextUserId) return;
      const owner = readCartOwner();
      const step = nextSyncStep(owner, nextUserId);
      if (step === "none") return;
      if (step === "clear") {
        showSaved([]);
        clearCartOwner();
        return;
      }
      // Merge only a guest cart; a different customer's leftover copy is dropped.
      const local = step === "merge" ? cartStore.getSnapshot() : [];
      const res = await syncCartAction(local, "merge");
      if (cancelled || userId !== nextUserId) return;
      if (res.ok) {
        showSaved(res.lines);
        writeCartOwner(nextUserId!);
      }
    }

    // Save each change the customer makes. One request at a time; the latest cart wins.
    async function push() {
      if (!userId || readCartOwner() !== userId) return;
      const lines = cartStore.getSnapshot();
      const key = JSON.stringify(lines);
      if (key === lastPushed) return;
      if (pushing) {
        pushAgain = true;
        return;
      }
      pushing = true;
      try {
        const res = await syncCartAction(lines, "replace");
        if (res.ok) lastPushed = key;
      } finally {
        pushing = false;
        if (pushAgain) {
          pushAgain = false;
          void push();
        }
      }
    }

    const unsubscribeCart = cartStore.subscribe(() => {
      if (!applyingSaved) void push();
    });

    // Signing in or out always reloads the page, so the cookies tell us at
    // start-up whether anyone is signed in. Guests never download the sign-in
    // library; for signed-in customers it loads once the page is idle.
    // INITIAL_SESSION arrives first with the current session, then SIGNED_IN /
    // SIGNED_OUT whenever that changes.
    let unsubscribeAuth: (() => void) | undefined;
    async function listen() {
      const { createClient } = await import("@/lib/supabase/client");
      if (cancelled) return;
      const { data } = createClient().auth.onAuthStateChange((event, session) => {
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT") {
          onUser(session?.user.id ?? null);
        }
      });
      unsubscribeAuth = () => data.subscription.unsubscribe();
    }
    let handle: number | undefined;
    const idle = typeof window.requestIdleCallback === "function";
    if (!hasAuthCookie(document.cookie)) {
      onUser(null);
    } else {
      handle = idle
        ? window.requestIdleCallback(() => void listen(), { timeout: 3000 })
        : window.setTimeout(() => void listen(), 1500);
    }

    return () => {
      cancelled = true;
      if (handle !== undefined) {
        if (idle) window.cancelIdleCallback(handle);
        else window.clearTimeout(handle);
      }
      unsubscribeCart();
      unsubscribeAuth?.();
    };
  }, [enabled]);

  return null;
}
