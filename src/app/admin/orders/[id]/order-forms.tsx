"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { buttonClass } from "@/components/admin/ui";
import { fieldClass } from "@/components/shop/form/field";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/timeline";
import { cn } from "@/lib/utils";
import { saveOrderNotesAction, updateOrderAction } from "../actions";

const STATUSES: OrderStatus[] = ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"];
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { placed: "confirmed", confirmed: "packed", packed: "shipped", shipped: "delivered" };

export function UpdateOrderForm({
  orderId,
  status,
  courier,
  trackingId,
  emailOn,
}: {
  orderId: string;
  status: OrderStatus;
  courier: string;
  trackingId: string;
  emailOn: boolean;
}) {
  const router = useRouter();
  const [next, setNext] = useState<OrderStatus>(NEXT[status] ?? status);
  const [values, setValues] = useState({ courier, trackingId, note: "" });
  const [restock, setRestock] = useState(true);
  const [notify, setNotify] = useState(emailOn);
  const [pending, start] = useTransition();
  const ids = { status: useId(), courier: useId(), tracking: useId(), note: useId() };
  const changing = next !== status;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next === "cancelled" && changing && !window.confirm("Cancel this order? Remember to refund the customer in Razorpay.")) return;
    start(async () => {
      const res = await updateOrderAction({ orderId, status: next, ...values, restock, notify: notify && changing });
      if (res.ok) {
        toast.success(res.message ?? "Saved");
        setValues((v) => ({ ...v, note: "" }));
        router.refresh();
      } else toast.error(res.message);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label htmlFor={ids.status} className="mb-1.5 block text-sm font-medium">
          Status
        </label>
        <select id={ids.status} value={next} onChange={(e) => setNext(e.target.value as OrderStatus)} className={cn(fieldClass, "h-11")}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
              {s === status ? " (now)" : ""}
            </option>
          ))}
        </select>
        {NEXT[status] && next !== NEXT[status] && next !== status && next !== "cancelled" && (
          <p className="mt-1.5 text-xs text-muted-ink">Tip: the usual next step is {STATUS_LABELS[NEXT[status]!]}.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={ids.courier} className="mb-1.5 block text-sm font-medium">
            Courier
          </label>
          <input
            id={ids.courier}
            value={values.courier}
            onChange={(e) => setValues({ ...values, courier: e.target.value })}
            placeholder="e.g. Delhivery, India Post"
            maxLength={80}
            className={cn(fieldClass, "h-11")}
          />
        </div>
        <div>
          <label htmlFor={ids.tracking} className="mb-1.5 block text-sm font-medium">
            Tracking ID or link
          </label>
          <input
            id={ids.tracking}
            value={values.trackingId}
            onChange={(e) => setValues({ ...values, trackingId: e.target.value })}
            placeholder="ID, or paste the courier's tracking link"
            maxLength={300}
            className={cn(fieldClass, "h-11")}
          />
        </div>
      </div>
      {next === "shipped" && changing && !values.trackingId && (
        <p className="text-xs text-muted-ink">Add the tracking ID first, so the &ldquo;shipped&rdquo; email includes it.</p>
      )}

      {changing && (
        <div>
          <label htmlFor={ids.note} className="mb-1.5 block text-sm font-medium">
            Note for the history <span className="font-normal text-muted-ink">(optional, only you see it)</span>
          </label>
          <input
            id={ids.note}
            value={values.note}
            onChange={(e) => setValues({ ...values, note: e.target.value })}
            maxLength={500}
            className={cn(fieldClass, "h-11")}
          />
        </div>
      )}

      {changing && next === "cancelled" && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="mt-0.5 size-5 accent-ink" />
          <span>Put the items back in stock</span>
        </label>
      )}
      {changing && (
        <label className={cn("flex items-start gap-3 text-sm", !emailOn && "opacity-60")}>
          <input
            type="checkbox"
            checked={notify && emailOn}
            disabled={!emailOn}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-0.5 size-5 accent-ink"
          />
          <span>
            Email the customer about this update
            {!emailOn && <span className="block text-xs text-muted-ink">Emails aren&rsquo;t set up yet (see the setup guide).</span>}
          </span>
        </label>
      )}

      <div>
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving…" : changing ? `Mark as ${STATUS_LABELS[next]}` : "Save courier details"}
        </button>
      </div>
    </form>
  );
}

export function NotesForm({ orderId, notes }: { orderId: string; notes: string }) {
  const [value, setValue] = useState(notes);
  const [pending, start] = useTransition();
  const id = useId();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveOrderNotesAction({ orderId, notes: value });
          if (res.ok) toast.success(res.message ?? "Saved");
          else toast.error(res.message);
        });
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor={id} className="sr-only">
        Private notes
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Gift message, packing reminders, anything to remember…"
        className={cn(fieldClass, "h-auto py-3")}
      />
      <div>
        <button type="submit" disabled={pending || value === notes} className={buttonClass.secondary}>
          {pending ? "Saving…" : "Save notes"}
        </button>
      </div>
    </form>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={cn(buttonClass.primary, "print:hidden")}>
      Print
    </button>
  );
}
