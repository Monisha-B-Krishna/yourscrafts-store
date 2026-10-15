import { useSyncExternalStore } from "react";
import { z } from "zod";
import { MAX_QTY_PER_LINE } from "./quote";

/**
 * The guest cart, kept in the browser's localStorage (CLAUDE.md §5). It stores
 * only ids and quantities — prices are always worked out on the server.
 * Phase 3 merges this into the database cart when the customer logs in.
 */

export interface CartLine {
  productId: string;
  variantId: string | null;
  qty: number;
}

export const CART_STORAGE_KEY = "ycw_cart_v1";
const MAX_LINES = 50;

const storedLineSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64).nullable(),
  qty: z.number().int().min(1).max(99),
});

const sameLine = (a: Pick<CartLine, "productId" | "variantId">, b: Pick<CartLine, "productId" | "variantId">) =>
  a.productId === b.productId && a.variantId === b.variantId;

const clampQty = (qty: number, max = MAX_QTY_PER_LINE) => Math.max(1, Math.min(Math.floor(qty), max));

// ---------------------------------------------------------------------------
// Pure helpers (unit tested)
// ---------------------------------------------------------------------------

/** Reads whatever is in storage, dropping anything malformed. Never throws. */
export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  let lines: CartLine[] = [];
  for (const item of data) {
    const parsed = storedLineSchema.safeParse(item);
    if (parsed.success) lines = addLine(lines, parsed.data);
  }
  return lines.slice(0, MAX_LINES);
}

/** Adds to an existing line (same product + option) or appends a new one. */
export function addLine(lines: CartLine[], line: CartLine, maxQty = MAX_QTY_PER_LINE): CartLine[] {
  const existing = lines.find((l) => sameLine(l, line));
  if (existing) {
    return lines.map((l) => (l === existing ? { ...l, qty: clampQty(l.qty + line.qty, maxQty) } : l));
  }
  if (lines.length >= MAX_LINES) return lines;
  return [...lines, { ...line, qty: clampQty(line.qty, maxQty) }];
}

export function setLineQty(
  lines: CartLine[],
  target: Pick<CartLine, "productId" | "variantId">,
  qty: number,
): CartLine[] {
  return lines.map((l) => (sameLine(l, target) ? { ...l, qty: clampQty(qty) } : l));
}

export function removeLine(lines: CartLine[], target: Pick<CartLine, "productId" | "variantId">): CartLine[] {
  return lines.filter((l) => !sameLine(l, target));
}

export function findLine(lines: CartLine[], target: Pick<CartLine, "productId" | "variantId">) {
  return lines.find((l) => sameLine(l, target));
}

export const cartCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.qty, 0);

// ---------------------------------------------------------------------------
// The store (browser only)
// ---------------------------------------------------------------------------

const EMPTY: CartLine[] = [];
let snapshot: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (typeof window === "undefined") return EMPTY;
  if (snapshot === null) {
    try {
      snapshot = parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
    } catch {
      snapshot = []; // storage blocked (private mode, etc.) — keep the cart in memory
    }
  }
  return snapshot;
}

function write(next: CartLine[]) {
  snapshot = next;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the cart still works for this page visit.
  }
  listeners.forEach((listener) => listener());
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    // Keep tabs in sync: another tab changed the cart.
    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) {
        snapshot = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: read,
  getServerSnapshot: () => EMPTY,

  /** Returns the line's quantity after adding (may be capped at maxQty). */
  add(line: CartLine, maxQty?: number): number {
    const next = addLine(read(), line, maxQty);
    write(next);
    return findLine(next, line)?.qty ?? 0;
  },
  setQty(target: Pick<CartLine, "productId" | "variantId">, qty: number) {
    write(setLineQty(read(), target, qty));
  },
  remove(target: Pick<CartLine, "productId" | "variantId">) {
    write(removeLine(read(), target));
  },
  clear() {
    write([]);
  },
};

/** Current cart lines; empty during server rendering and the first paint. */
export function useCartLines(): CartLine[] {
  return useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
}
