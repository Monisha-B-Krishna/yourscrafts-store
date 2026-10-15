import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog";
import { compareAtPrice, fromPrice } from "@/lib/pricing";

export interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  price: number;
  compareAtPrice: number | null;
  hasVariants: boolean;
  image: { url: string; alt: string } | null;
}

/** Instant search suggestions for the header search box: /api/search?q=diwali */
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (query.length < 2) return NextResponse.json({ results: [] });

  const products = await searchProducts(query, 6);
  const results: SearchSuggestion[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category?.name ?? null,
    price: fromPrice(p),
    compareAtPrice: p.variants.length ? null : compareAtPrice(p),
    hasVariants: p.variants.length > 0,
    image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : null,
  }));

  return NextResponse.json(
    { results },
    // Same answer for everyone, so let the CDN cache it briefly.
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" } },
  );
}
