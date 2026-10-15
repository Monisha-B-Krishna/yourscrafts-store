import type { ProductType } from "@/lib/types";

/**
 * Delivery estimate shown on product pages. These are ASSUMPTIONS until the
 * owner confirms her real timings:
 *  - dispatch: days to make/pack the item before it leaves the studio
 *  - transit:  days the courier takes anywhere in India
 */
export const DISPATCH_DAYS: Record<ProductType, [min: number, max: number]> = {
  product: [1, 3],
  original_art: [2, 4],
  print: [2, 4],
};
export const TRANSIT_DAYS: [min: number, max: number] = [3, 6];

const DAY_MS = 24 * 60 * 60 * 1000;

export function estimateDelivery(type: ProductType, now: Date = new Date()) {
  const [dispatchMin, dispatchMax] = DISPATCH_DAYS[type];
  return {
    dispatchMin,
    dispatchMax,
    earliest: new Date(now.getTime() + (dispatchMin + TRANSIT_DAYS[0]) * DAY_MS),
    latest: new Date(now.getTime() + (dispatchMax + TRANSIT_DAYS[1]) * DAY_MS),
  };
}

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

/** "Thu, 23 Oct" in Indian time. */
export const formatDeliveryDate = (date: Date) => dateFormat.format(date);
