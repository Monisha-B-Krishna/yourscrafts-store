"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/client";

/** Logs a page_view on every page change. The referring site is sent once per visit. */
export function PageViewTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    const isFirst = last.current === null;
    last.current = pathname;

    let referrerHost: string | undefined;
    if (isFirst && document.referrer) {
      try {
        const host = new URL(document.referrer).hostname;
        if (host && host !== window.location.hostname) referrerHost = host;
      } catch {
        // ignore malformed referrers
      }
    }
    track("page_view", { metadata: { path: pathname, ...(referrerHost ? { referrer_host: referrerHost } : {}) } });
  }, [pathname]);

  return null;
}

export function ProductViewTracker({ productId }: { productId: string }) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current === productId) return;
    last.current = productId;
    track("product_view", { productId });
  }, [productId]);
  return null;
}

export function SearchTracker({ query, results }: { query: string; results: number }) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!query || last.current === query) return;
    last.current = query;
    track("search", { metadata: { query, results, source: "results_page" } });
  }, [query, results]);
  return null;
}
