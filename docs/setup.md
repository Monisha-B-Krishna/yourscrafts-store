# Setup guide

Plain-language steps for running the store on your laptop and connecting it to a database.

## 1. Run the site (no accounts needed)

1. Open a terminal in the `yourscrafts-store` folder.
2. Install everything once: `npm install`
3. Start the site: `npm run dev`
4. Open **http://localhost:3000** in your browser.

If `.env.local` has no Supabase keys, the site runs in **demo mode**. It shows the example
products, plus a small peach note under the announcement bar saying so.

## 2. Use a real database on your laptop (optional, needs Docker Desktop)

This runs a private copy of Supabase on your computer. Nothing goes online.

1. Open Docker Desktop and wait until it says it's running.
2. `npm run db:start`. The first time, it downloads a few GB. When it finishes, it prints
   an `API URL` and keys.
3. Put those into `.env.local` (copy `.env.example` first):
   - `NEXT_PUBLIC_SUPABASE_URL` = the API URL (`http://127.0.0.1:54321`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon / publishable key
   - `SUPABASE_SERVICE_ROLE_KEY` = the service_role / secret key
4. Restart `npm run dev`. The demo-mode note disappears, and products now come from the database.
5. To browse the tables, open Supabase Studio at **http://127.0.0.1:54323**.
6. To wipe the database and reload the example data: `npm run db:reset`.

To stop the local database, run `npx supabase stop`.

## 3. Create the real (hosted) Supabase project, free tier

You'll need this before the site goes live on Vercel.

1. Sign up at https://supabase.com and click **New project**. Pick the **Mumbai (ap-south-1)**
   region, so it's close to your customers, and save the database password in a password manager.
2. In the project, go to **Project Settings → API** and copy the *Project URL*, the *anon* key
   and the *service_role* key into `.env.local`.
3. Link and push the schema from this folder:
   ```
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
4. Load the example products: open **SQL Editor** in the Supabase dashboard, paste the
   contents of `supabase/seed.sql` and click **Run**.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the site at http://localhost:3000 |
| `npm run build` | Production build (what Vercel runs) |
| `npm run lint` | Check code style |
| `npm test` | Run the automated tests |
| `npm run seed:generate` | Rebuild `supabase/seed.sql` from `src/lib/seed/data.ts` |
| `npm run placeholders:generate` | Redraw the placeholder product images |
| `npm run db:start` / `db:reset` | Start, or wipe and reseed, the local database |
