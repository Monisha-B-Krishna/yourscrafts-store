import { DISPATCH_DAYS, TRANSIT_DAYS } from "@/lib/delivery";
import type { ProductType } from "@/lib/types";

/**
 * Order progress for customers (CLAUDE.md §5.11):
 * Placed → Confirmed → Packed → Shipped → Delivered, or Cancelled.
 * Pure functions, so the rules are easy to test.
 */

export type OrderStatus = "placed" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** One line of explanation per status, in Monisha's voice. */
export const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  placed: "We've received your order and payment.",
  confirmed: "Monisha has confirmed your order and is getting started.",
  packed: "Your order is made, wrapped and ready to go.",
  shipped: "Your order is on its way with the courier.",
  delivered: "Your order has been delivered. We hope you love it!",
  cancelled: "This order was cancelled.",
};

const PROGRESS: Exclude<OrderStatus, "cancelled">[] = ["placed", "confirmed", "packed", "shipped", "delivered"];

export interface HistoryEntry {
  status: OrderStatus;
  created_at: string;
}

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  /** done = reached; current = where the order is now; upcoming = not yet. */
  state: "done" | "current" | "upcoming";
  /** When this step was reached, if known. */
  at: string | null;
}

/**
 * The steps to show. Steps the owner skipped (e.g. straight from Placed to
 * Shipped) still show as done, without a time. A cancelled order shows the
 * steps it reached, then "Cancelled".
 */
export function buildTimeline(status: OrderStatus, history: HistoryEntry[]): TimelineStep[] {
  // Latest time each status was reached.
  const reachedAt = new Map<OrderStatus, string>();
  for (const h of [...history].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    reachedAt.set(h.status, h.created_at);
  }

  if (status === "cancelled") {
    const reached = PROGRESS.filter((s) => reachedAt.has(s));
    const lastIndex = reached.length ? PROGRESS.indexOf(reached[reached.length - 1]) : 0;
    const steps: TimelineStep[] = PROGRESS.slice(0, lastIndex + 1).map((s) => ({
      status: s,
      label: STATUS_LABELS[s],
      state: "done",
      at: reachedAt.get(s) ?? null,
    }));
    steps.push({ status: "cancelled", label: STATUS_LABELS.cancelled, state: "current", at: reachedAt.get("cancelled") ?? null });
    return steps;
  }

  const currentIndex = PROGRESS.indexOf(status);
  return PROGRESS.map((s, i) => ({
    status: s,
    label: STATUS_LABELS[s],
    state: i < currentIndex ? "done" : i === currentIndex ? (s === "delivered" ? "done" : "current") : "upcoming",
    at: i <= currentIndex ? (reachedAt.get(s) ?? null) : null,
  }));
}

/** A tracking "ID" that is actually a link (some couriers give a URL). */
export function trackingUrl(trackingId: string | null): string | null {
  if (!trackingId) return null;
  try {
    const url = new URL(trackingId.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Expected delivery window: the slowest item sets the dispatch time. */
export function expectedDelivery(types: (ProductType | string | null | undefined)[], placedAt: Date) {
  const known = types.map((t) => (t && t in DISPATCH_DAYS ? (t as ProductType) : "product"));
  const list = known.length ? known : (["product"] as ProductType[]);
  const dispatchMin = Math.max(...list.map((t) => DISPATCH_DAYS[t][0]));
  const dispatchMax = Math.max(...list.map((t) => DISPATCH_DAYS[t][1]));
  return {
    dispatchMin,
    dispatchMax,
    earliest: new Date(placedAt.getTime() + (dispatchMin + TRANSIT_DAYS[0]) * DAY_MS),
    latest: new Date(placedAt.getTime() + (dispatchMax + TRANSIT_DAYS[1]) * DAY_MS),
  };
}

export const ORDER_NUMBER_PATTERN = /^YCW-\d{4}-\d{5,}$/;

/** "ycw 2026 00001", " YCW-2026-00001 " → "YCW-2026-00001". */
export function normaliseOrderNumber(raw: string): string | null {
  const compact = raw.trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/^#/, "");
  const m = compact.match(/^YCW-?(\d{4})-?(\d{5,})$/);
  return m ? `YCW-${m[1]}-${m[2]}` : null;
}
