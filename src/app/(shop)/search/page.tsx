import type { Metadata } from "next";
import Link from "next/link";
import { WhatsAppIcon } from "@/components/shop/icons";
import { ProductGrid } from "@/components/shop/product-card";
import { SearchTracker } from "@/components/shop/trackers";
import { getCategories, getSettings, searchProducts } from "@/lib/catalog";
import { CUSTOM_ORDER_MESSAGE, whatsappLink } from "@/lib/whatsapp";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const readQuery = (sp: Record<string, string | string[] | undefined>) => {
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return (raw ?? "").trim().slice(0, 100);
};

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const q = readQuery(await searchParams);
  return {
    title: q ? `Search: ${q}` : "Search",
    robots: { index: false },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const q = readQuery(await searchParams);
  const [results, categories, settings] = await Promise.all([
    q ? searchProducts(q, 48) : Promise.resolve([]),
    getCategories(),
    getSettings(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl">{q ? <>Results for “{q}”</> : "Search the shop"}</h1>

      {/* Works with or without JavaScript. */}
      <form action="/search" method="get" role="search" className="mt-6 flex max-w-xl gap-2">
        <label htmlFor="search-page-input" className="sr-only">
          Search the shop
        </label>
        <input
          id="search-page-input"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Try “diwali”, “hamper” or “print”"
          className="h-12 min-w-0 flex-1 rounded-full border border-input bg-white px-5 text-base"
        />
        <button
          type="submit"
          className="inline-flex h-12 shrink-0 items-center rounded-full bg-ink px-6 font-medium text-cream hover:bg-ink/85"
        >
          Search
        </button>
      </form>

      {q && (
        <p className="mt-6 text-muted-ink" aria-live="polite">
          {results.length === 0
            ? "No matches found."
            : `${results.length} ${results.length === 1 ? "piece" : "pieces"} found`}
        </p>
      )}

      {results.length > 0 ? (
        <div className="mt-6">
          <ProductGrid products={results} priorityCount={4} />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-peach-soft/60 p-6 sm:p-8">
            <h2 className="text-2xl">Browse by category</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm ring-1 ring-border hover:bg-cream"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-ink p-6 text-cream sm:p-8">
            <h2 className="text-2xl">Can’t find it?</h2>
            <p className="mt-2 text-cream/80">Monisha can make it for you. Describe your idea on WhatsApp.</p>
            <a
              href={whatsappLink(settings.whatsapp_number, CUSTOM_ORDER_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-peach px-5 font-medium text-ink hover:bg-peach/85"
            >
              <WhatsAppIcon className="size-5" />
              Request a custom piece
            </a>
          </div>
        </div>
      )}

      {q && <SearchTracker query={q} results={results.length} />}
    </div>
  );
}
