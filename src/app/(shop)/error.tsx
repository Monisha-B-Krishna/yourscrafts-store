"use client";

import Link from "next/link";
import { useEffect } from "react";
import { HandDoodle } from "@/components/shop/icons";

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <HandDoodle className="size-16" />
      <h1 className="mt-6 text-4xl sm:text-5xl">Oops, a loose thread</h1>
      <p className="mt-4 text-muted-ink">
        Something went wrong while loading this page. Please try again in a moment.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 font-medium text-cream hover:bg-ink/85"
        >
          Try again
        </button>
        <Link href="/" className="inline-flex h-12 items-center justify-center rounded-full border border-ink/20 px-7 font-medium hover:bg-peach-soft">
          Go home
        </Link>
      </div>
    </div>
  );
}
