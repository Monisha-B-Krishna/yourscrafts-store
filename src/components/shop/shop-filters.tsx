import Link from "next/link";
import type { ProductQuery } from "@/lib/shop-query";
import type { Category } from "@/lib/types";

const fieldClass =
  "h-11 w-full rounded-xl border border-input bg-white px-3 text-base text-ink sm:text-sm";

/**
 * Plain GET form, so filters work even before JavaScript loads and every
 * filtered view has a shareable URL.
 */
export function ShopFilters({
  categories,
  query,
  idPrefix,
}: {
  categories: Category[];
  query: ProductQuery;
  idPrefix: string;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <form action="/shop" method="get" className="flex flex-col gap-6">
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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Price (₹)</legend>
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
            defaultValue={query.minPrice === undefined ? "" : query.minPrice / 100}
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
            defaultValue={query.maxPrice === undefined ? "" : query.maxPrice / 100}
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
          href="/shop"
          className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm text-muted-ink underline-offset-4 hover:text-ink hover:underline"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}
