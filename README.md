# Yours Crafts Woman: online store

The online shop for **Yours Crafts Woman** (@yours.craftswoman), selling handmade gifts, chocolate
bouquets and original art. Built with Next.js 15, Tailwind CSS, shadcn/ui and Supabase.

- **Build spec:** [`CLAUDE.md`](CLAUDE.md)
- **Run it on your laptop:** [`docs/setup.md`](docs/setup.md)
- **Database and analytics reference:** [`docs/data-dictionary.md`](docs/data-dictionary.md)

```bash
npm install
npm run dev          # http://localhost:3000 (demo mode until Supabase keys are added)
```

## Where things live

| Path | What's there |
|---|---|
| `src/app/(shop)/` | Customer pages: home, shop, product, search, cart, saved items, artist |
| `src/app/api/` | `search` (instant suggestions) and `events` (analytics) endpoints |
| `src/components/shop/` | Header, search box, product gallery, cart, filters, cards |
| `src/components/ui/` | shadcn/ui building blocks |
| `src/content/artist.ts` | Text and photos for the About the Artist page |
| `src/lib/` | Data access (`catalog.ts`), cart (`cart/`), pricing, analytics, delivery estimate |
| `src/lib/seed/data.ts` | Example products, the single source for `supabase/seed.sql` and demo mode |
| `supabase/migrations/` | Database schema, security rules, search function and storage buckets |
| `tests/unit/`, `tests/integration/` | Vitest tests (integration tests need the local database) |
