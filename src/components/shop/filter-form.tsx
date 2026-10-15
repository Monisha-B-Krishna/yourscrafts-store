"use client";

import { useRouter } from "next/navigation";

/**
 * Enhances the plain GET filter form: submits without a full page reload,
 * drops empty fields from the URL and, when `autoSubmit` is on, applies
 * dropdown/checkbox changes immediately. Without JavaScript the browser
 * simply submits the form as normal.
 */
export function FilterForm({
  autoSubmit = false,
  className,
  children,
}: {
  autoSubmit?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function go(form: HTMLFormElement) {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      const text = String(value).trim();
      if (!text) continue;
      if (key === "sort" && text === "new") continue;
      params.set(key, text);
    }
    const qs = params.toString();
    router.push(qs ? `/shop?${qs}` : "/shop", { scroll: false });
  }

  return (
    <form
      action="/shop"
      method="get"
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        go(event.currentTarget);
      }}
      onChange={(event) => {
        if (!autoSubmit) return;
        const target: EventTarget = event.target;
        if (target instanceof HTMLSelectElement || (target instanceof HTMLInputElement && target.type === "checkbox")) {
          go(event.currentTarget);
        }
      }}
    >
      {children}
    </form>
  );
}
