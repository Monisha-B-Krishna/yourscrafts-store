"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRightIcon, LoaderCircleIcon, SearchIcon } from "lucide-react";
import type { SearchSuggestion } from "@/app/api/search/route";
import { track } from "@/lib/analytics/client";
import { formatINR } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const POPULAR = ["Diwali", "Bouquet", "Hamper", "Personalised", "Prints"];

/**
 * Header search with instant suggestions (ARIA combobox pattern).
 * Without JavaScript it is a plain form that opens /search?q=…
 */
export function SearchBox({
  variant = "dropdown",
  autoFocus = false,
  onNavigate,
  className,
}: {
  /** dropdown: suggestions float under the input (desktop). panel: they flow below it (mobile sheet). */
  variant?: "dropdown" | "panel";
  autoFocus?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const cache = useRef(new Map<string, SearchSuggestion[]>());

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [resultsFor, setResultsFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(variant === "panel");
  const [active, setActive] = useState(-1);

  const trimmed = query.trim();
  const showSuggestions = trimmed.length >= 2;

  useEffect(() => {
    if (trimmed.length < 2) return;
    const key = trimmed.toLowerCase();
    const cached = cache.current.get(key);
    if (cached) {
      setResults(cached);
      setResultsFor(trimmed);
      setActive(-1);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        const data = (await res.json()) as { results: SearchSuggestion[] };
        cache.current.set(key, data.results);
        setResults(data.results);
        setResultsFor(trimmed);
        setActive(-1);
      } catch {
        // aborted or offline — keep the previous suggestions
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 160);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  function navigate(href: string) {
    setOpen(variant === "panel");
    setActive(-1);
    inputRef.current?.blur();
    onNavigate?.();
    router.push(href);
  }

  function openSuggestion(s: SearchSuggestion) {
    track("search", { metadata: { query: trimmed, results: results.length, source: "suggestion" } });
    navigate(`/product/${s.slug}`);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active >= 0 && results[active]) return openSuggestion(results[active]);
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (event.key === "Escape") {
      if (variant === "dropdown") setOpen(false);
      setActive(-1);
    }
  }

  const expanded = open && showSuggestions;
  const upToDate = resultsFor === trimmed;

  return (
    <form
      role="search"
      action="/search"
      method="get"
      onSubmit={onSubmit}
      className={cn("relative w-full", className)}
    >
      <label htmlFor={`${id}-input`} className="sr-only">
        Search the shop
      </label>
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-ink"
        />
        <input
          ref={inputRef}
          id={`${id}-input`}
          name="q"
          type="search"
          autoComplete="off"
          autoFocus={autoFocus}
          enterKeyHint="search"
          placeholder="Search bouquets, hampers, art…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => variant === "dropdown" && setOpen(false)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? `${id}-option-${active}` : undefined}
          className="h-11 w-full rounded-full border border-input bg-white pr-10 pl-10 text-base text-ink placeholder:text-muted-ink sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {loading && (
          <LoaderCircleIcon
            aria-hidden="true"
            className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-ink"
          />
        )}
      </div>

      {/* Suggestions. mousedown is cancelled so clicking doesn't blur the input first. */}
      <div
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          variant === "dropdown"
            ? "absolute top-full left-0 z-50 mt-2 w-[28rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border bg-white shadow-xl"
            : "mt-4",
          !expanded && variant === "dropdown" && "hidden",
        )}
      >
        {expanded ? (
          <>
            <ul id={listId} role="listbox" aria-label="Suggestions" className="max-h-[60vh] overflow-y-auto py-1">
              {results.map((s, i) => (
                <li
                  key={s.id}
                  id={`${id}-option-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onClick={() => openSuggestion(s)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2",
                    i === active && "bg-peach-soft",
                  )}
                >
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-peach-soft">
                    {s.image && (
                      <Image
                        src={s.image.url}
                        alt=""
                        fill
                        sizes="48px"
                        unoptimized={s.image.url.endsWith(".svg")}
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{s.name}</span>
                    {s.category && <span className="block truncate text-xs text-muted-ink">{s.category}</span>}
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="font-semibold">
                      {s.hasVariants && <span className="font-normal text-muted-ink">From </span>}
                      {formatINR(s.price)}
                    </span>
                    {s.compareAtPrice !== null && (
                      <span className="block text-xs text-muted-ink line-through">{formatINR(s.compareAtPrice)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {upToDate && !loading && results.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-ink">No matches for “{trimmed}” yet. Try another word.</p>
            )}
            <Link
              href={`/search?q=${encodeURIComponent(trimmed)}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/search?q=${encodeURIComponent(trimmed)}`);
              }}
              className="flex items-center justify-between gap-2 border-t px-4 py-3 text-sm font-medium text-ink hover:bg-peach-soft"
            >
              See all results for “{trimmed}”
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </>
        ) : (
          variant === "panel" && (
            <div>
              <p className="text-xs tracking-wide text-muted-ink uppercase">Popular searches</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {POPULAR.map((term) => (
                  <li key={term}>
                    <button
                      type="button"
                      onClick={() => navigate(`/search?q=${encodeURIComponent(term)}`)}
                      className="inline-flex h-10 items-center rounded-full border border-input bg-white px-4 text-sm hover:bg-peach-soft"
                    >
                      {term}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
    </form>
  );
}
