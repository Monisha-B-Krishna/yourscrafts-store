"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileAction, type AccountResult } from "@/app/(shop)/account/actions";
import { Field, FormMessage, SubmitButton } from "@/components/shop/form/field";
import { profileSchema, type ProfileInput } from "@/lib/validation/account";

export function ProfileForm({ email, fullName, phone }: { email: string; fullName: string; phone: string }) {
  const [result, setResult] = useState<AccountResult | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: { fullName, phone } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await updateProfileAction(values);
      setResult(res);
      if (!res.ok && res.fields) {
        for (const [name, message] of Object.entries(res.fields)) form.setError(name as keyof ProfileInput, { message });
      }
      if (res.ok) form.reset(values);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {result && !result.ok && <FormMessage tone="error">{result.message}</FormMessage>}
      {result?.ok && <FormMessage tone="success">Saved! Your details are up to date.</FormMessage>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" autoComplete="name" error={errors.fullName?.message} {...form.register("fullName")} />
        <Field
          label="Mobile number"
          type="tel"
          autoComplete="tel-national"
          inputMode="tel"
          prefix="+91"
          placeholder="98765 43210"
          error={errors.phone?.message}
          {...form.register("phone")}
        />
      </div>
      <Field
        label="Email"
        type="email"
        value={email}
        readOnly
        disabled
        hint="This is the email you sign in with."
      />
      <SubmitButton pending={pending} pendingText="Saving…" className="w-full sm:w-auto sm:self-start">
        Save changes
      </SubmitButton>
    </form>
  );
}
