"use client";

import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon } from "lucide-react";
import { Field, FormMessage, SubmitButton, fieldClass } from "@/components/shop/form/field";
import { cn } from "@/lib/utils";
import {
  addressSchema,
  INDIAN_STATES,
  type Address,
  type AddressInput,
  type FieldErrors,
} from "@/lib/validation/account";

export type SaveResult = { ok: true } | { ok: false; message: string; fields?: FieldErrors };

export const EMPTY_ADDRESS: AddressInput = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "" as AddressInput["state"],
  pincode: "",
  isDefault: false,
};

/**
 * An Indian delivery address: name, mobile, two address lines, city, state
 * (dropdown) and 6-digit PIN code. Reused by checkout in Phase 4.
 */
export function AddressForm({
  initial = EMPTY_ADDRESS,
  onSave,
  onCancel,
  submitLabel = "Save address",
  showDefaultToggle = true,
  defaultLocked = false,
}: {
  initial?: AddressInput;
  onSave: (address: Address) => Promise<SaveResult>;
  onCancel?: () => void;
  submitLabel?: string;
  showDefaultToggle?: boolean;
  /** The current default can't be un-ticked (there must always be one). */
  defaultLocked?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<AddressInput, unknown, Address>({ resolver: zodResolver(addressSchema), defaultValues: initial });
  const { errors } = form.formState;
  const stateId = useId();
  const defaultId = useId();

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      setError(null);
      const res = await onSave(values);
      if (!res.ok) {
        setError(res.message);
        for (const [name, message] of Object.entries(res.fields ?? {})) {
          form.setError(name as keyof AddressInput, { message });
        }
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" autoComplete="shipping name" error={errors.name?.message} {...form.register("name")} />
        <Field
          label="Mobile number"
          type="tel"
          autoComplete="shipping tel-national"
          inputMode="tel"
          prefix="+91"
          placeholder="98765 43210"
          hint="The courier may call this number."
          error={errors.phone?.message}
          {...form.register("phone")}
        />
      </div>
      <Field
        label="House / flat number and street"
        autoComplete="shipping address-line1"
        error={errors.line1?.message}
        {...form.register("line1")}
      />
      <Field
        label="Area, landmark"
        optional
        autoComplete="shipping address-line2"
        error={errors.line2?.message}
        {...form.register("line2")}
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label="City / town"
          autoComplete="shipping address-level2"
          error={errors.city?.message}
          {...form.register("city")}
        />
        <div>
          <label htmlFor={stateId} className="mb-1.5 block text-sm font-medium text-ink">
            State
          </label>
          <div className="relative">
            <select
              id={stateId}
              autoComplete="shipping address-level1"
              aria-invalid={errors.state ? true : undefined}
              aria-describedby={errors.state ? `${stateId}-error` : undefined}
              className={cn(fieldClass, "appearance-none pr-10")}
              {...form.register("state")}
            >
              <option value="" disabled>
                Choose…
              </option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-ink"
              aria-hidden="true"
            />
          </div>
          {errors.state && (
            <p id={`${stateId}-error`} className="mt-1.5 text-sm text-destructive">
              {errors.state.message}
            </p>
          )}
        </div>
        <Field
          label="PIN code"
          inputMode="numeric"
          autoComplete="shipping postal-code"
          maxLength={7}
          placeholder="560001"
          error={errors.pincode?.message}
          {...form.register("pincode")}
        />
      </div>
      {showDefaultToggle && defaultLocked && <p className="text-sm text-muted-ink">This is your default address.</p>}
      {showDefaultToggle && !defaultLocked && (
        <div className="flex items-center gap-3">
          <input
            id={defaultId}
            type="checkbox"
            className="size-5 rounded border-input accent-ink"
            {...form.register("isDefault")}
          />
          <label htmlFor={defaultId} className="text-sm">
            Make this my default address
          </label>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton pending={pending} pendingText="Saving…">
          {submitLabel}
        </SubmitButton>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-12 items-center justify-center rounded-full border border-ink/20 px-7 font-medium hover:bg-peach-soft"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
