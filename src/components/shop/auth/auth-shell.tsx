import type { ReactNode } from "react";
import { HandDoodle } from "@/components/shop/icons";
import { isSupabaseConfigured } from "@/lib/env";
import { FormMessage } from "@/components/shop/form/field";

/** The centred card used by login, sign-up and password pages. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <div className="text-center">
        <HandDoodle className="mx-auto size-12" />
        <h1 className="mt-4 text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-muted-ink">{subtitle}</p>}
      </div>
      <div className="mt-8 rounded-3xl border border-border/70 bg-white p-5 shadow-[0_1px_2px_rgba(17,17,17,0.04)] sm:p-8">
        {isSupabaseConfigured() ? (
          children
        ) : (
          <FormMessage tone="info">
            Accounts switch on once the store is connected to its database. Until then, you can browse the shop and use
            the cart as a guest.
          </FormMessage>
        )}
      </div>
      {footer && <div className="mt-6 text-center text-sm text-muted-ink">{footer}</div>}
    </div>
  );
}
