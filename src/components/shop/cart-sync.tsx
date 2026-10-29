"use client";

import { useEffect } from "react";
import { syncCartAction } from "@/app/(shop)/cart/actions";
import { cartStore, type CartLine } from "@/lib/cart/store";
import { clearCartOwner, nextSyncStep, readCartOwner, writeCartOwner } from "@/lib/cart/sync";
import { createClient } from "@/lib/supabase/client";

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
    const supabase = createClient();
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

    // INITIAL_SESSION arrives first with the current session, then SIGNED_IN /
    // SIGNED_OUT whenever that changes (including from another tab).
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT") {
        onUser(session?.user.id ?? null);
      }
    });

    return () => {
      cancelled = true;
      unsubscribeCart();
      listener.subscription.unsubscribe();
    };
  }, [enabled]);

  return null;
}
