"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { cartStore } from "@/lib/cart/store";
import { clearCartOwner } from "@/lib/cart/sync";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/orders", label: "Orders" },
] as const;

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="My account" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-2 lg:flex-col lg:gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-full px-4 py-2 text-sm font-medium transition-colors lg:rounded-xl lg:px-4 lg:py-3 lg:text-base",
                  active ? "bg-ink text-cream" : "bg-peach-soft/70 text-ink hover:bg-peach-soft lg:bg-transparent",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0 lg:mt-3 lg:border-t lg:pt-3">
          <SignOutButton />
        </li>
      </ul>
    </nav>
  );
}

/**
 * Signs out in the browser, clears this device's copy of the cart (it's safe in
 * the account), then reloads so every page forgets the customer.
 */
export function SignOutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const { error } = await createClient().auth.signOut({ scope: "local" });
    if (error) {
      setPending(false);
      toast.error("Couldn't sign you out. Please try again.");
      return;
    }
    cartStore.clear();
    clearCartOwner();
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className={cn(
        "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-ink transition-colors hover:bg-peach-soft hover:text-ink disabled:opacity-60 lg:w-full lg:rounded-xl lg:py-3 lg:text-base",
        className,
      )}
    >
      <LogOutIcon className="size-4" aria-hidden="true" />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
