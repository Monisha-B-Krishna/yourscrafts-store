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
| `src/app/(shop)/` | Customer pages: home and shop |
| `src/components/shop/` | Header, footer, product cards, filters |
| `src/components/ui/` | shadcn/ui building blocks |
| `src/lib/` | Data access (`catalog.ts`), pricing, settings, Supabase clients |
| `src/lib/seed/data.ts` | Example products, the single source for `supabase/seed.sql` and demo mode |
| `supabase/migrations/` | Database schema, security rules and storage buckets |
| `tests/unit/` | Vitest tests |
