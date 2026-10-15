import type { Product } from "@/lib/types";

/** Lower-cased words of a search query (letters and digits only), at most 8. */
export function searchWords(query: string): string[] {
  return query
    .toLowerCase()
    .slice(0, 100)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8);
}

function wordsOf(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/**
 * In-memory version of the database's search_products() for demo mode:
 * prefix matching on name, tags, category and description. Products matching
 * every word come first; if none do, products matching any word are returned.
 */
export function searchInMemory(products: Product[], query: string, limit = 24): Product[] {
  const terms = searchWords(query);
  if (terms.length === 0) return [];

  const fields = (p: Product) => [
    { words: wordsOf(p.name), weight: 4 },
    { words: p.tags.flatMap(wordsOf), weight: 2 },
    { words: wordsOf(p.category?.name ?? ""), weight: 2 },
    { words: wordsOf(p.description), weight: 1 },
  ];

  const scored = products.map((p) => {
    let score = 0;
    let matched = 0;
    for (const term of terms) {
      const best = Math.max(
        0,
        ...fields(p).map((f) => (f.words.some((w) => w.startsWith(term)) ? f.weight : 0)),
      );
      if (best > 0) matched += 1;
      score += best;
    }
    return { p, score, matched };
  });

  const all = scored.filter((s) => s.matched === terms.length);
  const pool = all.length > 0 ? all : scored.filter((s) => s.matched > 0);

  return pool
    .sort((a, b) => b.score - a.score || b.p.sales_count - a.p.sales_count || a.p.name.localeCompare(b.p.name))
    .slice(0, limit)
    .map((s) => s.p);
}
