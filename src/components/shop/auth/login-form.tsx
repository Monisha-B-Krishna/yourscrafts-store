"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailIcon } from "lucide-react";
import {
  magicLinkAction,
  resendConfirmationAction,
  signInAction,
  type AuthResult,
} from "@/app/(shop)/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/shop/form/field";
import { emailOnlySchema, signInSchema, type EmailOnlyInput, type SignInInput } from "@/lib/validation/account";
import { cn } from "@/lib/utils";

type Mode = "password" | "link";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("password");
  return (
    <div>
      <div role="group" aria-label="How to sign in" className="mb-6 grid grid-cols-2 rounded-full bg-peach-soft/70 p-1">
        {(
          [
            ["password", "Password"],
            ["link", "Email me a link"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "h-10 rounded-full text-sm font-medium transition-colors",
              mode === value ? "bg-white text-ink shadow-sm" : "text-muted-ink hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "password" ? <PasswordForm next={next} /> : <MagicLinkForm next={next} />}
    </div>
  );
}

function PasswordForm({ next }: { next: string }) {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [resent, setResent] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<SignInInput>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      setResent(false);
      const res = await signInAction(values, next);
      setResult(res);
      // A full page load, so the header, cart and every page see the new login.
      if (res.ok && res.status === "signed_in") window.location.assign(res.next);
    }),
  );

  function resend() {
    startTransition(async () => {
      const res = await resendConfirmationAction({ email: form.getValues("email") });
      setResent(res.ok);
      if (!res.ok) setResult(res);
    });
  }

  const failed = result && !result.ok ? result : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {failed && (
        <FormMessage tone="error">
          {failed.message}
          {failed.needsConfirmation && !resent && (
            <>
              {" "}
              <button type="button" onClick={resend} className="font-medium underline underline-offset-2">
                Send the link again
              </button>
            </>
          )}
        </FormMessage>
      )}
      {resent && <FormMessage tone="success">Done! A fresh confirmation link is on its way to your inbox.</FormMessage>}
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...form.register("email")}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        aside={
          <Link href="/forgot-password" className="text-sm text-peach-deep underline-offset-2 hover:underline">
            Forgot password?
          </Link>
        }
        {...form.register("password")}
      />
      <SubmitButton pending={pending} pendingText="Signing in…" className="mt-1 w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}

function MagicLinkForm({ next }: { next: string }) {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<EmailOnlyInput>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: "" } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => setResult(await magicLinkAction(values, next))),
  );

  if (result?.ok) {
    return (
      <div className="text-center">
        <MailIcon className="mx-auto size-10 text-peach-deep" aria-hidden="true" />
        <h2 className="mt-3 text-2xl">Check your inbox</h2>
        <p className="mt-2 text-muted-ink" role="status">
          If <strong className="font-medium text-ink">{form.getValues("email")}</strong> has an account, we’ve sent it
          a sign-in link. It works once and expires in an hour.
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="mt-5 text-sm text-peach-deep underline underline-offset-2"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {result && !result.ok && <FormMessage tone="error">{result.message}</FormMessage>}
      <p className="text-sm text-muted-ink">No password needed. We’ll email you a link that signs you straight in.</p>
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...form.register("email")}
      />
      <SubmitButton pending={pending} pendingText="Sending…" className="w-full">
        Email me a sign-in link
      </SubmitButton>
    </form>
  );
}
