"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailIcon } from "lucide-react";
import { forgotPasswordAction, updatePasswordAction, type AuthResult } from "@/app/(shop)/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/shop/form/field";
import {
  emailOnlySchema,
  newPasswordFormSchema,
  type EmailOnlyInput,
  type NewPasswordInput,
} from "@/lib/validation/account";

export function ForgotPasswordForm() {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<EmailOnlyInput>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: "" } });

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => setResult(await forgotPasswordAction(values))),
  );

  if (result?.ok) {
    return (
      <div className="text-center">
        <MailIcon className="mx-auto size-10 text-peach-deep" aria-hidden="true" />
        <h2 className="mt-3 text-2xl">Check your inbox</h2>
        <p className="mt-2 text-muted-ink" role="status">
          If <strong className="font-medium text-ink">{form.getValues("email")}</strong> has an account, we’ve sent a
          link to choose a new password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {result && !result.ok && <FormMessage tone="error">{result.message}</FormMessage>}
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={form.formState.errors.email?.message}
        {...form.register("email")}
      />
      <SubmitButton pending={pending} pendingText="Sending…" className="w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}

/** Choose a new password. Used after a reset link, and on My account. */
export function NewPasswordForm({ submitLabel = "Save new password", afterSave }: { submitLabel?: string; afterSave?: "account" | "inline" }) {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordFormSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await updatePasswordAction(values);
      setResult(res);
      if (res.ok) form.reset();
    }),
  );

  if (result?.ok && afterSave === "account") {
    return (
      <div className="text-center">
        <h2 className="text-2xl">Password updated</h2>
        <p className="mt-2 text-muted-ink" role="status">
          You’re signed in and all set.
        </p>
        <Link
          href="/account"
          className="mt-5 inline-flex h-12 items-center rounded-full bg-ink px-7 font-medium text-cream hover:bg-ink/85"
        >
          Go to my account
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {result && !result.ok && <FormMessage tone="error">{result.message}</FormMessage>}
      {result?.ok && <FormMessage tone="success">Your password has been updated.</FormMessage>}
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters, with letters and numbers."
        error={errors.password?.message}
        {...form.register("password")}
      />
      <Field
        label="Type it again"
        type="password"
        autoComplete="new-password"
        error={errors.confirm?.message}
        {...form.register("confirm")}
      />
      <SubmitButton pending={pending} pendingText="Saving…" className="w-full sm:w-auto sm:self-start">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
