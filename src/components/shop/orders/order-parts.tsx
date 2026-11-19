import { CheckIcon, XIcon } from "lucide-react";
import { formatINR } from "@/lib/pricing";
import { buildTimeline, STATUS_LABELS, type HistoryEntry, type OrderStatus } from "@/lib/orders/timeline";
import { cn } from "@/lib/utils";
import { formatIndianPhone } from "@/lib/validation/account";

const when = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});
export const formatOrderTime = (iso: string) => when.format(new Date(iso));

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
export const formatOrderDate = (iso: string) => day.format(new Date(iso));

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        status === "delivered" && "bg-ink text-cream",
        status === "cancelled" && "bg-destructive/10 text-destructive",
        status === "shipped" && "bg-peach text-ink",
        !["delivered", "cancelled", "shipped"].includes(status) && "bg-peach-soft text-ink",
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Placed → Confirmed → Packed → Shipped → Delivered, as a vertical list on phones and a row on wider screens. */
export function OrderTimeline({ status, history }: { status: OrderStatus; history: HistoryEntry[] }) {
  const steps = buildTimeline(status, history);
  return (
    <ol className="grid gap-4 sm:grid-flow-col sm:auto-cols-fr sm:gap-2" aria-label="Order progress">
      {steps.map((step, i) => {
        const cancelled = step.status === "cancelled";
        return (
          <li
            key={step.status}
            aria-current={step.state === "current" ? "step" : undefined}
            className="relative flex gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
          >
            {/* connecting line */}
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-8 left-[15px] h-[calc(100%-1rem)] w-0.5 sm:top-[15px] sm:left-[calc(50%+18px)] sm:h-0.5 sm:w-[calc(100%-36px+0.5rem)]",
                  steps[i + 1].state === "upcoming" ? "bg-border" : "bg-ink",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                step.state === "done" && "border-ink bg-ink text-cream",
                step.state === "current" && !cancelled && "border-peach-deep bg-peach text-ink",
                step.state === "current" && cancelled && "border-destructive bg-destructive text-white",
                step.state === "upcoming" && "border-border bg-white text-muted-ink",
              )}
            >
              {cancelled ? (
                <XIcon className="size-4" aria-hidden="true" />
              ) : step.state === "done" ? (
                <CheckIcon className="size-4" aria-hidden="true" />
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0 pb-1">
              <p className={cn("text-sm font-medium", step.state === "upcoming" && "text-muted-ink")}>
                {step.label}
                <span className="sr-only">
                  {step.state === "done" ? " (done)" : step.state === "current" ? " (current)" : " (coming up)"}
                </span>
              </p>
              {step.at && <p className="text-xs text-muted-ink">{formatOrderTime(step.at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderTotals({
  subtotal,
  discount,
  shippingFee,
  total,
  couponCode,
}: {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
}) {
  return (
    <dl className="mt-3 space-y-2 border-t pt-4 text-sm">
      <Row label="Subtotal" value={formatINR(subtotal)} />
      {discount > 0 && <Row label={`Coupon${couponCode ? ` (${couponCode})` : ""}`} value={`−${formatINR(discount)}`} />}
      <Row label="Shipping" value={shippingFee === 0 ? "Free" : formatINR(shippingFee)} />
      <div className="flex justify-between border-t pt-3 text-base font-semibold">
        <dt>Total paid</dt>
        <dd>{formatINR(total)}</dd>
      </div>
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export function ShippingAddress({
  address,
}: {
  address: { name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string };
}) {
  return (
    <address className="text-sm leading-relaxed text-muted-ink not-italic">
      <span className="font-medium text-ink">{address.name}</span>
      <br />
      {address.line1}
      {address.line2 && (
        <>
          <br />
          {address.line2}
        </>
      )}
      <br />
      {address.city}, {address.state} {address.pincode}
      <br />
      {formatIndianPhone(address.phone)}
    </address>
  );
}
