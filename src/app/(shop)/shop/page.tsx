import type { Metadata } from "next";
import Link from "next/link";
import { FiltersSheet } from "@/components/shop/filters-sheet";
import { Pagination } from "@/components/shop/pagination";
import { ProductGrid } from "@/components/shop/product-card";
import { ActiveFilters, ShopFilters } from "@/components/shop/shop-filters";
import { SortSelect } from "@/components/shop/sort-select";
import { getActiveCollections, getCategories, listProducts } from "@/lib/catalog";
import { parseShopParams, shopHref } from "@/lib/shop-query";
import { cn } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const query = parseShopParams(await searchParams);
  const category = (await getCategories()).find((c) => c.slug === query.category);
  const edition = query.collection ? (await getActiveCollections()).find((c) => c.slug === query.collection) : undefined;
  return {
    title: edition ? edition.name : category ? category.name : "Shop all",
    // One address per listing, whatever filters or page are chosen.
    alternates: {
      canonical: edition ? `/shop?collection=${edition.slug}` : category ? `/shop?category=${category.slug}` : "/shop",
    },
    description: category
      ? `Shop handmade ${category.name.toLowerCase()} by Yours Crafts Woman.`
      : "Shop handmade gifts, hampers, decor and original art by Yours Crafts Woman.",
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const query = parseShopParams(raw);
  const [categories, collections, { items, total }] = await Promise.all([
    getCategories(),
    getActiveCollections(),
    listProducts(query),
  ]);

  const category = categories.find((c) => c.slug === query.category);
  const edition = query.collection ? collections.find((c) => c.slug === query.collection) : undefined;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const activeFilters =
    (query.category ? 1 : 0) +
    (query.minPrice !== undefined || query.maxPrice !== undefined ? 1 : 0) +
    (query.inStock ? 1 : 0);

  // Canonical params (validated) to carry through pagination links.
  const keep: Record<string, string> = {};
  if (query.category) keep.category = query.category;
  if (query.collection) keep.collection = query.collection;
  if (query.minPrice !== undefined) keep.min = String(query.minPrice / 100);
  if (query.maxPrice !== undefined) keep.max = String(query.maxPrice / 100);
  if (query.inStock) keep.stock = "1";
  if (query.sort !== "new") keep.sort = query.sort;

  const chipClass = "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm whitespace-nowrap";

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      {edition && (
        <p className="mb-2 text-sm tracking-widest text-peach-deep uppercase">Edition</p>
      )}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl">
        {edition ? edition.name : category ? category.name : "Shop all"}
      </h1>
      {edition?.description && <p className="mt-3 max-w-2xl text-muted-ink">{edition.description}</p>}
      {query.collection && (
        <Link href={shopHref({ ...query, collection: undefined, page: 1 })} className="mt-2 inline-block text-sm underline underline-offset-2">
          {edition ? "See everything in the shop" : "This edition has ended. See everything in the shop"}
        </Link>
      )}
      <p className="mt-2 text-muted-ink">
        {total} {total === 1 ? "piece" : "pieces"}, all handmade
      </p>

      {/* Category chips: scroll sideways on phones */}
      <nav aria-label="Categories" className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2 pb-2">
          <li>
            <Link
              href={shopHref({ ...query, category: undefined })}
              aria-current={!query.category ? "page" : undefined}
              className={cn(chipClass, !query.category ? "border-ink bg-ink text-cream" : "bg-white hover:bg-peach-soft")}
            >
              All
            </Link>
          </li>
          {categories.map((c) => {
            const active = c.slug === query.category;
            return (
              <li key={c.id}>
                <Link
                  href={shopHref({ ...query, category: c.slug })}
                  aria-current={active ? "page" : undefined}
                  className={cn(chipClass, active ? "border-ink bg-ink text-cream" : "bg-white hover:bg-peach-soft")}
                >
                  {c.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-28 rounded-2xl bg-white/70 p-5 ring-1 ring-border">
            <ShopFilters categories={categories} query={query} idPrefix="desktop" autoSubmit />
          </div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <FiltersSheet activeCount={activeFilters}>
              <ShopFilters categories={categories} query={query} idPrefix="mobile" />
            </FiltersSheet>
            <div className="ml-auto">
              <SortSelect value={query.sort} />
            </div>
          </div>

          <ActiveFilters query={query} categories={categories} />

          {items.length > 0 ? (
            <>
              <h2 className="sr-only">Products</h2>
              <ProductGrid products={items} priorityCount={4} />
            </>
          ) : (
            <div className="rounded-2xl bg-peach-soft/60 px-6 py-16 text-center">
              <h2 className="text-2xl">Nothing matches those filters</h2>
              <p className="mt-2 text-muted-ink">Try a wider price range or another category.</p>
              <Link
                href="/shop"
                className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-cream hover:bg-ink/85"
              >
                See everything
              </Link>
            </div>
          )}

          <Pagination page={query.page} totalPages={totalPages} params={keep} />
        </div>
      </div>
    </div>
  );
}
