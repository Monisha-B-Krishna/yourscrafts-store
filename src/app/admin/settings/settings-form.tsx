"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { buttonClass } from "@/components/admin/ui";
import { Field, FormMessage } from "@/components/shop/form/field";
import type { SettingsFormInput } from "@/lib/admin/forms";
import { saveSettingsAction } from "./actions";

export function SettingsForm({ initial }: { initial: SettingsFormInput }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof SettingsFormInput, value: string) => setV((x) => ({ ...x, [k]: value }));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveSettingsAction(v);
          if (res.ok) {
            setErrors({});
            setMessage(null);
            toast.success("Settings saved. The shop is updated.");
            router.refresh();
          } else {
            setMessage(res.message);
            setErrors(res.fields ?? {});
          }
        });
      }}
      className="flex flex-col gap-6"
    >
      {message && <FormMessage tone="error">{message}</FormMessage>}
      <section className="rounded-3xl border border-border/70 bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-xl sm:text-2xl">Contact</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="WhatsApp number" type="tel" inputMode="tel" prefix="+" hint="Custom orders and help messages go here. Include 91." value={v.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} error={errors.whatsappNumber} />
          <Field label="Instagram link" type="url" value={v.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} error={errors.instagramUrl} />
        </div>
      </section>
      <section className="rounded-3xl border border-border/70 bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-xl sm:text-2xl">Shipping</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Shipping charge" prefix="₹" inputMode="decimal" hint="Charged on orders below the free-shipping amount" value={v.flatShippingRate} onChange={(e) => set("flatShippingRate", e.target.value)} error={errors.flatShippingRate} />
          <Field label="Free shipping from" prefix="₹" inputMode="decimal" hint="Orders of this much or more ship free" value={v.freeShippingThreshold} onChange={(e) => set("freeShippingThreshold", e.target.value)} error={errors.freeShippingThreshold} />
          <Field label="Change or cancel window (hours)" inputMode="numeric" hint="How long after ordering customers may ask to change or cancel" value={v.cancellationWindowHours} onChange={(e) => set("cancellationWindowHours", e.target.value)} error={errors.cancellationWindowHours} />
        </div>
      </section>
      <section className="rounded-3xl border border-border/70 bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-xl sm:text-2xl">Announcement bar</h2>
        <Field label="Text at the very top of every page" optional hint="Leave empty to hide the bar. Under 160 characters." maxLength={160} value={v.announcementText} onChange={(e) => set("announcementText", e.target.value)} error={errors.announcementText} />
      </section>
      <div>
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
