"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/shop/form/field";
import { trackOrderAction, type TrackState } from "./actions";

const initial: TrackState = { message: null, fields: {}, values: { orderNumber: "", email: "" } };

export function TrackForm() {
  const [state, action, pending] = useActionState(trackOrderAction, initial);
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field
        label="Order number"
        name="orderNumber"
        placeholder="YCW-2026-00001"
        autoCapitalize="characters"
        autoComplete="off"
        defaultValue={state.values.orderNumber}
        hint="It's on your order confirmation."
        error={state.fields.orderNumber}
      />
      <Field
        label="Email used at checkout"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={state.values.email}
        error={state.fields.email}
      />
      <SubmitButton pending={pending} pendingText="Looking it up…" className="w-full">
        Track order
      </SubmitButton>
    </form>
  );
}
