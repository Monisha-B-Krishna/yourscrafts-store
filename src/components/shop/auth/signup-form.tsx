"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheckIcon } from "lucide-react";
import { signUpAction, type AuthResult } from "@/app/(shop)/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/shop/form/field";
import { signUpSchema, type SignUpInput } from "@/lib/validation/account";

export function SignUpForm({ next }: { next: string }) {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await signUpAction(values, next);
      setResult(res);
      if (!res.ok && res.fields) {
        for (const [name, message] of Object.entries(res.fields)) {
          form.setError(name as keyof SignUpInput, { message });
        }
      }
      if (res.ok && res.status === "signed_in") window.location.assign(res.next);
    }),
  );

  if (result?.ok && result.status === "check_email") {
    return (
      <div className="text-center">
        <MailCheckIcon className="mx-auto size-10 text-peach-deep" aria-hidden="true" />
        <h2 className="mt-3 text-2xl">One last step</h2>
        <p className="mt-2 text-muted-ink" role="status">
          We’ve sent a link to <strong className="font-medium text-ink">{form.getValues("email")}</strong>. Tap it to
          confirm your email and you’re in.
        </p>
        <p className="mt-4 text-sm text-muted-ink">
          Nothing there? Check your spam folder, or{" "}
          <Link href="/login" className="text-peach-deep underline underline-offset-2">
            sign in
          </Link>{" "}
          if you already have an account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {result && !result.ok && <FormMessage tone="error">{result.message}</FormMessage>}
      <Field label="Your name" autoComplete="name" error={errors.fullName?.message} {...form.register("fullName")} />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...form.register("email")}
      />
      <Field
        label="Mobile number"
        type="tel"
        autoComplete="tel-national"
        inputMode="tel"
        prefix="+91"
        placeholder="98765 43210"
        hint="For delivery updates. We never share it."
        error={errors.phone?.message}
        {...form.register("phone")}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters, with letters and numbers."
        error={errors.password?.message}
        {...form.register("password")}
      />
      <SubmitButton pending={pending} pendingText="Creating your account…" className="mt-1 w-full">
        Create account
      </SubmitButton>
    </form>
  );
}
