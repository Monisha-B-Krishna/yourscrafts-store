import Link from "next/link";
import { PRICE_PRESETS, shopHref, type ProductQuery } from "@/lib/shop-query";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FilterForm } from "./filter-form";

const fieldClass =
  "h-11 w-full rounded-xl border border-input bg-white px-3 text-base text-ink sm:text-sm";

/**
 * Filter form. It is a plain GET form underneath, so filters work even before
 * JavaScript loads and every filtered view has a shareable URL.
 */
export function ShopFilters({
  categories,
  query,
  idPrefix,
  autoSubmit = false,
}: {
  categories: Category[];
  query: ProductQuery;
  idPrefix: string;
  autoSubmit?: boolean;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const toRupees = (paise?: number) => (paise === undefined ? undefined : paise / 100);
  const activePreset = PRICE_PRESETS.find(
    (p) => p.min === toRupees(query.minPrice) && p.max === toRupees(query.maxPrice),
  );

  return (
    // Keyed by the current filters so the fields reset after each navigation.
    <FilterForm key={shopHref(query)} autoSubmit={autoSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="sort" value={query.sort} />

      <div className="flex flex-col gap-2">
        <label htmlFor={id("category")} className="text-sm font-semibold">
          Category
        </label>
        <select id={id("category")} name="category" defaultValue={query.category ?? ""} className={fieldClass}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold">Price (₹)</legend>
        <ul className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((preset) => {
            const active = preset === activePreset;
            return (
              <li key={preset.label}>
                <Link
                  href={shopHref({
                    ...query,
                    minPrice: preset.min === undefined ? undefined : preset.min * 100,
                    maxPrice: preset.max === undefined ? undefined : preset.max * 100,
                  })}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-3 text-xs whitespace-nowrap",
                    active ? "border-ink bg-ink text-cream" : "border-input bg-white hover:bg-peach-soft",
                  )}
                >
                  {preset.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-2">
          <label htmlFor={id("min")} className="sr-only">
            Minimum price in rupees
          </label>
          <input
            id={id("min")}
            name="min"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min"
            defaultValue={toRupees(query.minPrice) ?? ""}
            className={fieldClass}
          />
          <span aria-hidden="true" className="text-muted-ink">
            –
          </span>
          <label htmlFor={id("max")} className="sr-only">
            Maximum price in rupees
          </label>
          <input
            id={id("max")}
            name="max"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max"
            defaultValue={toRupees(query.maxPrice) ?? ""}
            className={fieldClass}
          />
        </div>
      </fieldset>

      <label htmlFor={id("stock")} className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          id={id("stock")}
          type="checkbox"
          name="stock"
          value="1"
          defaultChecked={query.inStock}
          className="size-5 rounded accent-[var(--ink)]"
        />
        In stock only
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-cream hover:bg-ink/85"
        >
          Apply filters
        </button>
        <Link
          href={shopHref({ inStock: false, sort: query.sort })}
          scroll={false}
          className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm text-muted-ink underline-offset-4 hover:text-ink hover:underline"
        >
          Clear
        </Link>
      </div>
    </FilterForm>
  );
}

/** Removable chips for the filters currently applied. */
export function ActiveFilters({ query, categories }: { query: ProductQuery; categories: Category[] }) {
  const chips: { label: string; href: string }[] = [];
  const category = categories.find((c) => c.slug === query.category);
  if (category) chips.push({ label: category.name, href: shopHref({ ...query, category: undefined }) });

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const fmt = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
    const label =
      query.minPrice !== undefined && query.maxPrice !== undefined
        ? `${fmt(query.minPrice)} – ${fmt(query.maxPrice)}`
        : query.minPrice !== undefined
          ? `From ${fmt(query.minPrice)}`
          : `Up to ${fmt(query.maxPrice!)}`;
    chips.push({ label, href: shopHref({ ...query, minPrice: undefined, maxPrice: undefined }) });
  }
  if (query.inStock) chips.push({ label: "In stock", href: shopHref({ ...query, inStock: false }) });

  if (chips.length === 0) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-ink">Filtered by:</span>
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          scroll={false}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-peach-soft pr-2 pl-3 text-sm text-ink hover:bg-peach/60"
        >
          {chip.label}
          <span aria-hidden="true" className="text-base leading-none">
            ×
          </span>
          <span className="sr-only">(remove filter)</span>
        </Link>
      ))}
      {chips.length > 1 && (
        <Link
          href={shopHref({ inStock: false, sort: query.sort })}
          scroll={false}
          className="ml-1 text-sm text-muted-ink underline underline-offset-4 hover:text-ink"
        >
          Clear all
        </Link>
      )}
    </div>
  );
}
