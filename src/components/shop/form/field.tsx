"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Input styling shared by every store form: tall, rounded and easy to tap. */
export const fieldClass =
  "block h-12 w-full rounded-xl border border-input bg-white px-4 text-base text-ink transition-colors outline-none placeholder:text-muted-ink/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:bg-peach-soft/40 disabled:text-muted-ink aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15";

type FieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Shown after the label, e.g. a "Forgot password?" link. */
  aside?: ReactNode;
  prefix?: string;
  optional?: boolean;
};

/** A labelled text input with its hint and error message wired up for screen readers. */
export function Field({ label, error, hint, aside, prefix, optional, className, ...input }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {optional && <span className="font-normal text-muted-ink"> (optional)</span>}
        </label>
        {aside}
      </div>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base text-muted-ink">
            {prefix}
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(fieldClass, prefix && "pl-14")}
          {...input}
        />
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-muted-ink">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** A message box at the top of a form (errors, or "check your email"). */
export function FormMessage({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-2xl px-4 py-3 text-sm leading-relaxed",
        tone === "error" && "border border-destructive/25 bg-destructive/5 text-destructive",
        tone === "success" && "bg-peach-soft text-ink",
        tone === "info" && "bg-peach-soft/60 text-ink",
      )}
    >
      {children}
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingText,
  className,
  variant = "ink",
}: {
  pending: boolean;
  children: ReactNode;
  pendingText?: string;
  className?: string;
  variant?: "ink" | "peach" | "outline";
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-full px-7 font-medium transition-colors disabled:cursor-wait disabled:opacity-70",
        variant === "ink" && "bg-ink text-cream hover:bg-ink/85",
        variant === "peach" && "bg-peach text-ink hover:bg-peach/85",
        variant === "outline" && "border border-ink/20 bg-white text-ink hover:bg-peach-soft",
        className,
      )}
    >
      {pending ? (pendingText ?? "Please wait…") : children}
    </button>
  );
}
